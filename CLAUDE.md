# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important: Always Use Context7 for Library Documentation

**CRITICAL**: When looking up documentation for any library (Convex, Stagehand, jose, etc.), ALWAYS use the Context7 MCP tool. NEVER use WebSearch for library documentation.

**Usage pattern:**
1. First resolve the library ID: `mcp__context7__resolve-library-id` with library name
2. Then fetch docs: `mcp__context7__get-library-docs` with the resolved ID and topic

## Project Overview

**Crane** (`@trestleinc/crane`) - Browser automation engine with integrated credential vault.

Single package with exports:
- `@trestleinc/crane` - Shared types and validators
- `@trestleinc/crane/client` - Blueprint builder, vault operations, client errors
- `@trestleinc/crane/server` - crane() factory, hooks, errors, Adapter types
- `@trestleinc/crane/convex.config` - Component configuration

## Development Commands

```bash
# Build (includes type checking via tsdown)
bun run build        # Build with tsdown (outputs to dist/)
bun run clean        # Remove dist/

# Lint & Format
bun run check:fix    # Biome lint and format

# Publishing
bun run prepublish   # Runs build
```

## Architecture

### Package Structure
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

### Core Concepts

**Data Model:**
- **Blueprints** - Tile sequences with metadata and input schemas
- **Executions** - Run history with status, outputs, and artifacts
- **Vaults** - Organization encryption settings (zero-knowledge)
- **Credentials** - Encrypted credential storage (domain-based lookup)

**Data Flow:**
```
Blueprint definitions -> Execution triggered -> Tiles run via Adapter -> Results + Artifacts stored
```

## Public API Surface

### Server (`@trestleinc/crane/server`)

```typescript
// Factory (Replicate-inspired pattern)
import { crane, AuthorizationError, NotFoundError, ValidationError } from '@trestleinc/crane/server';
import type { CraneComponentApi, CraneOptions, ResourceHooks } from '@trestleinc/crane/server';

const c = crane(components.crane)({
  blueprints: {
    hooks: {
      evalRead: async (ctx, orgId) => { /* auth check */ },
      evalWrite: async (ctx, doc) => { /* auth check */ },
      evalRemove: async (ctx, doc) => { /* receives full doc */ },
      beforeUpdate: async (ctx, updates, prev) => updates, // modify before apply
      onInsert: async (ctx, doc) => { /* side effect */ },
      onUpdate: async (ctx, doc, prev) => { /* side effect */ },
      onRemove: async (ctx, doc) => { /* receives full doc */ },
      onError: async (ctx, error, operation) => { /* logging */ },
      transform: async (docs) => docs,
    }
  },
  executions: {
    hooks: {
      onStart: async (ctx, exec) => {},
      onComplete: async (ctx, exec) => {},
      onCancel: async (ctx, exec) => {},
    }
  },
  execution: {
    mode: 'workflow', // or 'http' or 'runner'
    workflowFn: internal.workflows.execute,
    retryConfig: { maxAttempts: 3, initialBackoffMs: 1000 },
  },
});
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
```

### Client (`@trestleinc/crane/client`)
```typescript
// Blueprint builder (fluent API)
blueprint.create(name)
  .input(name, type, required)
  .navigate(url)
  .auth()
  .type(instruction, options)
  .click(instruction)
  .screenshot(options?)
  .extract(instruction, outputVar, schema?)
  .wait(ms)
  .select(instruction, value)
  .form(fields)
  .build()

// Vault operations
vault.setup(masterPassword)
vault.unlock(masterPassword, vaultData)
vault.credential.encrypt(key, fields)
vault.credential.decrypt(key, encrypted)

// Error types (Effect-based)
NetworkError, AuthorizationError, NotFoundError, ValidationError, NonRetriableError
```

### Shared (`@trestleinc/crane`)
```typescript
// Types
Blueprint, Tile, TileType
Execution, ExecutionStatus
Vault
Credential, CredentialField

// Validators
tileTypeValidator, executionStatusValidator
```

