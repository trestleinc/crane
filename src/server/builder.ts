/**
 * @trestleinc/crane - Server Builder
 *
 * Factory function to create a crane instance bound to a Convex component.
 */

import type { GenericActionCtx, GenericDataModel } from 'convex/server';
import type {
  Adapter,
  CredentialResolver,
  ResolvedCredential,
  ExecuteOptions,
  ExecutionResult,
  TileResult,
  M2MClaims,
  ExecutionConfig,
  CredentialConfig,
} from '$/server/types.js';

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Configuration for the crane instance.
 *
 * @example
 * ```typescript
 * const c = crane(components.crane)({
 *   credentials: { table: 'credentials' },
 *   execution: {
 *     mode: 'internal',
 *     browserbase: {
 *       apiKey: process.env.BROWSERBASE_API_KEY!,
 *       projectId: process.env.BROWSERBASE_PROJECT_ID!,
 *     },
 *   },
 * });
 * ```
 */
export type CraneConfig = {
  /** Credential resolution configuration */
  credentials?: CredentialConfig;
  /** Execution mode and provider configuration */
  execution?: ExecutionConfig;
  /** Lifecycle hooks */
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
// Internal Execution (Stagehand in Convex Node Action)
// ============================================================================

/**
 * Create a Stagehand adapter and execute tiles internally.
 * Requires "use node" directive in the calling Convex action.
 */
async function executeInternal(
  blueprint: SortableTile[] & { tiles: SortableTile[] },
  variables: Record<string, unknown>,
  credentialResolver: CredentialResolver | undefined,
  executionConfig: ExecutionConfig,
  options: ExecuteOptions
): Promise<{ result: ExecutionResult; outputs: Record<string, unknown> }> {
  const startTime = Date.now();
  const tileResults: TileResult[] = [];
  const outputs: Record<string, unknown> = {};

  // Dynamic import of Stagehand (peer dependency)
  const { Stagehand } = await import('@browserbasehq/stagehand');

  const stagehand = new Stagehand({
    env: 'BROWSERBASE',
    apiKey: executionConfig.browserbase.apiKey,
    projectId: executionConfig.browserbase.projectId,
    // Model can be a string like 'gpt-4o' or ClientOptions with modelName
    model: executionConfig.model?.name as any,
  });

  await stagehand.init();
  const page = stagehand.context.pages()[0];

  // Build adapter from Stagehand
  const adapter: Adapter = {
    navigate: async (url, opts) => {
      await page.goto(url, opts);
    },
    act: async (instruction) => {
      try {
        const result = await stagehand.act(instruction);
        return { success: result.success, message: result.message };
      } catch (error) {
        return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
    extract: async (instruction, schema) => {
      if (schema) {
        return stagehand.extract(instruction, schema as any);
      }
      const result = await stagehand.extract(instruction);
      return result.extraction as any;
    },
    screenshot: async (opts) => {
      const buffer = await page.screenshot({ fullPage: opts?.fullPage });
      return new Uint8Array(buffer);
    },
    currentUrl: async () => page.url(),
    close: async () => {
      await stagehand.close();
    },
  };

  try {
    // Sort and execute tiles
    const sortedTiles = sortTiles(blueprint.tiles);

    for (const tile of sortedTiles) {
      options.onProgress?.(tile.id, 'running');

      const tileResult = await executeTile(
        tile,
        adapter,
        { ...variables, ...outputs },
        credentialResolver
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
    return {
      result: {
        success,
        duration: Date.now() - startTime,
        outputs: success ? outputs : undefined,
        error: success ? undefined : tileResults.find((r) => r.status === 'failed')?.error,
        tileResults,
      },
      outputs,
    };
  } finally {
    await adapter.close().catch(() => {});
  }
}

/**
 * Execute via external HTTP endpoint.
 */
async function executeExternal(
  blueprint: unknown,
  variables: Record<string, unknown>,
  executionId: string,
  endpoint: string
): Promise<ExecutionResult> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blueprint, variables, executionId }),
  });

  if (!response.ok) {
    return {
      success: false,
      error: `External execution failed: ${response.status} ${response.statusText}`,
    };
  }

  return response.json();
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a crane instance bound to your component.
 *
 * @example
 * ```typescript
 * // convex/crane.ts
 * import { crane } from '@trestleinc/crane/server';
 * import { components } from './_generated/api';
 *
 * const c = crane(components.crane)({
 *   credentials: { table: 'credentials' },
 *   execution: {
 *     mode: 'internal',
 *     browserbase: {
 *       apiKey: process.env.BROWSERBASE_API_KEY!,
 *       projectId: process.env.BROWSERBASE_PROJECT_ID!,
 *     },
 *   },
 * });
 *
 * export const execute = internalAction({
 *   args: { blueprintId: v.string(), variables: v.any() },
 *   handler: (ctx, args) => c.execute(ctx, args),
 * });
 * ```
 */
export function crane(component: any) {
  return function boundCrane(config?: CraneConfig) {
    const hooks = config?.hooks;

    /**
     * Build credential resolver from config.
     * Note: For table-based resolution, the component must expose a query endpoint.
     */
    const buildCredentialResolver = (
      _ctx: GenericActionCtx<GenericDataModel>
    ): CredentialResolver | undefined => {
      if (config?.credentials?.resolver) {
        return config.credentials.resolver;
      }
      // Table-based credential resolution requires a component query
      // The app should use the resolver option with ctx.runQuery to their own credential table
      if (config?.credentials?.table) {
        console.warn(
          'Table-based credential resolution is not yet supported. ' +
          'Use the resolver option with a custom function that queries your credential table.'
        );
      }
      return undefined;
    };

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
       * Execute a blueprint.
       * Uses the execution mode configured in CraneConfig.
       *
       * @example
       * ```typescript
       * const result = await c.execute(ctx, {
       *   blueprintId: 'bp_123',
       *   variables: { firstName: 'John', portalUrl: 'https://example.com' },
       * });
       * ```
       */
      execute: async (
        ctx: GenericActionCtx<GenericDataModel>,
        options: ExecuteOptions
      ): Promise<ExecutionResult> => {
        const startTime = Date.now();

        // Validate execution config
        if (!config?.execution) {
          return {
            success: false,
            error: 'No execution config provided. Set execution.mode and execution.browserbase in CraneConfig.',
            duration: Date.now() - startTime,
          };
        }

        const mode = config.execution.mode;
        if (mode === 'external' && !config.execution.endpoint) {
          return {
            success: false,
            error: 'External mode requires execution.endpoint in CraneConfig.',
            duration: Date.now() - startTime,
          };
        }

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

        let result: ExecutionResult;

        try {
          if (mode === 'external') {
            // External: POST to HTTP endpoint
            result = await executeExternal(
              blueprint,
              options.variables,
              executionId,
              config.execution.endpoint!
            );
          } else {
            // Internal: Run Stagehand directly
            const credentialResolver = buildCredentialResolver(ctx);
            const { result: execResult } = await executeInternal(
              blueprint,
              options.variables,
              credentialResolver,
              config.execution,
              options
            );
            result = execResult;
          }
        } catch (error) {
          result = {
            success: false,
            error: `Execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            duration: Date.now() - startTime,
          };
        }

        // Complete execution
        await ctx.runMutation(component.public.execution.complete, {
          id: executionId,
          result,
        });

        return result;
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
