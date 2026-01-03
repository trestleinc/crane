# @trestleinc/crane

> Browser automation engine with integrated credential vault for Convex.

Crane executes **blueprints**—sequences of automation steps—against web portals that lack APIs. It stores blueprint definitions, manages encrypted credentials, and tracks execution history.

## Installation

```bash
npm install @trestleinc/crane
# or
bun add @trestleinc/crane
```

## Setup

### 1. Add the component

```typescript
// convex/convex.config.ts
import crane from '@trestleinc/crane/convex.config';
import { defineApp } from 'convex/server';

const app = defineApp();
app.use(crane);
export default app;
```

### 2. Create your crane instance

```typescript
// convex/crane.ts
import { crane, AuthorizationError } from '@trestleinc/crane/server';
import { components } from './_generated/api';

export const c = crane(components.crane)({
  blueprints: {
    hooks: {
      // Authorization - throw to deny access
      evalRead: async (ctx, organizationId) => {
        const user = await getUser(ctx);
        if (!user.canAccessOrg(organizationId)) {
          throw new AuthorizationError('Access denied');
        }
      },
      evalWrite: async (ctx, doc) => {
        const user = await getUser(ctx);
        if (!user.canWrite(doc.organizationId)) {
          throw new AuthorizationError('Write access denied');
        }
      },
      evalRemove: async (ctx, doc) => {
        // Now receives full document for context
        const user = await getUser(ctx);
        if (!user.isAdmin && doc.organizationId !== user.orgId) {
          throw new AuthorizationError('Delete access denied');
        }
      },

      // Mutation hooks
      beforeUpdate: async (ctx, updates, prev) => {
        // Modify updates before applying - return modified updates
        return { ...updates, updatedBy: await getCurrentUserId(ctx) };
      },

      // Side effects - run after operations
      onInsert: async (ctx, doc) => {
        await logActivity(ctx, 'blueprint.created', doc.id);
      },
      onUpdate: async (ctx, doc, prev) => {
        await logActivity(ctx, 'blueprint.updated', { id: doc.id, changes: diff(prev, doc) });
      },
      onRemove: async (ctx, doc) => {
        // Now receives full document for cleanup
        await logActivity(ctx, 'blueprint.deleted', doc);
      },

      // Error handling
      onError: async (ctx, error, operation) => {
        await logError(ctx, `blueprints.${operation}`, error);
      },
    },
  },
  executions: {
    hooks: {
      onStart: async (ctx, execution) => {
        await notifyExecutionStarted(ctx, execution);
      },
      onComplete: async (ctx, execution) => {
        await notifyExecutionCompleted(ctx, execution);
      },
      onCancel: async (ctx, execution) => {
        await notifyExecutionCancelled(ctx, execution);
      },
    },
  },
  execution: {
    mode: 'workflow',
    workflowFn: internal.workflows.execute,
    onComplete: internal.workflows.complete,
    retryConfig: { maxAttempts: 3, initialBackoffMs: 1000, base: 2 },
  },
});
```

### 3. Use in your functions

```typescript
// convex/blueprints.ts
import { query, mutation } from './_generated/server';
import { v } from 'convex/values';
import { c } from './crane';

export const list = query({
  args: { organizationId: v.string() },
  handler: async (ctx, { organizationId }) => {
    return ctx.runQuery(c.blueprints.list, { organizationId });
  },
});

export const create = mutation({
  args: {
    organizationId: v.string(),
    name: v.string(),
    tiles: v.array(v.any()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Returns { id: string } - mutations return full documents internally
    return ctx.runMutation(c.blueprints.create, args);
  },
});
```

## Migration from v1.x

The API has been refactored from a namespaced pattern to a Replicate-inspired factory pattern with hooks.

```typescript
// Before (v1.x)
const c = crane(components.crane)();
await ctx.runQuery(c.api.blueprint.get, { id });
await ctx.runMutation(c.api.credential.create, args);

// After (v2.x)
const c = crane(components.crane)({ /* options */ });
await ctx.runQuery(c.blueprints.get, { id });
await ctx.runMutation(c.credentials.create, args);
```

### Breaking Changes
- `c.api.blueprint.*` → `c.blueprints.*`
- `c.api.execution.*` → `c.executions.*`
- `c.api.credential.*` → `c.credentials.*`
- `c.api.vault.*` → `c.vault.*`
- `evalRemove` now receives full document instead of just ID
- `onRemove` now receives full document instead of just ID

