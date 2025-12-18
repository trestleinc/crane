/**
 * @trestleinc/crane - Server Builder
 *
 * Factory function to create a crane instance bound to a Convex component.
 */

import type { GenericActionCtx, GenericDataModel } from 'convex/server';
import type {
  Adapter,
  AdapterFactory,
  CredentialResolver,
  ExecuteOptions,
  ExecutionResult,
  TileResult,
  M2MClaims,
} from '$/server/types.js';

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Configuration for the crane instance.
 */
export type CraneConfig = {
  hooks?: {
    /** Called before read operations for authorization */
    read?: (ctx: GenericActionCtx<GenericDataModel>, organizationId: string) => void | Promise<void>;
    /** Called before write operations for authorization */
    write?: (
      ctx: GenericActionCtx<GenericDataModel>,
      organizationId: string
    ) => void | Promise<void>;
    /** Blueprint lifecycle hooks */
    blueprint?: {
      /** Called after a blueprint is created */
      insert?: (ctx: GenericActionCtx<GenericDataModel>, blueprint: unknown) => void | Promise<void>;
    };
    /** Execution lifecycle hooks */
    execution?: {
      /** Called when an execution starts */
      start?: (ctx: GenericActionCtx<GenericDataModel>, execution: unknown) => void | Promise<void>;
      /** Called when an execution completes */
      complete?: (
        ctx: GenericActionCtx<GenericDataModel>,
        execution: unknown
      ) => void | Promise<void>;
    };
  };
};

// ============================================================================
// Tile Execution
// ============================================================================

/**
 * Interpolate variables in a string template.
 * Replaces {{variable}} with actual values.
 */
function interpolate(template: string, variables: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = variables[key];
    return value !== undefined ? String(value) : `{{${key}}}`;
  });
}

/**
 * Execute a single tile.
 */