## Key Patterns

### Server: crane Factory with Hooks
```typescript
// convex/crane.ts
import { crane, AuthorizationError } from '@trestleinc/crane/server';
import { components } from './_generated/api';

export const c = crane(components.crane)({
  blueprints: {
    hooks: {
      evalRead: async (ctx, organizationId) => {
        const user = await getUser(ctx);
        if (!user.canAccessOrg(organizationId)) {
          throw new AuthorizationError('Access denied');
        }
      },
      beforeUpdate: async (ctx, updates, prev) => ({
        ...updates,
        updatedAt: Date.now(),
      }),
      onError: async (ctx, error, operation) => {
        await logError(ctx, `blueprints.${operation}`, error);
      },
    },
  },
});
```

### Using the Crane API (v2.x Pattern)
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

export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    // Returns { removed: boolean }
    return ctx.runMutation(c.blueprints.remove, { id });
  },
});
```

### Adapter Pattern (App Provides)
```typescript
import type { AdapterFactory } from '@trestleinc/crane/server';
import { Stagehand } from '@browserbasehq/stagehand';

export const createAdapter: AdapterFactory = async ({ blueprintId, contextId }) => {
  const stagehand = new Stagehand({
    env: 'BROWSERBASE',
    browserbaseSessionCreateParams: {
      projectId: process.env.BROWSERBASE_PROJECT_ID,
      browserSettings: contextId ? { context: { id: contextId, persist: true } } : undefined,
    },
  });
  await stagehand.init();

  return {
    navigate: (url) => stagehand.page.goto(url),
    act: (instruction) => stagehand.act(instruction),
    extract: (instruction, schema) => stagehand.extract(instruction, { schema }),
    screenshot: (opts) => stagehand.page.screenshot(opts),
    currentUrl: () => Promise.resolve(stagehand.page.url()),
    close: () => stagehand.close(),
  };
};
```

## Error Handling

```typescript
import {
  CraneError,           // Base class with code property
  NotFoundError,        // new NotFoundError('Blueprint', id)
  ValidationError,      // new ValidationError('message')
  AuthorizationError,   // new AuthorizationError('message')
} from '@trestleinc/crane/server';

// In hooks
evalRemove: async (ctx, doc) => {
  if (!canDelete(doc)) {
    throw new AuthorizationError('Cannot delete this blueprint');
  }
};

// In handlers
try {
  await ctx.runMutation(c.blueprints.remove, { id });
} catch (error) {
  if (error instanceof NotFoundError) {
    // error.code === 'NOT_FOUND'
  }
}
```

## Technology Stack

- **TypeScript** (strict mode)
- **Effect** for dependency injection (in client errors)
- **Convex** for backend (cloud database + functions)
- **Stagehand** for browser automation (peer dependency, app provides)
- **jose** for JWT verification (WorkOS M2M)
- **tsdown** for building
- **Biome** for linting and formatting
- **LogTape** for logging (avoid console.*)

## Naming Conventions

- **Public API**: `crane()` factory, direct resource access `c.blueprints.*`
- **Error classes**: Short names with "Error" suffix (`NotFoundError`, `ValidationError`)
- **Types not classes**: Use `type` for Adapter, AdapterFactory, CredentialResolver - NOT interfaces
- **Hook naming**: `eval*` for auth, `before*` for mutation modification, `on*` for side effects

## Important Notes

- **bun for commands** - Use `bun run` for all commands
- **Organization-scoped** - All data is scoped by `organizationId`
- **Functional API** - NO classes. Use factory functions returning objects with methods
- **App provides Adapter** - Crane defines the Adapter type, app implements it
- **Hooks receive full docs** - `evalRemove` and `onRemove` now receive full document (not just ID)
- **beforeUpdate hook** - Returns modified updates to apply
- **onError hook** - Centralized error logging for all operations
- **LogTape logging** - Use LogTape, not console.*
- **Import types** - Use `import type` for type-only imports
