/**
 * @trestleinc/crane - Server exports
 *
 * Import from '@trestleinc/crane/server' to use in Convex functions.
 */

// Convex component binding
export { crane } from "$/server/builder.js";
export type { CraneConfig } from "$/server/builder.js";

// External executor (for HTTP routes)
export { createExecutor } from "$/server/executor.js";

// Compiler (works anywhere)
export { compile } from "$/server/compiler.js";

// Types
export type {
  Adapter,
  AdapterFactory,
  CredentialResolver,
  ResolvedCredential,
  ExecuteOptions,
  ExecutionResult,
  ExecutorConfig,
  TileResult,
  M2MClaims,
  CompileOptions,
  CompiledBlueprint,
  BrowserbaseConfig,
  ModelConfig,
  ExecutionConfig,
  CredentialConfig,
} from "$/server/types.js";
