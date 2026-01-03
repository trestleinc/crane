import { v } from "convex/values";
import { mutation, query } from "$/component/_generated/server";
import { getLogger } from "$/component/logger";

const tileTypeValidator = v.union(
	v.literal("NAVIGATE"),
	v.literal("CLICK"),
	v.literal("TYPE"),
	v.literal("EXTRACT"),
	v.literal("SCREENSHOT"),
	v.literal("WAIT"),
	v.literal("SELECT"),
	v.literal("FORM"),
	v.literal("AUTH"),
);

const tileValidator = v.object({
	id: v.string(),
	type: tileTypeValidator,
	label: v.string(),
	description: v.optional(v.string()),
	position: v.object({ x: v.number(), y: v.number() }),
	parameters: v.any(),
	connections: v.object({
		input: v.union(v.string(), v.null()),
		output: v.union(v.string(), v.null()),
	}),
});

const metadataValidator = v.object({
	tags: v.optional(v.array(v.string())),
	inputSchema: v.optional(
		v.array(
			v.object({
				name: v.string(),
				type: v.string(),
				required: v.boolean(),
				description: v.optional(v.string()),
			}),
		),
	),
});

const resultValidator = v.object({
	success: v.boolean(),
	duration: v.optional(v.number()),
	outputs: v.optional(v.any()),
	error: v.optional(v.string()),
	tileResults: v.optional(
		v.array(
			v.object({
				tileId: v.string(),
				status: v.string(),
				result: v.optional(v.any()),
				error: v.optional(v.string()),
				duration: v.optional(v.number()),
			}),
		),
	),
});

const executionStatusValidator = v.union(
	v.literal("pending"),
	v.literal("running"),
	v.literal("completed"),
	v.literal("failed"),
	v.literal("cancelled"),
);

// ============================================================================
// BLUEPRINT - Flat exports
// ============================================================================

export const blueprintGet = query({
	args: { id: v.string() },
	returns: v.any(),
	handler: async (ctx, { id }) => {
		return ctx.db
			.query("blueprints")
			.withIndex("by_uuid", (q) => q.eq("id", id))
			.unique();
	},
});

export const blueprintList = query({
	args: {
		organizationId: v.string(),
		limit: v.optional(v.number()),
	},
	returns: v.any(),
	handler: async (ctx, { organizationId, limit = 50 }) => {
		return ctx.db
			.query("blueprints")
			.withIndex("by_organization", (q) =>
				q.eq("organizationId", organizationId),
			)
			.order("desc")
			.take(limit);
	},
});

export const blueprintCreate = mutation({
	args: {
		organizationId: v.string(),
		name: v.string(),
		description: v.optional(v.string()),
		tiles: v.array(tileValidator),
		metadata: v.optional(metadataValidator),
	},
	returns: v.any(),
	handler: async (ctx, args) => {
		const logger = getLogger(["blueprint"]);
		const id = crypto.randomUUID();
		const now = Date.now();

		const doc = {
			id,
			organizationId: args.organizationId,
			name: args.name,
			description: args.description,
			tiles: args.tiles,
			metadata: args.metadata ?? { tags: [], inputSchema: [] },
			createdAt: now,
			updatedAt: now,
		};

		await ctx.db.insert("blueprints", doc);

		logger.info("Blueprint created", { id, name: args.name });
		return doc;
	},
});

export const blueprintUpdate = mutation({
	args: {
		id: v.string(),
		name: v.optional(v.string()),
		description: v.optional(v.string()),
		tiles: v.optional(v.array(tileValidator)),
		metadata: v.optional(metadataValidator),
	},
	returns: v.any(),
	handler: async (ctx, { id, ...updates }) => {
		const logger = getLogger(["blueprint"]);
		const existing = await ctx.db
			.query("blueprints")
			.withIndex("by_uuid", (q) => q.eq("id", id))
			.unique();
		if (!existing) throw new Error(`Blueprint not found: ${id}`);

		const clean: Record<string, unknown> = {};
		for (const [k, val] of Object.entries(updates)) {
			if (val !== undefined) clean[k] = val;
		}

		const now = Date.now();
		await ctx.db.patch(existing._id, { ...clean, updatedAt: now });

		const updated = await ctx.db.get(existing._id);
		logger.info("Blueprint updated", { id });
		return updated;
	},
});

export const blueprintRemove = mutation({
	args: { id: v.string() },
	returns: v.any(),
	handler: async (ctx, { id }) => {
		const logger = getLogger(["blueprint"]);
		const bp = await ctx.db
			.query("blueprints")
			.withIndex("by_uuid", (q) => q.eq("id", id))
			.unique();
		if (bp) {
			await ctx.db.delete(bp._id);
			logger.info("Blueprint removed", { id });
		}
		return { removed: true };
	},
});

