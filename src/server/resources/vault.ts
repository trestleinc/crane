import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";
import { type Vault, vaultDocValidator } from "$/shared/validators";
import type { CraneComponentApi } from "../crane";
import { NotFoundError } from "../errors";
import type { AnyMutationCtx, AnyQueryCtx, VaultOptions } from "../resource";

export function createVaultResource(
	component: CraneComponentApi,
	options?: VaultOptions<Vault>,
) {
	const hooks = options?.hooks;

	return {
		__resource: "vault" as const,

		get: queryGeneric({
			args: { organizationId: v.string() },
			returns: v.union(vaultDocValidator, v.null()),
			handler: async (ctx: AnyQueryCtx, { organizationId }) => {
				try {
					if (hooks?.evalRead) {
						await hooks.evalRead(ctx, organizationId);
					}
					return await ctx.runQuery(component.public.vaultGet, {
						organizationId,
					});
				} catch (error) {
					if (hooks?.onError) {
						await hooks.onError(ctx, error as Error, "get");
					}
					throw error;
				}
			},
		}),

		setup: mutationGeneric({
			args: {
				organizationId: v.string(),
				salt: v.string(),
				iterations: v.number(),
				encryptedVaultKey: v.string(),
				vaultKeyIv: v.string(),
				verificationHash: v.string(),
			},
			returns: v.null(),
			handler: async (ctx: AnyMutationCtx, args) => {
				try {
					if (hooks?.evalWrite) {
						const now = Date.now();
						const pendingDoc: Vault = {
							organizationId: args.organizationId,
							salt: args.salt,
							iterations: args.iterations,
							encryptedVaultKey: args.encryptedVaultKey,
							vaultKeyIv: args.vaultKeyIv,
							verificationHash: args.verificationHash,
							automationEnabled: false,
							createdAt: now,
							updatedAt: now,
						};
						await hooks.evalWrite(ctx, pendingDoc);
					}

					const doc = await ctx.runMutation(component.public.vaultSetup, args);

					if (hooks?.onSetup) {
						await hooks.onSetup(ctx, doc);
					}

					return null;
				} catch (error) {
					if (hooks?.onError) {
						await hooks.onError(ctx, error as Error, "setup");
					}
					throw error;
				}
			},
		}),

		unlock: queryGeneric({
			args: { organizationId: v.string() },
			returns: v.union(vaultDocValidator, v.null()),
			handler: async (ctx: AnyQueryCtx, { organizationId }) => {
				try {
					if (hooks?.evalRead) {
						await hooks.evalRead(ctx, organizationId);
					}

					const vault = await ctx.runQuery(component.public.vaultUnlock, {
						organizationId,
					});

					if (vault && hooks?.onUnlock) {
						await hooks.onUnlock(ctx, vault);
					}

					return vault;
				} catch (error) {
					if (hooks?.onError) {
						await hooks.onError(ctx, error as Error, "unlock");
					}
					throw error;
				}
			},
		}),

		enable: mutationGeneric({
			args: {
				organizationId: v.string(),
				encryptedMachineKey: v.string(),
				machineKeyIv: v.string(),
				workosM2MClientId: v.optional(v.string()),
			},
			returns: v.null(),
			handler: async (ctx: AnyMutationCtx, args) => {
				try {
					const prev = await ctx.runQuery(component.public.vaultGet, {
						organizationId: args.organizationId,
					});
					if (!prev) throw new NotFoundError("Vault", args.organizationId);

					if (hooks?.evalWrite) {
						await hooks.evalWrite(ctx, { ...prev, ...args } as Vault);
					}

					const doc = await ctx.runMutation(component.public.vaultEnable, args);

					if (hooks?.onEnable) {
						await hooks.onEnable(ctx, doc);
					}

					return null;
				} catch (error) {
					if (hooks?.onError) {
						await hooks.onError(ctx, error as Error, "enable");
					}
					throw error;
				}
			},
		}),

		context: mutationGeneric({
			args: {
				organizationId: v.string(),
				browserbaseContextId: v.string(),
			},
			returns: v.null(),
			handler: async (ctx: AnyMutationCtx, args) => {
				try {
					const prev = await ctx.runQuery(component.public.vaultGet, {
						organizationId: args.organizationId,
					});
					if (!prev) throw new NotFoundError("Vault", args.organizationId);

					if (hooks?.evalWrite) {
						await hooks.evalWrite(ctx, { ...prev, ...args } as Vault);
					}

					await ctx.runMutation(component.public.vaultContext, args);

					return null;
				} catch (error) {
					if (hooks?.onError) {
						await hooks.onError(ctx, error as Error, "context");
					}
					throw error;
				}
			},
		}),
	};
}
