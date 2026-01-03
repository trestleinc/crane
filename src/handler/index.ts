/**
 * @trestleinc/crane - Handler exports
 *
 * Import from '@trestleinc/crane/handler' for Node.js API endpoints.
 * This runs in framework server environments (TanStack Start, Next.js, SvelteKit, Express).
 */

export type { CraneHandlerConfig } from "$/handler/handler";
export { createCraneHandler } from "$/handler/handler";

// Re-export types needed for handler configuration
export type {
	BrowserbaseConfig,
	ExecutorConfig,
	ModelConfig,
} from "$/server/types";
