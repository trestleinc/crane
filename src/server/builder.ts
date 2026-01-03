import type { GenericActionCtx, GenericDataModel } from "convex/server";
import type {
	CredentialConfig,
	ExecuteOptions,
	ExecutionResult,
} from "$/server/types";
import type { CraneComponentApi } from "./crane";

type AnyActionCtx = GenericActionCtx<GenericDataModel>;

type HttpExecutionConfig = {
	mode: "http";
	endpoint: string;
};

type RunnerExecutionConfig = {
	mode: "runner";
	run: (
		ctx: AnyActionCtx,
		blueprint: unknown,
		variables: Record<string, unknown>,
	) => Promise<ExecutionResult>;
};

type LegacyExecutionConfig = {
	endpoint: string;
};

export type CraneConfig = {
	credentials?: CredentialConfig;
	execution?:
		| HttpExecutionConfig
		| RunnerExecutionConfig
		| LegacyExecutionConfig;
	hooks?: {
		read?: (ctx: AnyActionCtx, organizationId: string) => void | Promise<void>;
		write?: (ctx: AnyActionCtx, organizationId: string) => void | Promise<void>;
		blueprint?: {
			insert?: (ctx: AnyActionCtx, blueprint: unknown) => void | Promise<void>;
		};
		execution?: {
			start?: (ctx: AnyActionCtx, execution: unknown) => void | Promise<void>;
			complete?: (
				ctx: AnyActionCtx,
				execution: unknown,
			) => void | Promise<void>;
		};
	};
};

function isRunnerMode(
	config:
		| HttpExecutionConfig
		| RunnerExecutionConfig
		| LegacyExecutionConfig
		| undefined,
): config is RunnerExecutionConfig {
	return config !== undefined && "mode" in config && config.mode === "runner";
}

function isHttpMode(
	config:
		| HttpExecutionConfig
		| RunnerExecutionConfig
		| LegacyExecutionConfig
		| undefined,
): config is HttpExecutionConfig | LegacyExecutionConfig {
	if (!config) return false;
	if ("mode" in config && config.mode === "http") return true;
	if ("endpoint" in config && !("mode" in config)) return true;
	return false;
}

function getEndpoint(
	config: HttpExecutionConfig | LegacyExecutionConfig,
): string {
	return "endpoint" in config ? config.endpoint : "";
}

export function crane(component: CraneComponentApi) {
	return function boundCrane(config?: CraneConfig) {
		const hooks = config?.hooks;

		return {
			api: {
				blueprint: {
					get: component.public.blueprintGet,
					list: component.public.blueprintList,
					create: component.public.blueprintCreate,
					update: component.public.blueprintUpdate,
					remove: component.public.blueprintRemove,
				},
				execution: {
					get: component.public.executionGet,
					list: component.public.executionList,
					create: component.public.executionCreate,
					start: component.public.executionStart,
					complete: component.public.executionComplete,
				},
			},

			hooks: () => hooks,

			execute: async (
				ctx: AnyActionCtx,
				options: ExecuteOptions,
			): Promise<ExecutionResult> => {
				const startTime = Date.now();

				const blueprint = await ctx.runQuery(component.public.blueprintGet, {
					id: options.blueprintId,
				});

				if (!blueprint) {
					return {
						success: false,
						error: `Blueprint not found: ${options.blueprintId}`,
						duration: Date.now() - startTime,
					};
				}

				const { id: executionId } = await ctx.runMutation(
					component.public.executionCreate,
					{
						blueprintId: options.blueprintId,
						organizationId: blueprint.organizationId,
						variables: options.variables,
						context: options.context,
					},
				);

				await ctx.runMutation(component.public.executionStart, {
					id: executionId,
				});

				let result: ExecutionResult;

				try {
					if (isRunnerMode(config?.execution)) {
						result = await config.execution.run(
							ctx,
							blueprint,
							options.variables,
						);
					} else if (isHttpMode(config?.execution)) {
						const endpoint = getEndpoint(config.execution);
						const response = await fetch(endpoint, {
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({
								blueprint,
								variables: options.variables,
								executionId,
							}),
						});

						if (!response.ok) {
							result = {
								success: false,
								error: `Execution failed: ${response.status} ${response.statusText}`,
								duration: Date.now() - startTime,
							};
						} else {
							result = await response.json();
						}
					} else {
						result = {
							success: false,
							error:
								'No execution config. Set execution.mode to "runner" or "http".',
							duration: Date.now() - startTime,
						};
					}
				} catch (error) {
					result = {
						success: false,
						error: `Execution failed: ${error instanceof Error ? error.message : "Unknown error"}`,
						duration: Date.now() - startTime,
					};
				}

				await ctx.runMutation(component.public.executionComplete, {
					id: executionId,
					result,
				});

				return result;
			},
		};
	};
}
