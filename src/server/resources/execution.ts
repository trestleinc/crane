import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";
import {
	cancelledResponseValidator,
	completedResponseValidator,
	type Execution,
	executionDocValidator,
	executionResultValidator,
	executionStatusValidator,
	idResponseValidator,
	startedResponseValidator,
} from "$/shared/validators";
import type { CraneComponentApi } from "../crane";
import { NotFoundError } from "../errors";
import type {
	AnyMutationCtx,
	AnyQueryCtx,
	ExecutionOptions,
} from "../resource";

export function createExecutionResource(
	component: CraneComponentApi,
	options?: ExecutionOptions<Execution>,
) {
	const hooks = options?.hooks;

	return {
		__resource: "execution" as const,

		get: queryGeneric({
			args: { id: v.string() },
			returns: v.union(executionDocValidator, v.null()),
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
			returns: v.array(executionDocValidator),
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
				context: v.optional(v.record(v.string(), v.any())),
				workflowId: v.optional(v.string()),
			},
			returns: idResponseValidator,
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
			returns: startedResponseValidator,
			handler: async (ctx: AnyMutationCtx, { id }) => {
				try {
					const prev = await ctx.runQuery(component.public.executionGet, { id });
					if (!prev) {
						throw new NotFoundError("Execution", id);
					}

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
				result: executionResultValidator,
			},
			returns: completedResponseValidator,
			handler: async (ctx: AnyMutationCtx, { id, result }) => {
				try {
					const prev = await ctx.runQuery(component.public.executionGet, { id });
					if (!prev) {
						throw new NotFoundError("Execution", id);
					}

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
			returns: cancelledResponseValidator,
			handler: async (ctx: AnyMutationCtx, { id, reason }) => {
				try {
					const prev = await ctx.runQuery(component.public.executionGet, { id });
					if (!prev) {
						throw new NotFoundError("Execution", id);
					}

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