async function executeTile(
  tile: {
    id: string;
    type: string;
    parameters: Record<string, unknown>;
  },
  adapter: Adapter,
  variables: Record<string, unknown>,
  credentials?: CredentialResolver
): Promise<TileResult> {
  const startTime = Date.now();

  try {
    switch (tile.type) {
      case 'NAVIGATE': {
        const url = interpolate(tile.parameters.url as string, variables);
        await adapter.navigate(url, {
          waitUntil: (tile.parameters.waitUntil as 'load' | 'domcontentloaded' | 'networkidle') ?? 'load',
          timeout: (tile.parameters.timeout as number) ?? 30000,
        });
        return {
          tileId: tile.id,
          status: 'completed',
          duration: Date.now() - startTime,
        };
      }

      case 'CLICK': {
        const instruction = interpolate(tile.parameters.instruction as string, variables);
        const result = await adapter.act(`Click on ${instruction}`);
        return {
          tileId: tile.id,
          status: result.success ? 'completed' : 'failed',
          result,
          error: result.success ? undefined : result.message,
          duration: Date.now() - startTime,
        };
      }

      case 'TYPE': {
        const instruction = interpolate(tile.parameters.instruction as string, variables);
        let value: string;

        if (tile.parameters.value) {
          value = interpolate(tile.parameters.value as string, variables);
        } else if (tile.parameters.variable) {
          value = String(variables[tile.parameters.variable as string] ?? '');
        } else if (tile.parameters.credentialField && credentials) {
          const currentUrl = await adapter.currentUrl();
          const domain = new URL(currentUrl).hostname;
          const cred = await credentials(domain);
          if (!cred) {
            return {
              tileId: tile.id,
              status: 'failed',
              error: `No credentials found for domain: ${domain}`,
              duration: Date.now() - startTime,
            };
          }
          const field = tile.parameters.credentialField as string;
          value = field === 'username' ? cred.username : field === 'password' ? cred.password : (cred.fields?.[field] ?? '');
        } else {
          value = '';
        }

        const result = await adapter.act(`Type "${value}" into ${instruction}`);
        return {
          tileId: tile.id,
          status: result.success ? 'completed' : 'failed',
          result,
          error: result.success ? undefined : result.message,
          duration: Date.now() - startTime,
        };
      }

      case 'AUTH': {
        if (!credentials) {
          return {
            tileId: tile.id,
            status: 'failed',
            error: 'No credential resolver provided for AUTH tile',
            duration: Date.now() - startTime,
          };
        }

        const currentUrl = await adapter.currentUrl();
        const domain = new URL(currentUrl).hostname;
        const cred = await credentials(domain);

        if (!cred) {
          return {
            tileId: tile.id,
            status: 'failed',
            error: `No credentials found for domain: ${domain}`,
            duration: Date.now() - startTime,
          };
        }

        // Try common login patterns
        const usernameResult = await adapter.act(`Type "${cred.username}" into the username or email field`);
        if (!usernameResult.success) {
          return {
            tileId: tile.id,
            status: 'failed',
            error: `Failed to enter username: ${usernameResult.message}`,
            duration: Date.now() - startTime,
          };
        }

        const passwordResult = await adapter.act(`Type "${cred.password}" into the password field`);
        if (!passwordResult.success) {
          return {
            tileId: tile.id,
            status: 'failed',
            error: `Failed to enter password: ${passwordResult.message}`,
            duration: Date.now() - startTime,
          };
        }

        const submitResult = await adapter.act('Click the login or sign in button');
        return {
          tileId: tile.id,
          status: submitResult.success ? 'completed' : 'failed',
          result: submitResult,
          error: submitResult.success ? undefined : submitResult.message,
          duration: Date.now() - startTime,
        };
      }

      case 'EXTRACT': {
        const instruction = interpolate(tile.parameters.instruction as string, variables);
        const schema = tile.parameters.schema;
        const extracted = await adapter.extract(instruction, schema);
        return {
          tileId: tile.id,
          status: 'completed',
          result: extracted,
          duration: Date.now() - startTime,
        };
      }

      case 'SCREENSHOT': {
        const data = await adapter.screenshot({
          fullPage: (tile.parameters.fullPage as boolean) ?? false,
        });
        return {
          tileId: tile.id,
          status: 'completed',
          result: { type: 'screenshot', size: data.length },
          duration: Date.now() - startTime,
        };
      }

      case 'WAIT': {
        const ms = (tile.parameters.ms as number) ?? 1000;
        await new Promise((resolve) => setTimeout(resolve, ms));
        return {
          tileId: tile.id,
          status: 'completed',
          duration: Date.now() - startTime,
        };
      }

      case 'SELECT': {
        const instruction = interpolate(tile.parameters.instruction as string, variables);
        const value = interpolate(tile.parameters.value as string, variables);
        const result = await adapter.act(`Select "${value}" from ${instruction}`);
        return {
          tileId: tile.id,
          status: result.success ? 'completed' : 'failed',
          result,
          error: result.success ? undefined : result.message,
          duration: Date.now() - startTime,
        };
      }

      case 'FORM': {
        const fields = tile.parameters.fields as Array<{
          instruction: string;
          value?: string;
          variable?: string;
        }>;
        for (const field of fields) {
          const instruction = interpolate(field.instruction, variables);
          const value = field.value
            ? interpolate(field.value, variables)
            : field.variable
              ? String(variables[field.variable] ?? '')
              : '';
          const result = await adapter.act(`Type "${value}" into ${instruction}`);
          if (!result.success) {
            return {
              tileId: tile.id,
              status: 'failed',
              error: `Failed to fill field "${instruction}": ${result.message}`,
              duration: Date.now() - startTime,
            };
          }
        }
        return {
          tileId: tile.id,
          status: 'completed',
          duration: Date.now() - startTime,
        };
      }

      default:
        return {
          tileId: tile.id,
          status: 'failed',
          error: `Unknown tile type: ${tile.type}`,
          duration: Date.now() - startTime,
        };
    }
  } catch (error) {
    return {
      tileId: tile.id,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Tile type for sorting and execution.
 */
type SortableTile = {
  id: string;
  type: string;
  label?: string;
  description?: string;
  position?: { x: number; y: number };
  parameters: Record<string, unknown>;
  connections: { input: string | null; output: string | null };
};

/**
 * Sort tiles by their connection order (start to end).
 */
function sortTiles<T extends SortableTile>(tiles: T[]): T[] {
  // Find the start tile (input is null)
  const startTile = tiles.find((t) => t.connections.input === null);
  if (!startTile) return tiles;

  const sorted: T[] = [];
  const visited = new Set<string>();
  let current: T | undefined = startTile;

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

// ============================================================================
// M2M Token Utilities
// ============================================================================

/**
 * Get WorkOS M2M token for automated execution.
 */
async function getM2MToken(): Promise<string> {
  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: process.env.WORKOS_M2M_CLIENT_ID!,
    client_secret: process.env.WORKOS_M2M_CLIENT_SECRET!,
    scope: 'openid',
  });

  const response = await fetch(
    `https://${process.env.WORKOS_CLIENT_ID}.authkit.app/oauth2/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get M2M token: ${response.statusText}`);
  }

  const { access_token } = await response.json();
  return access_token;
}

/**
 * Verify WorkOS M2M token.
 */
async function verifyM2MToken(token: string): Promise<M2MClaims> {
  const { createRemoteJWKSet, jwtVerify } = await import('jose');

  const JWKS = createRemoteJWKSet(
    new URL(`https://api.workos.com/sso/jwks/${process.env.WORKOS_CLIENT_ID}`)
  );

  const { payload } = await jwtVerify(token, JWKS, {
    issuer: `https://${process.env.WORKOS_CLIENT_ID}.authkit.app`,
  });

  return payload as unknown as M2MClaims;
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a crane instance bound to your component.
 *
 * @example
 * // convex/crane.ts
 * import { crane } from '@trestleinc/crane/server';
 * import { components } from './_generated/api';
 *
 * export const c = crane(components.crane);
 */
export function crane(component: any) {
  return function boundCrane(config?: CraneConfig) {
    const hooks = config?.hooks;

    return {
      /**
       * Access the underlying component public API.
       */
      api: component.public,

      /**
       * Get configured hooks.
       */
      hooks: () => hooks,

      /**
       * Execute a blueprint with the provided adapter.
       *
       * @example
       * ```typescript
       * const result = await c.execute(ctx, {
       *   blueprintId: 'bp_123',
       *   variables: { firstName: 'John', portalUrl: 'https://example.com' },
       *   adapter: createStagehandAdapter,
       *   credentials: credentialResolver,
       * });
       * ```
       */
      execute: async (
        ctx: GenericActionCtx<GenericDataModel>,
        options: ExecuteOptions
      ): Promise<ExecutionResult> => {
        const startTime = Date.now();
        const tileResults: TileResult[] = [];
        const outputs: Record<string, unknown> = {};

        // Fetch blueprint
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

        // Create execution record
        const { id: executionId } = await ctx.runMutation(component.public.execution.create, {
          blueprintId: options.blueprintId,
          organizationId: blueprint.organizationId,
          variables: options.variables,
          context: options.context,
        });

        // Start execution
        await ctx.runMutation(component.public.execution.start, { id: executionId });

        // Create adapter
        let adapter: Adapter;
        try {
          adapter = await options.adapter({
            blueprintId: options.blueprintId,
            contextId: undefined, // TODO: Get from vault if available
          });
        } catch (error) {
          const result: ExecutionResult = {
            success: false,
            error: `Failed to create adapter: ${error instanceof Error ? error.message : 'Unknown error'}`,
            duration: Date.now() - startTime,
          };
          await ctx.runMutation(component.public.execution.complete, {
            id: executionId,
            result,
          });
          return result;
        }

        try {
          // Sort tiles by connection order
          const sortedTiles = sortTiles(blueprint.tiles);

          // Execute tiles in sequence
          for (const tile of sortedTiles) {
            options.onProgress?.(tile.id, 'running');

            const tileResult = await executeTile(
              tile,
              adapter,
              { ...options.variables, ...outputs },
              options.credentials
            );

            tileResults.push(tileResult);
            options.onProgress?.(tile.id, tileResult.status);

            // Store extracted outputs
            if (tileResult.status === 'completed' && tile.type === 'EXTRACT') {
              const outputVar = tile.parameters.outputVariable as string;
              if (outputVar) {
                outputs[outputVar] = tileResult.result;
              }
            }

            // Handle screenshot artifacts
            if (tileResult.status === 'completed' && tile.type === 'SCREENSHOT' && options.onArtifact) {
              const data = await adapter.screenshot({
                fullPage: (tile.parameters.fullPage as boolean) ?? false,
              });
              await options.onArtifact('screenshot', tile.id, data);
            }

            // Stop on failure
            if (tileResult.status === 'failed') {
              break;
            }
          }

          const success = tileResults.every((r) => r.status === 'completed');
          const result: ExecutionResult = {
            success,
            duration: Date.now() - startTime,
            outputs: success ? outputs : undefined,
            error: success ? undefined : tileResults.find((r) => r.status === 'failed')?.error,
            tileResults,
          };

          // Complete execution
          await ctx.runMutation(component.public.execution.complete, {
            id: executionId,
            result,
          });

          return result;
        } finally {
          // Always close adapter
          await adapter.close().catch(() => {});
        }
      },

      /**
       * Vault M2M utilities for automated execution.
       */
      vault: {
        m2m: {
          /** Get WorkOS M2M token */
          token: getM2MToken,
          /** Verify WorkOS M2M token */
          verify: verifyM2MToken,
        },
      },
    };
  };
}
