import type { GenericActionCtx, GenericDataModel } from 'convex/server';
import type {
  CredentialResolver,
  ExecuteOptions,
  ExecutionResult,
  CredentialConfig,
  BrowserbaseConfig,
  ModelConfig,
} from '$/server/types.js';

type HttpExecutionConfig = {
  mode: 'http';
  endpoint: string;
};

type DirectExecutionConfig = {
  mode: 'direct';
  browserbase: BrowserbaseConfig;
  model?: ModelConfig;
};

type LegacyExecutionConfig = {
  endpoint: string;
};

export type CraneConfig = {
  credentials?: CredentialConfig;
  execution?: HttpExecutionConfig | DirectExecutionConfig | LegacyExecutionConfig;
  hooks?: {
    read?: (
      ctx: GenericActionCtx<GenericDataModel>,
      organizationId: string
    ) => void | Promise<void>;
    write?: (
      ctx: GenericActionCtx<GenericDataModel>,
      organizationId: string
    ) => void | Promise<void>;
    blueprint?: {
      insert?: (
        ctx: GenericActionCtx<GenericDataModel>,
        blueprint: unknown
      ) => void | Promise<void>;
    };
    execution?: {
      start?: (ctx: GenericActionCtx<GenericDataModel>, execution: unknown) => void | Promise<void>;
      complete?: (
        ctx: GenericActionCtx<GenericDataModel>,
        execution: unknown
      ) => void | Promise<void>;
    };
  };
};

function isDirectMode(
  config: HttpExecutionConfig | DirectExecutionConfig | LegacyExecutionConfig | undefined
): config is DirectExecutionConfig {
  return config !== undefined && 'mode' in config && config.mode === 'direct';
}

function isHttpMode(
  config: HttpExecutionConfig | DirectExecutionConfig | LegacyExecutionConfig | undefined
): config is HttpExecutionConfig | LegacyExecutionConfig {
  if (!config) return false;
  if ('mode' in config && config.mode === 'http') return true;
  if ('endpoint' in config && !('mode' in config)) return true;
  return false;
}

function getEndpoint(config: HttpExecutionConfig | LegacyExecutionConfig): string {
  return 'endpoint' in config ? config.endpoint : '';
}

export function crane(component: any) {
  return function boundCrane(config?: CraneConfig) {
    const hooks = config?.hooks;

    const buildCredentialResolver = (
      _ctx: GenericActionCtx<GenericDataModel>
    ): CredentialResolver | undefined => {
      if (config?.credentials?.resolver) {
        return config.credentials.resolver;
      }
      return undefined;
    };

    return {
      api: component.public,

      hooks: () => hooks,

      execute: async (
        ctx: GenericActionCtx<GenericDataModel>,
        options: ExecuteOptions
      ): Promise<ExecutionResult> => {
        const startTime = Date.now();

        const blueprint = await ctx.runQuery(component.public.blueprint.get, {
          id: options.blueprintId,
        });

        if (!blueprint) {
          return {
            success: false,
            error: `Blueprint not found: ${options.blueprintId}`,
            duration: Date.now() - startTime,
          };
        }

        const { id: executionId } = await ctx.runMutation(component.public.execution.create, {
          blueprintId: options.blueprintId,
          organizationId: blueprint.organizationId,
          variables: options.variables,
          context: options.context,
        });

        await ctx.runMutation(component.public.execution.start, { id: executionId });

        let result: ExecutionResult;

        try {
          if (isDirectMode(config?.execution)) {
            const { runBlueprintDirect } = await import('$/server/executor.js');
            const credentials = buildCredentialResolver(ctx);
            result = await runBlueprintDirect(
              {
                browserbase: config.execution.browserbase,
                model: config.execution.model,
              },
              blueprint,
              options.variables,
              credentials
            );
          } else if (isHttpMode(config?.execution)) {
            const endpoint = getEndpoint(config.execution);
            const response = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
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
              error: 'No execution config. Set execution.mode to "direct" or "http".',
              duration: Date.now() - startTime,
            };
          }
        } catch (error) {
          result = {
            success: false,
            error: `Execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            duration: Date.now() - startTime,
          };
        }

        await ctx.runMutation(component.public.execution.complete, {
          id: executionId,
          result,
        });

        return result;
      },
    };
  };
}
