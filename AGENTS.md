# AGENTS.md - Development Guide

## Commands
- **Build:** `bun run build` (uses tsdown, outputs to `dist/`)
- **Test:** `bun test` (Vitest). Run single: `bun test src/path/to/test.ts`
- **Lint & Format:** `bun run check:fix` (Biome) - **ALWAYS RUN BEFORE COMMITTING**
- **Type Check:** Build includes type checking via tsdown

## Code Style & Conventions
- **Formatting:** 2 spaces, single quotes, semicolons (enforced by Biome).
- **Imports:** Use `import type` for types. Use `node:` protocol for Node built-ins.
- **Logging:** Use `LogTape`. Avoid `console.*` (warns in Biome, allowed in tests).
- **Structure:** Single package. `src/client` (browser), `src/server` (Convex), `src/component`.
- **Documentation:** ALWAYS use `Context7` tool for library docs (Convex, Stagehand, jose).
- **Scoping:** All data is scoped by `organizationId`.
- **No Classes:** Use factory functions and type aliases. NOT interfaces for class implementations.

## File Structure
```
src/
├── client/                  # Client-side utilities
│   ├── index.ts             # Public exports
│   ├── blueprint.ts         # Fluent blueprint builder
│   ├── vault.ts             # Vault and credential operations
│   ├── errors.ts            # Error classes (Effect-based)
│   └── logger.ts            # LogTape logger
├── server/                  # Server-side (Convex functions)
│   ├── index.ts             # Public exports
│   ├── crane.ts             # crane() factory, CraneComponentApi, CraneOptions
│   ├── resource.ts          # ResourceHooks, ExecutionHooks, VaultHooks, CredentialHooks
│   ├── types.ts             # Adapter, AdapterFactory, CredentialResolver
│   ├── errors.ts            # CraneError, NotFoundError, ValidationError, AuthorizationError
│   ├── workflow.ts          # Workflow executor, status, cancellation
│   ├── compiler.ts          # Blueprint to code compiler
│   └── resources/           # Resource implementations
│       ├── blueprint.ts     # Blueprint CRUD with hooks
│       ├── execution.ts     # Execution lifecycle with hooks
│       ├── credential.ts    # Credential management with hooks
│       └── vault.ts         # Vault operations with hooks
├── component/               # Internal Convex component
│   ├── convex.config.ts     # Component config
│   ├── schema.ts            # Database schema
│   ├── public.ts            # Component API
│   └── logger.ts            # Component logging
├── shared/                  # Shared types (all environments)
│   ├── index.ts             # Re-exports
│   ├── types.ts             # Blueprint, Tile, Execution, Vault, Credential
│   └── validators.ts        # Convex validators for all types
└── handler/                 # HTTP handler for execution endpoint
    └── index.ts
```

## Public API

### Server (`@trestleinc/crane/server`)

```typescript
// Factory (Replicate-inspired pattern)
crane(component)(options)           // Create crane instance with hooks

// Options structure
{
  blueprints: { hooks: { evalRead, evalWrite, evalRemove, beforeUpdate, onInsert, onUpdate, onRemove, onError, transform } },
  executions: { hooks: { ...baseHooks, onStart, onComplete, onCancel } },
  credentials: { hooks: { ...baseHooks, onResolve } },
  vault: { hooks: { ...baseHooks, onSetup, onUnlock, onEnable } },
  execution: { mode: 'http' | 'runner' | 'workflow', ... },
}

// Types (app implements)
Adapter                             // Browser adapter object
AdapterFactory                      // Factory function for adapters
CredentialResolver                  // Function to resolve credentials by domain

// Hook types
ResourceHooks<T>                    // Base hooks for all resources
ExecutionHooks<T>                   // ResourceHooks + execution-specific
CredentialHooks<T>                  // ResourceHooks + onResolve
VaultHooks<T>                       // ResourceHooks + vault-specific

// Error types
CraneError                          // Base error class with code property
NotFoundError                       // Resource not found: new NotFoundError('Blueprint', id)
ValidationError                     // Validation failed: new ValidationError('message')
AuthorizationError                  // Authorization denied: new AuthorizationError('message')

// Workflow utilities
createWorkflowExecutor(config)      // Create durable workflow executor
sortTiles, interpolate              // Blueprint utilities
workflowArgs, tileStepArgs          // Convex validators
```

