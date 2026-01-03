import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";
import {
	type Credential,
	credentialDocValidator,
	idResponseValidator,
	removedResponseValidator,
} from "$/shared/validators";
import type { CraneComponentApi } from "../crane";
import { NotFoundError } from "../errors";
import type {
	AnyMutationCtx,
	AnyQueryCtx,
	CredentialOptions,
} from "../resource";

export function createCredentialResource(
	component: CraneComponentApi,
	options?: CredentialOptions<Credential>,
) {
	const hooks = options?.hooks;

	return {
		__resource: "credential" as const,

		get: queryGeneric({
			args: { id: v.string() },
			returns: v.union(credentialDocValidator, v.null()),
			handler: async (ctx: AnyQueryCtx, { id }) => {
				try {
					const doc = await ctx.runQuery(component.public.credentialGet, {
						id,
					});
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
			returns: v.array(credentialDocValidator),
			handler: async (ctx: AnyQueryCtx, args) => {
				try {
					if (hooks?.evalRead) {
						await hooks.evalRead(ctx, args.organizationId);
					}
					let docs = await ctx.runQuery(component.public.credentialList, args);
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
				domain: v.string(),
				encryptedPayload: v.string(),
				payloadIv: v.string(),
			},
			returns: idResponseValidator,
			handler: async (ctx: AnyMutationCtx, args) => {
				try {
					if (hooks?.evalWrite) {
						const now = Date.now();
						const pendingDoc: Credential = {
							id: "",
							organizationId: args.organizationId,
							name: args.name,
							domain: args.domain,
							encryptedPayload: args.encryptedPayload,
							payloadIv: args.payloadIv,
							createdAt: now,
							updatedAt: now,
						};
						await hooks.evalWrite(ctx, pendingDoc);
					}

					const doc = await ctx.runMutation(
						component.public.credentialCreate,
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
				domain: v.optional(v.string()),
				encryptedPayload: v.optional(v.string()),
				payloadIv: v.optional(v.string()),
			},
			returns: idResponseValidator,
			handler: async (ctx: AnyMutationCtx, { id, ...updates }) => {
				try {
					const prev = await ctx.runQuery(component.public.credentialGet, {
						id,
					});
					if (!prev) throw new NotFoundError("Credential", id);

					let finalUpdates = updates;
					if (hooks?.beforeUpdate) {
						finalUpdates = (await hooks.beforeUpdate(
							ctx,
							updates as Partial<Credential>,
							prev,
						)) as typeof updates;
					}

					if (hooks?.evalWrite) {
						await hooks.evalWrite(ctx, {
							...prev,
							...finalUpdates,
						} as Credential);
					}

					const doc = await ctx.runMutation(component.public.credentialUpdate, {
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
			returns: removedResponseValidator,
			handler: async (ctx: AnyMutationCtx, { id }) => {
				try {
					const doc = await ctx.runQuery(component.public.credentialGet, {
						id,
					});
					if (!doc) throw new NotFoundError("Credential", id);

					if (hooks?.evalRemove) {
						await hooks.evalRemove(ctx, doc);
					}

					await ctx.runMutation(component.public.credentialRemove, { id });

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

		resolve: queryGeneric({
			args: {
				organizationId: v.string(),
				domain: v.string(),
			},
			returns: v.union(credentialDocValidator, v.null()),
			handler: async (ctx: AnyQueryCtx, args) => {
				try {
					if (hooks?.evalRead) {
						await hooks.evalRead(ctx, args.organizationId);
					}

					const doc = await ctx.runQuery(
						component.public.credentialResolve,
						args,
					);

					if (doc && hooks?.onResolve) {
						await hooks.onResolve(ctx, doc);
					}

					return doc;
				} catch (error) {
					if (hooks?.onError) {
						await hooks.onError(ctx, error as Error, "resolve");
					}
					throw error;
				}
			},
		}),
	};
}