### New Features
- `beforeUpdate` hook for modifying updates before application
- `onError` hook for centralized error logging
- Type-safe `CraneComponentApi` type (no more `any`)
- Custom error classes: `NotFoundError`, `ValidationError`, `AuthorizationError`
- Full document access in removal hooks for better context

## Core Concepts

### Blueprints

A blueprint is a sequence of **tiles** (automation steps):

```
NAVIGATE → AUTH → TYPE → CLICK → SCREENSHOT → EXTRACT
```

| Tile | Purpose |
|------|---------|
| `NAVIGATE` | Go to URL (supports `{{variable}}` interpolation) |
| `AUTH` | Login using stored credentials (domain-based lookup) |
| `TYPE` | Type into a field (from variable or credential) |
| `CLICK` | Click an element |
| `EXTRACT` | Extract structured data from page |
| `SCREENSHOT` | Capture screenshot artifact |
| `WAIT` | Wait for specified duration |
| `SELECT` | Select dropdown option |
| `FORM` | Fill multiple form fields at once |

### Executions

Track blueprint runs with:
- Status (`pending` → `running` → `completed`/`failed`/`cancelled`)
- Duration and timing
- Extracted outputs
- Screenshot artifacts

### Credential Vault

Zero-knowledge credential storage:
- Credentials encrypted client-side with AES-256-GCM
- Server never sees plaintext passwords
- Domain-based lookup during AUTH tiles
- WorkOS M2M authentication for automated execution

## Hooks System

Hooks provide lifecycle control, authorization, and error handling. There are four categories:

### Authorization Hooks (eval*)

Run **before** operations. Throw to deny access. Use custom error types for better error handling.

```typescript
import { crane, AuthorizationError, NotFoundError } from '@trestleinc/crane/server';

const c = crane(components.crane)({
  blueprints: {
    hooks: {
      // Check read permission
      evalRead: async (ctx, organizationId) => {
        const user = await getUser(ctx);
        if (!user.canRead(organizationId)) {
          throw new AuthorizationError('Read access denied');
        }
      },
      // Check write permission - receives the document being written
      evalWrite: async (ctx, doc) => {
        const user = await getUser(ctx);
        if (!user.canWrite(doc.organizationId)) {
          throw new AuthorizationError('Write access denied');
        }
      },
      // Check delete permission - receives FULL document (not just ID)
      evalRemove: async (ctx, doc) => {
        const user = await getUser(ctx);
        if (!user.isAdmin && doc.createdBy !== user.id) {
          throw new AuthorizationError('Only admins or creators can delete');
        }
      },
    },
  },
});
```

### Mutation Hooks (before*)

Run **before** mutations are applied. Modify and return the updates.

```typescript
const c = crane(components.crane)({
  blueprints: {
    hooks: {
      // Modify updates before they're applied
      beforeUpdate: async (ctx, updates, prev) => {
        const user = await getUser(ctx);
        return {
          ...updates,
          updatedBy: user.id,
          updatedAt: Date.now(),
        };
      },
    },
  },
});
```

### Side Effect Hooks (on*)

Run **after** operations for logging, notifications, or cascading updates.

```typescript
const c = crane(components.crane)({
  blueprints: {
    hooks: {
      onInsert: async (ctx, doc) => {
        await audit.log(ctx, 'blueprint.created', doc);
      },
      onUpdate: async (ctx, doc, prev) => {
        await audit.log(ctx, 'blueprint.updated', { id: doc.id, changes: diff(prev, doc) });
      },
      // Now receives full document (not just ID) for cleanup tasks
      onRemove: async (ctx, doc) => {
        await audit.log(ctx, 'blueprint.deleted', doc);
        await cleanupRelatedData(ctx, doc.id);
      },
    },
  },
});
```

### Error Hooks

Centralized error logging for all operations.

```typescript
const c = crane(components.crane)({
  blueprints: {
    hooks: {
      // Called when any operation fails
      onError: async (ctx, error, operation) => {
        await errorTracker.log(ctx, {
          resource: 'blueprints',
          operation, // 'get', 'list', 'create', 'update', 'remove'
          error: error.message,
          stack: error.stack,
        });
      },
    },
  },
});
```