// ============================================================================
// EXECUTION - Flat exports
// ============================================================================

export const executionGet = query({
	args: { id: v.string() },
	returns: v.any(),
	handler: async (ctx, { id }) => {
		return ctx.db
			.query("executions")
			.withIndex("by_uuid", (q) => q.eq("id", id))
			.unique();
	},
});

export const executionList = query({
	args: {
		organizationId: v.string(),
		blueprintId: v.optional(v.string()),
		status: v.optional(executionStatusValidator),
		limit: v.optional(v.number()),
	},
	returns: v.any(),
	handler: async (ctx, { organizationId, blueprintId, status, limit = 50 }) => {
		const results = blueprintId
			? await ctx.db
					.query("executions")
					.withIndex("by_blueprint", (q) => q.eq("blueprintId", blueprintId))
					.order("desc")
					.take(limit)
			: await ctx.db
					.query("executions")
					.withIndex("by_organization", (q) =>
						q.eq("organizationId", organizationId),
					)
					.order("desc")
					.take(limit);
		return status ? results.filter((e) => e.status === status) : results;
	},
});

export const executionCreate = mutation({
	args: {
		blueprintId: v.string(),
		organizationId: v.string(),
		variables: v.any(),
		context: v.optional(v.any()),
	},
	returns: v.any(),
	handler: async (ctx, args) => {
		const logger = getLogger(["execution"]);

		const bp = await ctx.db
			.query("blueprints")
			.withIndex("by_uuid", (q) => q.eq("id", args.blueprintId))
			.unique();
		if (!bp) throw new Error(`Blueprint not found: ${args.blueprintId}`);

		const id = crypto.randomUUID();
		const now = Date.now();

		const doc = {
			id,
			blueprintId: args.blueprintId,
			organizationId: args.organizationId,
			variables: args.variables,
			context: args.context,
			status: "pending" as const,
			createdAt: now,
		};

		await ctx.db.insert("executions", doc);

		logger.info("Execution created", { id, blueprintId: args.blueprintId });
		return doc;
	},
});

export const executionStart = mutation({
	args: { id: v.string() },
	returns: v.any(),
	handler: async (ctx, { id }) => {
		const logger = getLogger(["execution"]);
		const e = await ctx.db
			.query("executions")
			.withIndex("by_uuid", (q) => q.eq("id", id))
			.unique();
		if (!e) throw new Error(`Execution not found: ${id}`);
		if (e.status !== "pending") throw new Error(`Execution not pending: ${id}`);
		await ctx.db.patch(e._id, { status: "running", startedAt: Date.now() });

		const updated = await ctx.db.get(e._id);
		logger.info("Execution started", { id });
		return updated;
	},
});

export const executionComplete = mutation({
	args: {
		id: v.string(),
		result: resultValidator,
	},
	returns: v.any(),
	handler: async (ctx, { id, result }) => {
		const logger = getLogger(["execution"]);
		const e = await ctx.db
			.query("executions")
			.withIndex("by_uuid", (q) => q.eq("id", id))
			.unique();
		if (!e) throw new Error(`Execution not found: ${id}`);

		await ctx.db.patch(e._id, {
			status: result.success ? "completed" : "failed",
			result,
			completedAt: Date.now(),
		});

		const updated = await ctx.db.get(e._id);
		logger.info("Execution completed", { id, success: result.success });
		return updated;
	},
});

export const vaultGet = query({
	args: { organizationId: v.string() },
	returns: v.any(),
	handler: async (ctx, { organizationId }) => {
		return ctx.db
			.query("vaults")
			.withIndex("by_organization", (q) =>
				q.eq("organizationId", organizationId),
			)
			.unique();
	},
});

export const vaultSetup = mutation({
	args: {
		organizationId: v.string(),
		salt: v.string(),
		iterations: v.number(),
		encryptedVaultKey: v.string(),
		vaultKeyIv: v.string(),
		verificationHash: v.string(),
	},
	returns: v.any(),
	handler: async (ctx, args) => {
		const logger = getLogger(["vault"]);
		const existing = await ctx.db
			.query("vaults")
			.withIndex("by_organization", (q) =>
				q.eq("organizationId", args.organizationId),
			)
			.unique();

		if (existing)
			throw new Error(`Vault already exists: ${args.organizationId}`);

		const now = Date.now();
		const doc = {
			...args,
			automationEnabled: false,
			createdAt: now,
			updatedAt: now,
		};

		await ctx.db.insert("vaults", doc);

		logger.info("Vault setup", { organizationId: args.organizationId });
		return doc;
	},
});

