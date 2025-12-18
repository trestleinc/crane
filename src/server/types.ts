/**
 * @trestleinc/crane - Server Types
 *
 * Type definitions for browser adapter, factories, and credential resolution.
 * These are functional types (not classes/interfaces) that the app implements.
 */

// ============================================================================
// Adapter Types
// ============================================================================

/**
 * Browser adapter - object with functions for browser automation.
 * App provides implementation, Crane defines the shape.
 *
 * @example
 * ```typescript
 * // Stagehand v3 API
 * const page = stagehand.context.pages()[0];
 * const adapter: Adapter = {
 *   navigate: (url) => page.goto(url),
 *   act: (instruction) => stagehand.act(instruction),
 *   extract: (instruction, schema) => stagehand.extract(instruction, schema),
 *   screenshot: (opts) => page.screenshot(opts),
 *   currentUrl: () => Promise.resolve(page.url()),
 *   close: () => stagehand.close(),
 * };
 * ```
 */
export type Adapter = {
  /** Navigate to a URL */
  navigate: (
    url: string,
    options?: { waitUntil?: 'load' | 'domcontentloaded' | 'networkidle'; timeout?: number }
  ) => Promise<void>;

  /** Perform an action described in natural language */
  act: (instruction: string) => Promise<{ success: boolean; message?: string }>;

  /** Extract data described in natural language */
  extract: <T = unknown>(instruction: string, schema?: unknown) => Promise<T>;

  /** Capture a screenshot */
  screenshot: (options?: { fullPage?: boolean }) => Promise<Uint8Array>;

  /** Get current URL */
  currentUrl: () => Promise<string>;

  /** Close the browser session */
  close: () => Promise<void>;
};

/**
 * Factory function to create browser adapters.
 * App implements this to provide Stagehand/Browserbase integration.
 *
 * @example
 * ```typescript
 * // Stagehand v3 API
 * const createAdapter: AdapterFactory = async ({ blueprintId, contextId }) => {
 *   const stagehand = new Stagehand({ env: "BROWSERBASE" });
 *   await stagehand.init();
 *   const page = stagehand.context.pages()[0];
 *
 *   return {
 *     navigate: (url, opts) => page.goto(url, opts),
 *     act: (instruction) => stagehand.act(instruction),
 *     extract: (instruction, schema) => stagehand.extract(instruction, schema),
 *     screenshot: (opts) => page.screenshot(opts),
 *     currentUrl: () => Promise.resolve(page.url()),
 *     close: () => stagehand.close(),
 *   };
 * };
 * ```
 */
export type AdapterFactory = (options: {
  /** Blueprint being executed */
  blueprintId: string;
  /** Browserbase persistent context ID (optional) */
  contextId?: string;
}) => Promise<Adapter>;

// ============================================================================
// Credential Types
// ============================================================================

/**
 * Resolved credential for domain-based authentication.
 */
export type ResolvedCredential = {
  username: string;
  password: string;
  /** Additional fields for complex login forms */
  fields?: Record<string, string>;
};

/**
 * Function to resolve credentials for a domain.
 * Called during AUTH tile execution.
 *
 * @example
 * ```typescript
 * const resolveCredential: CredentialResolver = async (domain) => {
 *   const cred = await vault.credential.resolve(key, domain);
 *   return { username: cred.username, password: cred.password };
 * };
 * ```
 */
export type CredentialResolver = (domain: string) => Promise<ResolvedCredential | null>;

// ============================================================================
// Execution Types
// ============================================================================

/**
 * Options for executing a blueprint.
 * Adapter and credentials come from CraneConfig, not passed here.
 */
export type ExecuteOptions = {
  /** Blueprint ID to execute */
  blueprintId: string;
  /** Variables for tile parameter interpolation */
  variables: Record<string, unknown>;
  /** App-specific context (deliverableId, beneficiaryId, etc.) */
  context?: unknown;
  /** Progress callback for tile status updates */
  onProgress?: (tileId: string, status: 'running' | 'completed' | 'failed') => void;
  /** Artifact callback for screenshots/files */
  onArtifact?: (type: string, tileId: string, data: Uint8Array) => Promise<string>;
};

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Browserbase configuration for Stagehand.
 */
export type BrowserbaseConfig = {
  /** Browserbase API key */
  apiKey: string;
  /** Browserbase project ID */
  projectId: string;
};

/**
 * Model configuration for Stagehand AI operations.
 */
export type ModelConfig = {
  /** Model name (default: 'gpt-4o') */
  name?: string;
  /** Model provider (default: 'openai') */
  provider?: string;
};

/**
 * Execution mode configuration.
 */
export type ExecutionConfig = {
  /** Execution mode: 'internal' runs in Convex, 'external' POSTs to endpoint */
  mode: 'internal' | 'external';
  /** Browserbase config (required for both modes) */
  browserbase: BrowserbaseConfig;
  /** Model config for Stagehand AI (optional) */
  model?: ModelConfig;
  /** External endpoint URL (required for 'external' mode) */
  endpoint?: string;
};

/**
 * Credential resolution configuration.
 */
export type CredentialConfig = {
  /** Table name with by_domain index for credential lookup */
  table?: string;
  /** Custom resolver function (alternative to table) */
  resolver?: CredentialResolver;
};

/**
 * Configuration for createExecutor (external HTTP execution).
 */
export type ExecutorConfig = {
  /** Browserbase configuration */
  browserbase: BrowserbaseConfig;
  /** Model configuration */
  model?: ModelConfig;
};

/**
 * Result of tile execution.
 */
export type TileResult = {
  tileId: string;
  status: 'completed' | 'failed';
  result?: unknown;
  error?: string;
  duration?: number;
};

/**
 * Result of blueprint execution.
 */
export type ExecutionResult = {
  success: boolean;
  duration?: number;
  outputs?: Record<string, unknown>;
  error?: string;
  tileResults?: TileResult[];
};

// ============================================================================
// Compiler Types
// ============================================================================

/**
 * Options for compiling a blueprint to code.
 */
export type CompileOptions = {
  /** Function name for the generated executor. Default: "execute" */
  functionName?: string;
  /** Include tile labels as comments. Default: true */
  includeComments?: boolean;
  /** Indentation spaces. Default: 2 */
  indentation?: number;
};

/**
 * Result of compiling a blueprint to code.
 */
export type CompiledBlueprint = {
  /** Generated TypeScript code */
  code: string;
  /** Name of the generated function */
  functionName: string;
  /** Variables used in {{interpolation}} patterns */
  inputVariables: string[];
  /** Variables produced by EXTRACT tiles */
  outputVariables: string[];
};

// ============================================================================
// M2M Types
// ============================================================================

/**
 * Claims from WorkOS M2M JWT token.
 */
export type M2MClaims = {
  sub: string;
  iss: string;
  aud?: string | string[];
  exp: number;
  iat: number;
  org_id?: string;
  permissions?: string[];
};