### Transform Hook

Modify results before returning to the caller.

```typescript
const c = crane(components.crane)({
  blueprints: {
    hooks: {
      transform: (docs) => docs.map(doc => ({
        ...doc,
        // Add computed field
        tileCount: doc.tiles.length,
      })),
    },
  },
});
```

### Resource-Specific Hooks

| Resource | Additional Hooks |
|----------|-----------------|
| `executions` | `onStart`, `onComplete`, `onCancel` |
| `vault` | `onSetup`, `onUnlock`, `onEnable` |
| `credentials` | `onResolve` |

### Complete Hooks Reference

| Hook | Signature | When Called |
|------|-----------|-------------|
| `evalRead` | `(ctx, organizationId) => void` | Before reads |
| `evalWrite` | `(ctx, doc) => void` | Before writes |
| `evalRemove` | `(ctx, doc) => void` | Before removes (receives full doc) |
| `beforeUpdate` | `(ctx, updates, prev) => updates` | Before update applied |
| `onInsert` | `(ctx, doc) => void` | After insert |
| `onUpdate` | `(ctx, doc, prev) => void` | After update |
| `onRemove` | `(ctx, doc) => void` | After remove (receives full doc) |
| `onError` | `(ctx, error, operation) => void` | When operation fails |
| `transform` | `(docs) => docs` | Before returning results |

## Execution Modes

Configure how blueprints are executed:

### HTTP Mode

Call an external endpoint to run the blueprint:

```typescript
const c = crane(components.crane)({
  execution: {
    mode: 'http',
    endpoint: 'https://your-worker.example.com/execute',
  },
});
```

### Runner Mode

Execute directly with a custom function:

```typescript
const c = crane(components.crane)({
  execution: {
    mode: 'runner',
    run: async (ctx, blueprint, variables) => {
      // Your execution logic
      const adapter = await createAdapter();
      try {
        const outputs = await runBlueprint(adapter, blueprint, variables);
        return { success: true, duration: Date.now() - start, outputs };
      } finally {
        await adapter.close();
      }
    },
  },
});
```

### Workflow Mode

Durable execution using Convex workflows with automatic retry:

```typescript
const c = crane(components.crane)({
  execution: {
    mode: 'workflow',
    workflowFn: internal.workflows.execute,
    onComplete: internal.workflows.complete,
    retryConfig: {
      maxAttempts: 3,
      initialBackoffMs: 1000,
      base: 2, // exponential backoff multiplier
    },
    maxParallelism: 1,
  },
});

// Access workflow executor
const { workflowId } = await c.execute(ctx, { blueprintId, variables });
const status = await c.workflow.status(ctx, workflowId);
await c.workflow.cancel(ctx, workflowId);
```

## Client API

Build blueprints with a fluent API:

```typescript
import { blueprint, vault } from '@trestleinc/crane/client';

// Create a blueprint
const submitIntake = blueprint
  .create('submit-intake')
  .describe('Submit beneficiary intake form')
  .input('portalUrl', 'string', true)
  .input('firstName', 'string', true)
  .input('lastName', 'string', true)
  .navigate('{{portalUrl}}')
  .auth()
  .type('first name field', { variable: 'firstName' })
  .type('last name field', { variable: 'lastName' })
  .click('submit button')
  .screenshot()
  .extract('confirmation number', 'confirmationNumber')
  .tag('intake', 'beneficiary')
  .build();

// Save to database
await ctx.runMutation(c.blueprints.create, {
  organizationId: org.id,
  ...submitIntake,
});
```

### Vault Operations

```typescript
import { vault } from '@trestleinc/crane/client';

// Setup vault for organization
const setupData = await vault.setup('master-password');
await ctx.runMutation(c.vault.setup, {
  organizationId: org.id,
  ...setupData,
});

// Unlock vault
const vaultData = await ctx.runQuery(c.vault.get, { organizationId: org.id });
const vaultKey = await vault.unlock('master-password', vaultData);

// Encrypt and save credential
const encrypted = await vault.credential.encrypt(vaultKey, {
  username: 'user@example.com',
  password: 'secret123',
});
await ctx.runMutation(c.credentials.create, {
  organizationId: org.id,
  name: 'Portal Login',
  domain: 'portal.example.com',
  encryptedPayload: encrypted.ciphertext,
  payloadIv: encrypted.iv,
});
```