export const vaultUnlock = query({
	args: { organizationId: v.string() },
	returns: v.any(),
	handler: async (ctx, { organizationId }) => {
		return ctx.db
			.query("vaults")
			.withIndex("by_organization", (q) =>
				q.eq("organizationId", organizationId),
			)
			.unique();
	},
});

export const vaultEnable = mutation({
	args: {
		organizationId: v.string(),
		encryptedMachineKey: v.string(),
		machineKeyIv: v.string(),
		workosM2MClientId: v.optional(v.string()),
	},
	returns: v.any(),
	handler: async (ctx, { organizationId, ...updates }) => {
		const logger = getLogger(["vault"]);
		const vault = await ctx.db
			.query("vaults")
			.withIndex("by_organization", (q) =>
				q.eq("organizationId", organizationId),
			)
			.unique();

		if (!vault) throw new Error(`Vault not found: ${organizationId}`);

		await ctx.db.patch(vault._id, {
			...updates,
			automationEnabled: true,
			updatedAt: Date.now(),
		});

		const updated = await ctx.db.get(vault._id);
		logger.info("Vault enabled", { organizationId });
		return updated;
	},
});

export const vaultContext = mutation({
	args: {
		organizationId: v.string(),
		browserbaseContextId: v.string(),
	},
	returns: v.null(),
	handler: async (ctx, { organizationId, browserbaseContextId }) => {
		const logger = getLogger(["vault"]);
		const vault = await ctx.db
			.query("vaults")
			.withIndex("by_organization", (q) =>
				q.eq("organizationId", organizationId),
			)
			.unique();

		if (!vault) throw new Error(`Vault not found: ${organizationId}`);

		await ctx.db.patch(vault._id, {
			browserbaseContextId,
			updatedAt: Date.now(),
		});

		logger.info("Vault context updated", { organizationId });
		return null;
	},
});

export const credentialGet = query({
	args: { id: v.string() },
	returns: v.any(),
	handler: async (ctx, { id }) => {
		return ctx.db
			.query("credentials")
			.withIndex("by_uuid", (q) => q.eq("id", id))
			.unique();
	},
});

export const credentialList = query({
	args: {
		organizationId: v.string(),
		limit: v.optional(v.number()),
	},
	returns: v.any(),
	handler: async (ctx, { organizationId, limit = 50 }) => {
		return ctx.db
			.query("credentials")
			.withIndex("by_organization", (q) =>
				q.eq("organizationId", organizationId),
			)
			.order("desc")
			.take(limit);
	},
});

export const credentialCreate = mutation({
	args: {
		organizationId: v.string(),
		name: v.string(),
		domain: v.string(),
		encryptedPayload: v.string(),
		payloadIv: v.string(),
	},
	returns: v.any(),
	handler: async (ctx, args) => {
		const logger = getLogger(["credential"]);
		const id = crypto.randomUUID();
		const now = Date.now();

		const doc = {
			id,
			...args,
			createdAt: now,
			updatedAt: now,
		};

		await ctx.db.insert("credentials", doc);

		logger.info("Credential created", { id, domain: args.domain });
		return doc;
	},
});

export const credentialUpdate = mutation({
	args: {
		id: v.string(),
		name: v.optional(v.string()),
		domain: v.optional(v.string()),
		encryptedPayload: v.optional(v.string()),
		payloadIv: v.optional(v.string()),
	},
	returns: v.any(),
	handler: async (ctx, { id, ...updates }) => {
		const logger = getLogger(["credential"]);
		const existing = await ctx.db
			.query("credentials")
			.withIndex("by_uuid", (q) => q.eq("id", id))
			.unique();

		if (!existing) throw new Error(`Credential not found: ${id}`);

		const clean: Record<string, unknown> = {};
		for (const [k, val] of Object.entries(updates)) {
			if (val !== undefined) clean[k] = val;
		}

		await ctx.db.patch(existing._id, { ...clean, updatedAt: Date.now() });

		const updated = await ctx.db.get(existing._id);
		logger.info("Credential updated", { id });
		return updated;
	},
});

export const credentialRemove = mutation({
	args: { id: v.string() },
	returns: v.any(),
	handler: async (ctx, { id }) => {
		const logger = getLogger(["credential"]);
		const cred = await ctx.db
			.query("credentials")
			.withIndex("by_uuid", (q) => q.eq("id", id))
			.unique();

		if (cred) {
			await ctx.db.delete(cred._id);
			logger.info("Credential removed", { id });
		}
		return { removed: true };
	},
});

export const credentialResolve = query({
	args: {
		organizationId: v.string(),
		domain: v.string(),
	},
	returns: v.any(),
	handler: async (ctx, { organizationId, domain }) => {
		return ctx.db
			.query("credentials")
			.withIndex("by_domain", (q) =>
				q.eq("organizationId", organizationId).eq("domain", domain),
			)
			.unique();
	},
});
