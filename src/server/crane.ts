import type {
	FunctionReference,
	GenericActionCtx,
	GenericDataModel,
} from "convex/server";
import type { Blueprint, Credential, Execution, Vault } from "$/shared/types";
import type {
	CredentialOptions,
	ExecutionOptions,
	ResourceOptions,
	VaultOptions,
} from "./resource";
import { createBlueprintResource } from "./resources/blueprint";
import { createCredentialResource } from "./resources/credential";
import { createExecutionResource } from "./resources/execution";
import { createVaultResource } from "./resources/vault";
import type {
	CredentialConfig,
	ExecuteOptions,
	ExecutionResult,
} from "./types";
import {
	createWorkflowExecutor,
	type WorkflowExecutorConfig,
} from "./workflow";

type AnyActionCtx = GenericActionCtx<GenericDataModel>;

// ============================================================================
// Component API Type
// ============================================================================

/**
 * The shape of a Crane component's public API.
 * This matches the generated ComponentApi type from src/component/_generated/component.ts
 *
 * Using this type provides better type safety than `any` while still allowing
 * flexibility for the generated component structure.
 */
export type CraneComponentApi = {
	public: {
		blueprintCreate: FunctionReference<"mutation", "internal">;
		blueprintGet: FunctionReference<"query", "internal">;
		blueprintList: FunctionReference<"query", "internal">;
		blueprintRemove: FunctionReference<"mutation", "internal">;
		blueprintUpdate: FunctionReference<"mutation", "internal">;
		executionComplete: FunctionReference<"mutation", "internal">;
		executionCreate: FunctionReference<"mutation", "internal">;
		executionGet: FunctionReference<"query", "internal">;
		executionList: FunctionReference<"query", "internal">;
		executionStart: FunctionReference<"mutation", "internal">;
		vaultGet: FunctionReference<"query", "internal">;
		vaultSetup: FunctionReference<"mutation", "internal">;
		vaultUnlock: FunctionReference<"query", "internal">;
		vaultEnable: FunctionReference<"mutation", "internal">;
		vaultContext: FunctionReference<"mutation", "internal">;
		credentialGet: FunctionReference<"query", "internal">;
		credentialList: FunctionReference<"query", "internal">;
		credentialCreate: FunctionReference<"mutation", "internal">;
		credentialUpdate: FunctionReference<"mutation", "internal">;
		credentialRemove: FunctionReference<"mutation", "internal">;
		credentialResolve: FunctionReference<"query", "internal">;
	};
	workflow?: unknown;
};

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

type WorkflowFunctionReference = FunctionReference<
	"mutation",
	"internal",
	Record<string, unknown>,
	unknown
>;

type WorkflowExecutionConfig = {
	mode: "workflow";
	workflowFn: WorkflowFunctionReference;
	onComplete?: WorkflowFunctionReference;
	retryConfig?: WorkflowExecutorConfig["retryConfig"];
	maxParallelism?: number;
};

type LegacyExecutionConfig = {
	endpoint: string;
};

export type CraneOptions = {
	blueprints?: ResourceOptions<Blueprint>;
	executions?: ExecutionOptions<Execution>;
	credentials?: CredentialOptions<Credential>;
	vault?: VaultOptions<Vault>;
	execution?:
		| HttpExecutionConfig
		| RunnerExecutionConfig
		| WorkflowExecutionConfig
		| LegacyExecutionConfig;
	credentialConfig?: CredentialConfig;
};

function isRunnerMode(
	config:
		| HttpExecutionConfig
		| RunnerExecutionConfig
		| WorkflowExecutionConfig
		| LegacyExecutionConfig
		| undefined,
): config is RunnerExecutionConfig {
	return config !== undefined && "mode" in config && config.mode === "runner";
}

function isWorkflowMode(
	config:
		| HttpExecutionConfig
		| RunnerExecutionConfig
		| WorkflowExecutionConfig
		| LegacyExecutionConfig
		| undefined,
): config is WorkflowExecutionConfig {
	return config !== undefined && "mode" in config && config.mode === "workflow";
}

function isHttpMode(
	config:
		| HttpExecutionConfig
		| RunnerExecutionConfig
		| WorkflowExecutionConfig
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
	return function boundCrane(options?: CraneOptions) {
		const blueprints = createBlueprintResource(component, options?.blueprints);
		const executions = createExecutionResource(component, options?.executions);
		const credentials = createCredentialResource(
			component,
			options?.credentials,
		);
		const vault = createVaultResource(component, options?.vault);

		return {
			blueprints,
			executions,
			credentials,
			vault,

			execute: async (
				ctx: AnyActionCtx,
				executeOptions: ExecuteOptions,
			): Promise<ExecutionResult> => {
				const startTime = Date.now();

				const blueprint = await ctx.runQuery(component.public.blueprintGet, {
					id: executeOptions.blueprintId,
				});

				if (!blueprint) {
					return {
						success: false,
						error: `Blueprint not found: ${executeOptions.blueprintId}`,
						duration: Date.now() - startTime,
					};
				}

				const { id: executionId } = await ctx.runMutation(
					component.public.executionCreate,
					{
						blueprintId: executeOptions.blueprintId,
						organizationId: blueprint.organizationId,
						variables: executeOptions.variables,
						context: executeOptions.context,
					},
				);

				await ctx.runMutation(component.public.executionStart, {
					id: executionId,
				});

				let result: ExecutionResult;

				try {
					if (isRunnerMode(options?.execution)) {
						result = await options.execution.run(
							ctx,
							blueprint,
							executeOptions.variables,
						);
					} else if (isWorkflowMode(options?.execution)) {
						const workflowExecutor = createWorkflowExecutor({
							workflowComponent: component.workflow,
							retryConfig: options.execution.retryConfig,
							maxParallelism: options.execution.maxParallelism,
						});

						const workflowId = await workflowExecutor.manager.start(
							ctx,
							options.execution.workflowFn,
							{
								blueprintId: executeOptions.blueprintId,
								executionId,
								organizationId: blueprint.organizationId,
								variables: executeOptions.variables,
								context: executeOptions.context,
							},
							options.execution.onComplete
								? {
										onComplete: options.execution.onComplete,
										context: { executionId },
									}
								: undefined,
						);

						return {
							success: true,
							duration: Date.now() - startTime,
							outputs: { workflowId: workflowId as string },
						};
					} else if (isHttpMode(options?.execution)) {
						const endpoint = getEndpoint(options.execution);
						const response = await fetch(endpoint, {
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({
								blueprint,
								variables: executeOptions.variables,
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
								'No execution config. Set execution.mode to "runner", "workflow", or "http".',
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

			workflow:
				options?.execution && isWorkflowMode(options.execution)
					? createWorkflowExecutor({
							workflowComponent: component.workflow,
							retryConfig: options.execution.retryConfig,
							maxParallelism: options.execution.maxParallelism,
						})
					: null,
		};
	};
}