## Server API

Execute blueprints with your adapter implementation:

```typescript
import { crane } from '@trestleinc/crane/server';
import type { Adapter, AdapterFactory } from '@trestleinc/crane/server';
import { Stagehand } from '@browserbasehq/stagehand';

// Create adapter factory
const createAdapter: AdapterFactory = async ({ blueprintId, contextId }) => {
  const stagehand = new Stagehand({
    env: 'BROWSERBASE',
    browserbaseSessionCreateParams: {
      projectId: process.env.BROWSERBASE_PROJECT_ID,
      browserSettings: contextId
        ? { context: { id: contextId, persist: true } }
        : undefined,
    },
  });
  await stagehand.init();

  return {
    navigate: (url, opts) => stagehand.page.goto(url, opts),
    act: (instruction) => stagehand.act(instruction),
    extract: (instruction, schema) => stagehand.extract(instruction, { schema }),
    screenshot: (opts) => stagehand.page.screenshot(opts),
    currentUrl: () => Promise.resolve(stagehand.page.url()),
    close: () => stagehand.close(),
  };
};

// Execute blueprint
const result = await c.execute(ctx, {
  blueprintId: 'bp_123',
  variables: {
    portalUrl: 'https://portal.example.com',
    firstName: 'John',
    lastName: 'Doe',
  },
  adapter: createAdapter,
  credentials: async (domain) => {
    const cred = await ctx.runQuery(c.credentials.resolve, {
      organizationId: org.id,
      domain,
    });
    if (!cred) return null;
    return vault.credential.decrypt(vaultKey, {
      ciphertext: cred.encryptedPayload,
      iv: cred.payloadIv,
    });
  },
});

console.log(result);
// { success: true, duration: 12500, outputs: { confirmationNumber: 'ABC123' } }
```

## Resource API Reference

### blueprints

| Method | Args | Returns |
|--------|------|---------|
| `get` | `{ id }` | Blueprint or null |
| `list` | `{ organizationId, limit? }` | Blueprint[] |
| `create` | `{ organizationId, name, description?, tiles, metadata? }` | `{ id }` |
| `update` | `{ id, name?, description?, tiles?, metadata? }` | `{ id }` |
| `remove` | `{ id }` | `{ removed: boolean }` |

### executions

| Method | Args | Returns |
|--------|------|---------|
| `get` | `{ id }` | Execution or null |
| `list` | `{ organizationId, blueprintId?, status?, limit? }` | Execution[] |
| `create` | `{ blueprintId, organizationId, variables, context?, workflowId? }` | `{ id }` |
| `start` | `{ id }` | `{ started: boolean }` |
| `complete` | `{ id, result }` | `{ completed: boolean }` |
| `cancel` | `{ id, reason? }` | `{ cancelled: boolean }` |

### credentials

| Method | Args | Returns |
|--------|------|---------|
| `get` | `{ id }` | Credential or null |
| `list` | `{ organizationId, limit? }` | Credential[] |
| `create` | `{ organizationId, name, domain, encryptedPayload, payloadIv }` | `{ id }` |
| `update` | `{ id, name?, domain?, encryptedPayload?, payloadIv? }` | `{ id }` |
| `remove` | `{ id }` | `{ removed: boolean }` |
| `resolve` | `{ organizationId, domain }` | Credential or null |

### vault

| Method | Args | Returns |
|--------|------|---------|
| `get` | `{ organizationId }` | Vault or null |
| `setup` | `{ organizationId, salt, iterations, encryptedVaultKey, vaultKeyIv, verificationHash }` | null |
| `unlock` | `{ organizationId }` | Vault or null |
| `enable` | `{ organizationId, encryptedMachineKey, machineKeyIv, workosM2MClientId? }` | null |
| `context` | `{ organizationId, browserbaseContextId }` | null |

## Workflow Integration

For durable execution with automatic retry and status tracking:

```typescript
import { createWorkflowExecutor, workflowArgs, tileStepArgs } from '@trestleinc/crane/server';

// Create executor
const executor = createWorkflowExecutor({
  workflowComponent: components.crane.workflow,
  retryConfig: {
    maxAttempts: 3,
    initialBackoffMs: 1000,
    base: 2,
  },
  maxParallelism: 1,
});

// Start workflow
const workflowId = await executor.manager.start(ctx, options);

// Check status
const status = await executor.status(ctx, workflowId);
// { type: 'running' | 'completed' | 'failed' | 'canceled', workflowId, error? }

// Cancel workflow
await executor.cancel(ctx, workflowId);

// Cleanup after completion
await executor.cleanup(ctx, workflowId);
```

