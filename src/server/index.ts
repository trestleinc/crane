/**
 * @trestleinc/crane - Server exports
 *
 * Import from '@trestleinc/crane/server' for Convex user space code.
 * This runs in Convex runtime - NO Node.js dependencies allowed.
 *
 * For Node.js API endpoints, use '@trestleinc/crane/handler' instead.
 */

// Convex component binding (no Node.js dependencies)
export { crane } from "$/server/builder.js";
export type { CraneConfig } from "$/server/builder.js";

// Compiler (works anywhere)
export { compile } from "$/server/compiler.js";

// Types (no runtime deps)
export type {
  CredentialResolver,
  ResolvedCredential,
  ExecuteOptions,
  ExecutionResult,
  TileResult,
  CompileOptions,
  CompiledBlueprint,
  CredentialConfig,
} from "$/server/types.js";
