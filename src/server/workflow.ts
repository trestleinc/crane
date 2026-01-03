import { type WorkflowId, WorkflowManager } from "@convex-dev/workflow";
import type {
	FunctionReference,
	FunctionVisibility,
	GenericActionCtx,
	GenericDataModel,
} from "convex/server";
import { v } from "convex/values";
import type { Blueprint, Tile, TileResult } from "$/shared/types";
import type { ExecutionResult } from "./types";

type OnCompleteReference = FunctionReference<
	"mutation",
	FunctionVisibility,
	{ workId: unknown; context: unknown; result: unknown }
>;

export type WorkflowExecutorConfig = {
	workflowComponent: ConstructorParameters<typeof WorkflowManager>[0];
	retryConfig?: {
		maxAttempts?: number;
		initialBackoffMs?: number;
		base?: number;
	};
	maxParallelism?: number;
};

export type WorkflowExecuteOptions = {
	blueprint: Blueprint;
	variables: Record<string, unknown>;
	executionId: string;
	organizationId: string;
	context?: unknown;
};

export type WorkflowStatus = {
	type: "pending" | "running" | "completed" | "failed" | "canceled";
	workflowId: string;
	currentTileIndex?: number;
	tileResults?: TileResult[];
	error?: string;
};

export type { WorkflowId };

function interpolate(
	template: string,
	variables: Record<string, unknown>,
): string {
	return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
		const value = variables[key];
		return value !== undefined ? String(value) : `{{${key}}}`;
	});
}

function sortTiles(tiles: Tile[]): Tile[] {
	const startTile = tiles.find((t) => t.connections.input === null);
	if (!startTile) return tiles;

	const sorted: Tile[] = [];
	const visited = new Set<string>();
	let current: Tile | undefined = startTile;

	while (current && !visited.has(current.id)) {
		sorted.push(current);
		visited.add(current.id);
		const nextId: string | null = current.connections.output;
		if (nextId) {
			current = tiles.find((t) => t.id === nextId);
		} else {
			break;
		}
	}

	return sorted;
}

export function createWorkflowExecutor(config: WorkflowExecutorConfig) {
	const {
		workflowComponent,
		retryConfig = {
			maxAttempts: 3,
			initialBackoffMs: 1000,
			base: 2,
		},
		maxParallelism = 1,
	} = config;

	const workflowManager = new WorkflowManager(workflowComponent, {
		workpoolOptions: {
			maxParallelism,
			defaultRetryBehavior: {
				maxAttempts: retryConfig.maxAttempts ?? 3,
				initialBackoffMs: retryConfig.initialBackoffMs ?? 1000,
				base: retryConfig.base ?? 2,
			},
			retryActionsByDefault: true,
		},
	});

	return {
		manager: workflowManager,

		start: async (
			ctx: GenericActionCtx<GenericDataModel>,
			options: WorkflowExecuteOptions,
			callbacks?: {
				onComplete?: OnCompleteReference;
				context?: unknown;
			},
		): Promise<WorkflowId> => {
			const workflowId = await workflowManager.start(
				ctx,
				options as any,
				callbacks?.onComplete
					? {
							onComplete: callbacks.onComplete,
							context: callbacks.context,
						}
					: undefined,
			);
			return workflowId;
		},

		status: async (
			ctx: GenericActionCtx<GenericDataModel>,
			workflowId: WorkflowId,
		): Promise<WorkflowStatus> => {
			const status = await workflowManager.status(ctx, workflowId);

			if (status.type === "inProgress") {
				return {
					type: "running",
					workflowId: workflowId as string,
				};
			}

			if (status.type === "completed") {
				return {
					type: "completed",
					workflowId: workflowId as string,
				};
			}

			if (status.type === "failed") {
				return {
					type: "failed",
					workflowId: workflowId as string,
					error: status.error,
				};
			}

			if (status.type === "canceled") {
				return {
					type: "canceled",
					workflowId: workflowId as string,
				};
			}

			return {
				type: "pending",
				workflowId: workflowId as string,
			};
		},

		cancel: async (
			ctx: GenericActionCtx<GenericDataModel>,
			workflowId: WorkflowId,
		): Promise<void> => {
			await workflowManager.cancel(ctx, workflowId);
		},

		cleanup: async (
			ctx: GenericActionCtx<GenericDataModel>,
			workflowId: WorkflowId,
		): Promise<void> => {
			await workflowManager.cleanup(ctx, workflowId);
		},
	};
}

export const workflowArgs = {
	blueprintId: v.string(),
	executionId: v.string(),
	organizationId: v.string(),
	variables: v.record(v.string(), v.any()),
	context: v.optional(v.any()),
};

export const tileStepArgs = {
	tile: v.object({
		id: v.string(),
		type: v.string(),
		label: v.string(),
		description: v.optional(v.string()),
		position: v.object({ x: v.number(), y: v.number() }),
		parameters: v.record(v.string(), v.any()),
		connections: v.object({
			input: v.union(v.string(), v.null()),
			output: v.union(v.string(), v.null()),
		}),
	}),
	variables: v.record(v.string(), v.any()),
	executionId: v.string(),
};

export { sortTiles, interpolate };