## Error Handling

Crane provides custom error types for structured error handling:

```typescript
import {
  CraneError,           // Base class for all Crane errors
  NotFoundError,        // Resource not found (includes resource type + ID)
  ValidationError,      // Validation failed (includes message)
  AuthorizationError,   // Authorization denied (includes message)
} from '@trestleinc/crane/server';

// Usage in hooks
evalRemove: async (ctx, doc) => {
  const user = await getUser(ctx);
  if (!user.isAdmin) {
    throw new AuthorizationError('Only admins can delete blueprints');
  }
};

// Handling errors
try {
  await ctx.runMutation(c.blueprints.remove, { id });
} catch (error) {
  if (error instanceof NotFoundError) {
    console.log(`Resource ${error.code}: ${error.message}`);
  } else if (error instanceof AuthorizationError) {
    console.log(`Auth failed: ${error.message}`);
  }
}
```

All errors extend `CraneError` which includes a `code` property for programmatic handling.

## Type Exports

### Server (`@trestleinc/crane/server`)

```typescript
// Factory
crane(component)                    // Create crane instance with options

// Component API type (type-safe, no more `any`)
CraneComponentApi                   // Shape of Crane component's public API

// Options types
CraneOptions                        // Full configuration object
ResourceOptions<T>                  // { hooks?: ResourceHooks<T> }
ExecutionOptions<T>                 // { hooks?: ExecutionHooks<T> }
CredentialOptions<T>                // { hooks?: CredentialHooks<T> }
VaultOptions<T>                     // { hooks?: VaultHooks<T> }

// Hook types (with new hooks)
ResourceHooks<T>                    // evalRead, evalWrite, evalRemove(doc), beforeUpdate, onInsert, onUpdate, onRemove(doc), onError, transform
ExecutionHooks<T>                   // ResourceHooks + onStart, onComplete, onCancel
CredentialHooks<T>                  // ResourceHooks + onResolve
VaultHooks<T>                       // ResourceHooks + onSetup, onUnlock, onEnable

// Error types
CraneError                          // Base error class with code property
NotFoundError                       // Resource not found
ValidationError                     // Validation failed
AuthorizationError                  // Authorization denied

// Execution types
Adapter                             // Browser adapter interface
AdapterFactory                      // Factory function for adapters
CredentialResolver                  // Function to resolve credentials by domain
ExecuteOptions                      // Options for c.execute()
ExecutionResult                     // Result of blueprint execution
TileResult                          // Result of individual tile execution

// Workflow types
WorkflowExecutorConfig              // Configuration for workflow executor
WorkflowExecuteOptions              // Options for workflow execution
WorkflowStatus                      // Status of a workflow
WorkflowId                          // Workflow identifier

// Compiler types
CompileOptions                      // Options for compiling blueprints
CompiledBlueprint                   // Result of blueprint compilation

// Utilities
createWorkflowExecutor              // Create durable workflow executor
sortTiles                           // Sort tiles by connection order
interpolate                         // Template string interpolation
workflowArgs                        // Convex validators for workflow args
tileStepArgs                        // Convex validators for tile step args
compile                             // Compile blueprint to executable code
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

// Error types (Effect-based)
NetworkError                        // Network failures with retry info
AuthorizationError                  // Auth failures with org context
NotFoundError                       // Entity not found with type
ValidationError                     // Validation errors with field info
VaultUnlockError                    // Vault unlock failures
CredentialNotFoundError             // Credential lookup failures
NonRetriableError                   // Errors that should not be retried
```

## Technology Stack

- **[Convex](https://convex.dev)** - Database and serverless functions
- **[Stagehand](https://github.com/browserbase/stagehand)** - AI-powered browser automation
- **[Browserbase](https://browserbase.com)** - Cloud browser infrastructure
- **[WorkOS](https://workos.com)** - M2M authentication for automated execution
- **Web Crypto API** - Client-side credential encryption (AES-256-GCM)

## License

Apache-2.0
