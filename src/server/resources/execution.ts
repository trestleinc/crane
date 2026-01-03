import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";
import type { Execution } from "$/shared/types";
import type { CraneComponentApi } from "../crane";
import { NotFoundError } from "../errors";
import type {
	AnyMutationCtx,
	AnyQueryCtx,
	ExecutionOptions,
} from "../resource";

const executionStatusValidator = v.union(
	v.literal("pending"),
	v.literal("running"),
	v.literal("completed"),
	v.literal("failed"),
	v.literal("cancelled"),
);

const tileResultValidator = v.object({
	tileId: v.string(),
	status: v.string(),
	result: v.optional(v.any()),
	error: v.optional(v.string()),
	duration: v.optional(v.number()),
});

const resultValidator = v.object({
	success: v.boolean(),
	duration: v.optional(v.number()),
	outputs: v.optional(v.any()),
	error: v.optional(v.string()),
	tileResults: v.optional(v.array(tileResultValidator)),
});

const artifactValidator = v.object({
	type: v.string(),
	tileId: v.optional(v.string()),
	storageId: v.string(),
	metadata: v.optional(v.any()),
});

const executionValidator = v.object({
	id: v.string(),
	blueprintId: v.string(),
	organizationId: v.string(),
	context: v.optional(v.any()),
	variables: v.record(v.string(), v.any()),
	status: executionStatusValidator,
	result: v.optional(resultValidator),
	artifacts: v.optional(v.array(artifactValidator)),
	workflowId: v.optional(v.string()),
	createdAt: v.number(),
	startedAt: v.optional(v.number()),
	completedAt: v.optional(v.number()),
});

export function createExecutionResource(
	component: CraneComponentApi,
	options?: ExecutionOptions<Execution>,
) {
	const hooks = options?.hooks;

	return {
		__resource: "execution" as const,

		get: queryGeneric({
			args: { id: v.string() },
			returns: v.union(executionValidator, v.null()),
			handler: async (ctx: AnyQueryCtx, { id }) => {
				try {
					const doc = await ctx.runQuery(component.public.executionGet, { id });
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
				blueprintId: v.optional(v.string()),
				status: v.optional(executionStatusValidator),
				limit: v.optional(v.number()),
			},
			returns: v.array(executionValidator),
			handler: async (ctx: AnyQueryCtx, args) => {
				try {
					if (hooks?.evalRead) {
						await hooks.evalRead(ctx, args.organizationId);
					}
					let docs = await ctx.runQuery(component.public.executionList, args);
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
				blueprintId: v.string(),
				organizationId: v.string(),
				variables: v.record(v.string(), v.any()),
				context: v.optional(v.any()),
				workflowId: v.optional(v.string()),
			},
			returns: v.object({ id: v.string() }),
			handler: async (ctx: AnyMutationCtx, args) => {
				try {
					if (hooks?.evalWrite) {
						const now = Date.now();
						const pendingDoc: Execution = {
							id: "",
							blueprintId: args.blueprintId,
							organizationId: args.organizationId,
							variables: args.variables,
							context: args.context,
							workflowId: args.workflowId,
							status: "pending",
							createdAt: now,
						};
						await hooks.evalWrite(ctx, pendingDoc);
					}

					const doc = await ctx.runMutation(
						component.public.executionCreate,
						args,
					);

					if (hooks?.onInsert) {
						await hooks.onInsert(ctx, doc as Execution);
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

		start: mutationGeneric({
			args: { id: v.string() },
			returns: v.object({ started: v.boolean() }),
			handler: async (ctx: AnyMutationCtx, { id }) => {
				try {
					const doc = await ctx.runMutation(component.public.executionStart, {
						id,
					});

					if (hooks?.onStart) {
						await hooks.onStart(ctx, doc as Execution);
					}

					return { started: true };
				} catch (error) {
					if (hooks?.onError) {
						await hooks.onError(ctx, error as Error, "start");
					}
					throw error;
				}
			},
		}),

		complete: mutationGeneric({
			args: {
				id: v.string(),
				result: resultValidator,
			},
			returns: v.object({ completed: v.boolean() }),
			handler: async (ctx: AnyMutationCtx, { id, result }) => {
				try {
					const doc = await ctx.runMutation(
						component.public.executionComplete,
						{ id, result },
					);

					if (hooks?.onComplete) {
						await hooks.onComplete(ctx, doc as Execution);
					}

					return { completed: true };
				} catch (error) {
					if (hooks?.onError) {
						await hooks.onError(ctx, error as Error, "complete");
					}
					throw error;
				}
			},
		}),

		cancel: mutationGeneric({
			args: {
				id: v.string(),
				reason: v.optional(v.string()),
			},
			returns: v.object({ cancelled: v.boolean() }),
			handler: async (ctx: AnyMutationCtx, { id, reason }) => {
				try {
					const result = {
						success: false,
						error: reason ?? "Cancelled by user",
					};

					const doc = await ctx.runMutation(
						component.public.executionComplete,
						{
							id,
							result,
						},
					);

					if (hooks?.onCancel) {
						await hooks.onCancel(ctx, {
							...doc,
							status: "cancelled" as const,
						} as Execution);
					}

					return { cancelled: true };
				} catch (error) {
					if (hooks?.onError) {
						await hooks.onError(ctx, error as Error, "cancel");
					}
					throw error;
				}
			},
		}),
	};
}
