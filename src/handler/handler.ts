/**
 * @trestleinc/crane - HTTP Handler
 *
 * Framework-agnostic HTTP handler for blueprint execution.
 * Use this in any Node.js API environment (TanStack Start, Next.js, SvelteKit, Express).
 */

import type { Blueprint, Tile } from '$/shared/types.js';
import type {
  Adapter,
  CredentialResolver,
  ExecutionResult,
  ExecutorConfig,
  TileResult,
} from '$/server/types.js';

export type { ExecutorConfig as CraneHandlerConfig } from '$/server/types.js';

// ============================================================================
// Utilities
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
 * Sort tiles by their connection order (start to end).
 */
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

// ============================================================================
// Tile Execution
// ============================================================================

/**
 * Execute a single tile.
 */
async function executeTile(
  tile: Tile,
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

// ============================================================================
// HTTP Handler
// ============================================================================

/**
 * Run a blueprint with Stagehand.
 */
async function runBlueprint(
  config: ExecutorConfig,
  blueprint: Blueprint,
  variables: Record<string, unknown>,
  credentials?: CredentialResolver
): Promise<ExecutionResult> {
  const startTime = Date.now();
  const tileResults: TileResult[] = [];
  const outputs: Record<string, unknown> = {};

  // Dynamic import of Stagehand (peer dependency)
  const { Stagehand } = await import('@browserbasehq/stagehand');

  const stagehand = new Stagehand({
    env: 'BROWSERBASE',
    apiKey: config.browserbase.apiKey,
    projectId: config.browserbase.projectId,
    model: config.model?.name as any,
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
      const tileResult = await executeTile(
        tile,
        adapter,
        { ...variables, ...outputs },
        credentials
      );

      tileResults.push(tileResult);

      // Store extracted outputs
      if (tileResult.status === 'completed' && tile.type === 'EXTRACT') {
        const outputVar = tile.parameters.outputVariable as string;
        if (outputVar) {
          outputs[outputVar] = tileResult.result;
        }
      }

      // Stop on failure
      if (tileResult.status === 'failed') {
        break;
      }
    }

    const success = tileResults.every((r) => r.status === 'completed');
    return {
      success,
      duration: Date.now() - startTime,
      outputs: success ? outputs : undefined,
      error: success ? undefined : tileResults.find((r) => r.status === 'failed')?.error,
      tileResults,
    };
  } finally {
    await adapter.close().catch(() => {});
  }
}

/**
 * Create a framework-agnostic HTTP handler for blueprint execution.
 *
 * @example
 * ```typescript
 * // TanStack Start: src/routes/api/crane/execute.ts
 * import { createCraneHandler } from '@trestleinc/crane/handler';
 *
 * const handler = createCraneHandler({
 *   browserbase: {
 *     apiKey: process.env.BROWSERBASE_API_KEY!,
 *     projectId: process.env.BROWSERBASE_PROJECT_ID!,
 *   },
 *   model: { name: 'gpt-4o' },
 * });
 *
 * export const Route = createAPIFileRoute('/api/crane/execute')({
 *   POST: ({ request }) => handler(request),
 * });
 *
 * // Next.js App Router: app/api/crane/execute/route.ts
 * export const POST = handler;
 *
 * // SvelteKit: src/routes/api/crane/execute/+server.ts
 * export const POST = ({ request }) => handler(request);
 * ```
 */
export function createCraneHandler(config: ExecutorConfig) {
  return async (request: Request): Promise<Response> => {
    try {
      const body = await request.json();
      const { blueprint, variables, executionId } = body as {
        blueprint: Blueprint;
        variables: Record<string, unknown>;
        executionId?: string;
      };

      if (!blueprint) {
        return Response.json(
          { success: false, error: 'Missing blueprint in request body' },
          { status: 400 }
        );
      }

      const result = await runBlueprint(config, blueprint, variables ?? {});

      return Response.json({
        ...result,
        executionId,
      });
    } catch (error) {
      return Response.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  };
}
