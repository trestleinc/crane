/**
 * @trestleinc/crane - Handler exports
 *
 * Import from '@trestleinc/crane/handler' for Node.js API endpoints.
 * This runs in framework server environments (TanStack Start, Next.js, SvelteKit, Express).
 */

export { createCraneHandler } from '$/handler/handler.js';
export type { CraneHandlerConfig } from '$/handler/handler.js';

// Re-export types needed for handler configuration
export type {
  ExecutorConfig,
  BrowserbaseConfig,
  ModelConfig,
} from '$/server/types.js';
