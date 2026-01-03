import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";
import type { Blueprint } from "$/shared/types";
import type { CraneComponentApi } from "../crane";
import { NotFoundError } from "../errors";
import type { AnyMutationCtx, AnyQueryCtx, ResourceOptions } from "../resource";

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

const blueprintValidator = v.object({
	id: v.string(),
	organizationId: v.string(),
	name: v.string(),
	description: v.optional(v.string()),
	tiles: v.array(tileValidator),
	metadata: metadataValidator,
	createdAt: v.number(),
	updatedAt: v.number(),
});

export function createBlueprintResource(
	component: CraneComponentApi,
	options?: ResourceOptions<Blueprint>,
) {
	const hooks = options?.hooks;

	return {
		__resource: "blueprint" as const,

		get: queryGeneric({
			args: { id: v.string() },
			returns: v.union(blueprintValidator, v.null()),
			handler: async (ctx: AnyQueryCtx, { id }) => {
				try {
					const doc = await ctx.runQuery(component.public.blueprintGet, { id });
					if (doc && hooks?.evalRead) {
						await hooks.evalRead(ctx, doc.organizationId);
					}
					return doc;
				} catch (error) {
					if (hooks?.onError) {
						await hooks.onError(ctx, error as Error, "get");
					}
					throw error;
				}
			},
		}),

		list: queryGeneric({
			args: {
				organizationId: v.string(),
				limit: v.optional(v.number()),
			},
			returns: v.array(blueprintValidator),
			handler: async (ctx: AnyQueryCtx, args) => {
				try {
					if (hooks?.evalRead) {
						await hooks.evalRead(ctx, args.organizationId);
					}
					let docs = await ctx.runQuery(component.public.blueprintList, args);
					if (hooks?.transform) {
						docs = await hooks.transform(docs);
					}
					return docs;
				} catch (error) {
					if (hooks?.onError) {
						await hooks.onError(ctx, error as Error, "list");
					}
					throw error;
				}
			},
		}),

		create: mutationGeneric({
			args: {
				organizationId: v.string(),
				name: v.string(),
				description: v.optional(v.string()),
				tiles: v.array(tileValidator),
				metadata: v.optional(metadataValidator),
			},
			returns: v.object({ id: v.string() }),
			handler: async (ctx: AnyMutationCtx, args) => {
				try {
					if (hooks?.evalWrite) {
						const now = Date.now();
						const pendingDoc: Blueprint = {
							id: "",
							organizationId: args.organizationId,
							name: args.name,
							description: args.description,
							tiles: args.tiles,
							metadata: args.metadata ?? { tags: [], inputSchema: [] },
							createdAt: now,
							updatedAt: now,
						};
						await hooks.evalWrite(ctx, pendingDoc);
					}

					const doc = await ctx.runMutation(
						component.public.blueprintCreate,
						args,
					);

					if (hooks?.onInsert) {
						await hooks.onInsert(ctx, doc);
					}

					return { id: doc.id };
				} catch (error) {
					if (hooks?.onError) {
						await hooks.onError(ctx, error as Error, "create");
					}
					throw error;
				}
			},
		}),

		update: mutationGeneric({
			args: {
				id: v.string(),
				name: v.optional(v.string()),
				description: v.optional(v.string()),
				tiles: v.optional(v.array(tileValidator)),
				metadata: v.optional(metadataValidator),
			},
			returns: v.object({ id: v.string() }),
			handler: async (ctx: AnyMutationCtx, { id, ...updates }) => {
				try {
					const prev = await ctx.runQuery(component.public.blueprintGet, {
						id,
					});
					if (!prev) throw new NotFoundError("Blueprint", id);

					let finalUpdates = updates;
					if (hooks?.beforeUpdate) {
						finalUpdates = (await hooks.beforeUpdate(
							ctx,
							updates as Partial<Blueprint>,
							prev,
						)) as typeof updates;
					}

					if (hooks?.evalWrite) {
						await hooks.evalWrite(ctx, {
							...prev,
							...finalUpdates,
						} as Blueprint);
					}

					const doc = await ctx.runMutation(component.public.blueprintUpdate, {
						id,
						...finalUpdates,
					});

					if (hooks?.onUpdate) {
						await hooks.onUpdate(ctx, doc, prev);
					}

					return { id };
				} catch (error) {
					if (hooks?.onError) {
						await hooks.onError(ctx, error as Error, "update");
					}
					throw error;
				}
			},
		}),

		remove: mutationGeneric({
			args: { id: v.string() },
			returns: v.object({ removed: v.boolean() }),
			handler: async (ctx: AnyMutationCtx, { id }) => {
				try {
					const doc = await ctx.runQuery(component.public.blueprintGet, { id });
					if (!doc) throw new NotFoundError("Blueprint", id);

					if (hooks?.evalRemove) {
						await hooks.evalRemove(ctx, doc);
					}

					await ctx.runMutation(component.public.blueprintRemove, { id });

					if (hooks?.onRemove) {
						await hooks.onRemove(ctx, doc);
					}

					return { removed: true };
				} catch (error) {
					if (hooks?.onError) {
						await hooks.onError(ctx, error as Error, "remove");
					}
					throw error;
				}
			},
		}),
	};
}
