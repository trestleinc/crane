import type {
	GenericDataModel,
	GenericMutationCtx,
	GenericQueryCtx,
} from "convex/server";

export type AnyQueryCtx = GenericQueryCtx<GenericDataModel>;
export type AnyMutationCtx = GenericMutationCtx<GenericDataModel>;

/**
 * Hooks for resource operations.
 * eval* hooks run BEFORE (throw to deny), on* hooks run AFTER (side effects)
 */
export type ResourceHooks<T extends object> = {
	/** Authorization check before reads - throw to deny */
	evalRead?: (ctx: AnyQueryCtx, organizationId: string) => void | Promise<void>;
	/** Authorization check before writes - throw to deny */
	evalWrite?: (ctx: AnyMutationCtx, doc: T) => void | Promise<void>;
	/** Authorization check before removes - throw to deny. Receives full document for context */
	evalRemove?: (ctx: AnyMutationCtx, doc: T) => void | Promise<void>;
	/** Modify updates before they're applied. Return the modified updates */
	beforeUpdate?: (
		ctx: AnyMutationCtx,
		updates: Partial<T>,
		prev: T,
	) => Partial<T> | Promise<Partial<T>>;
	/** Side effect after insert */
	onInsert?: (ctx: AnyMutationCtx, doc: T) => void | Promise<void>;
	/** Side effect after update */
	onUpdate?: (ctx: AnyMutationCtx, doc: T, prev: T) => void | Promise<void>;
	/** Side effect after remove */
	onRemove?: (ctx: AnyMutationCtx, doc: T) => void | Promise<void>;
	/** Centralized error logging hook - called when operations fail */
	onError?: (
		ctx: AnyQueryCtx | AnyMutationCtx,
		error: Error,
		operation: string,
	) => void | Promise<void>;
	/** Transform results before returning */
	transform?: (docs: T[]) => T[] | Promise<T[]>;
};

export type ResourceOptions<T extends object> = {
	hooks?: ResourceHooks<T>;
};

export type ExecutionHooks<T extends object> = ResourceHooks<T> & {
	onStart?: (ctx: AnyMutationCtx, execution: T) => void | Promise<void>;
	onComplete?: (ctx: AnyMutationCtx, execution: T) => void | Promise<void>;
	onCancel?: (ctx: AnyMutationCtx, execution: T) => void | Promise<void>;
};

export type ExecutionOptions<T extends object> = {
	hooks?: ExecutionHooks<T>;
};

export type VaultHooks<T extends object> = ResourceHooks<T> & {
	onSetup?: (ctx: AnyMutationCtx, vault: T) => void | Promise<void>;
	onUnlock?: (ctx: AnyQueryCtx, vault: T) => void | Promise<void>;
	onEnable?: (ctx: AnyMutationCtx, vault: T) => void | Promise<void>;
};

export type VaultOptions<T extends object> = {
	hooks?: VaultHooks<T>;
};

export type CredentialHooks<T extends object> = ResourceHooks<T> & {
	onResolve?: (ctx: AnyQueryCtx, credential: T) => void | Promise<void>;
};

export type CredentialOptions<T extends object> = {
	hooks?: CredentialHooks<T>;
};