### Crane Instance Methods

```typescript
// Resources (directly on instance)
c.blueprints.get, c.blueprints.list, c.blueprints.create, c.blueprints.update, c.blueprints.remove
c.executions.get, c.executions.list, c.executions.create, c.executions.start, c.executions.complete, c.executions.cancel
c.credentials.get, c.credentials.list, c.credentials.create, c.credentials.update, c.credentials.remove, c.credentials.resolve
c.vault.get, c.vault.setup, c.vault.unlock, c.vault.enable, c.vault.context

// Execution
c.execute(ctx, options)             // Run blueprint with adapter

// Workflow (when mode='workflow')
c.workflow.manager                  // WorkflowManager instance
c.workflow.status(ctx, workflowId)  // Get workflow status
c.workflow.cancel(ctx, workflowId)  // Cancel workflow
c.workflow.cleanup(ctx, workflowId) // Cleanup completed workflow
```

### Client (`@trestleinc/crane/client`)

```typescript
// Blueprint builder (fluent API)
blueprint.create(name).navigate(url).auth().type(instruction, opts).click(instruction).build()

// Vault operations
vault.setup(password)
vault.unlock(password, vaultData)
vault.credential.encrypt(key, fields)
vault.credential.decrypt(key, encrypted)

// Error types
NetworkError, AuthorizationError, NotFoundError, ValidationError, NonRetriableError
```

## Hooks Reference

### Authorization Hooks (eval*)
Run BEFORE operation. Throw to deny access.

```typescript
evalRead: (ctx, organizationId) => void | Promise<void>   // Before reads
evalWrite: (ctx, doc) => void | Promise<void>             // Before writes
evalRemove: (ctx, doc) => void | Promise<void>            // Before deletes (receives full doc)
```

### Mutation Hooks (before*)
Run BEFORE mutation is applied. Return modified updates.

```typescript
beforeUpdate: (ctx, updates, prev) => Partial<T> | Promise<Partial<T>>  // Modify updates
```

### Side Effect Hooks (on*)
Run AFTER operation for logging, notifications.

```typescript
onInsert: (ctx, doc) => void | Promise<void>              // After insert
onUpdate: (ctx, doc, prev) => void | Promise<void>        // After update
onRemove: (ctx, doc) => void | Promise<void>              // After delete (receives full doc)
transform: (docs) => T[] | Promise<T[]>                   // Transform results
```

### Error Hooks
Centralized error handling for all operations.

```typescript
onError: (ctx, error, operation) => void | Promise<void>  // When operation fails
// operation: 'get' | 'list' | 'create' | 'update' | 'remove' | 'start' | 'complete' | 'cancel'
```

### Resource-Specific Hooks

| Resource | Additional Hooks |
|----------|-----------------|
| `executions` | `onStart`, `onComplete`, `onCancel` |
| `vault` | `onSetup`, `onUnlock`, `onEnable` |
| `credentials` | `onResolve` |

## Execution Modes

```typescript
// HTTP - external endpoint
execution: { mode: 'http', endpoint: 'https://...' }

// Runner - custom function
execution: { mode: 'runner', run: async (ctx, blueprint, variables) => result }

// Workflow - durable Convex workflow
execution: {
  mode: 'workflow',
  workflowFn: internal.workflows.execute,
  onComplete: internal.workflows.complete,
  retryConfig: { maxAttempts: 3, initialBackoffMs: 1000, base: 2 },
  maxParallelism: 1,
}
```

## Critical Rules (from CLAUDE.md)
- NEVER use WebSearch for library documentation; use Context7.
- Use `bun` for all commands.
- Resource pattern: `c.blueprints.get`, `c.executions.start`, `c.vault.setup`, `c.credentials.resolve`.
- NO CLASSES - Use functional patterns with type aliases.
- App provides Adapter implementation - Crane defines the type.
- Hooks: eval* for auth (throw to deny), before* for mutation modification, on* for side effects.
- evalRemove and onRemove now receive full document (not just ID).
