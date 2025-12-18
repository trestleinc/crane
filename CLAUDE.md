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
- `@trestleinc/crane/client` - Blueprint builder, vault operations
- `@trestleinc/crane/server` - crane() factory, Adapter types
- `@trestleinc/crane/convex.config` - Component configuration

## Development Commands

```bash
# Build
bun run build        # Build with Rslib (outputs to dist/)
bun run clean        # Remove dist/

# Code Quality (Biome v2)
bun run check        # Lint + format check (dry run)
bun run check:fix    # Auto-fix all issues (ALWAYS run before committing)

# Testing
bun test             # Run all tests with Vitest
bun test <path>      # Run specific test file

# Publishing
bun run prepublish   # Build + check:fix (runs before npm publish)
```

## Architecture

### Package Structure
```
src/
├── client/                  # Client-side utilities
│   ├── index.ts             # Public exports
│   ├── blueprint.ts         # Fluent blueprint builder
│   ├── vault.ts             # Vault and credential operations
│   ├── errors.ts            # Error classes
│   └── logger.ts            # LogTape logger
├── server/                  # Server-side (Convex functions)
│   ├── index.ts             # Public exports
│   ├── builder.ts           # crane() factory
│   ├── types.ts             # Adapter, AdapterFactory, CredentialResolver
│   └── tiles.ts             # Tile execution functions
├── component/               # Internal Convex component
│   ├── convex.config.ts     # Component config
│   ├── schema.ts            # Database schema (blueprints, executions, vaults, credentials)
│   ├── public.ts            # Component API (blueprint.*, execution.*, vault.*, credential.*)
│   └── logger.ts            # Component logging
├── shared/                  # Shared types (all environments)
│   ├── index.ts             # Re-exports
│   ├── types.ts             # Blueprint, Tile, Execution, Vault, Credential
│   └── validators.ts        # Convex validators for all types
└── env.d.ts                 # Environment type declarations
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
vault.setup(masterPassword, ctx)
vault.unlock(masterPassword, vaultData)
vault.credential.save(key, credential, ctx)
vault.credential.encrypt(key, fields)
vault.credential.decrypt(key, encrypted)

// Error types
NetworkError, AuthorizationError, NotFoundError, ValidationError, NonRetriableError
```

### Server (`@trestleinc/crane/server`)
```typescript
crane(component)              // Factory to create crane instance

// Types
Adapter                       // Browser adapter object with functions
AdapterFactory                // Factory function app provides
CredentialResolver            // Function to resolve credentials by domain
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

### Component API (via `c.api`)
```typescript
blueprint.get, blueprint.list, blueprint.create, blueprint.update, blueprint.remove
execution.get, execution.list, execution.start, execution.cancel, execution.complete
vault.get, vault.setup, vault.unlock, vault.enable
credential.get, credential.list, credential.create, credential.update, credential.remove, credential.resolve
```

### Crane Methods
```typescript
c.execute(ctx, options)       // Run blueprint with adapter
c.vault.m2m.token()           // Get WorkOS M2M token
c.vault.m2m.verify(token)     // Verify M2M token
c.vault.key(vault)            // Derive vault key
```

## Key Patterns

### Server: crane Factory
```typescript
// convex/crane.ts (create once)
import { crane } from '@trestleinc/crane/server';
import { components } from './_generated/api';

export const c = crane(components.crane);
```

### Using the Crane API
```typescript
// convex/blueprints.ts
import { query, mutation, action } from './_generated/server';
import { v } from 'convex/values';
import { c } from './crane';

export const list = query({
  args: { organizationId: v.string() },
  handler: async (ctx, { organizationId }) => {
    return ctx.runQuery(c.api.blueprint.list, { organizationId });
  },
});

export const run = action({
  args: { blueprintId: v.string(), variables: v.any() },
  handler: async (ctx, { blueprintId, variables }) => {
    return c.execute(ctx, {
      blueprintId,
      variables,
      adapter: createAdapter,      // App-provided
      credentials: credResolver,    // App-provided
    });
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
    modelName: 'google/gemini-2.5-flash',
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

## Technology Stack

- **TypeScript** (strict mode)
- **Effect** for dependency injection (in dependencies)
- **Convex** for backend (cloud database + functions)
- **Stagehand 3** for browser automation (peer dependency, app provides)
- **jose** for JWT verification (WorkOS M2M)
- **Rslib** for building
- **Biome** for linting/formatting
- **LogTape** for logging (avoid console.*)

## Naming Conventions

- **Public API**: Single-word function names (`crane()`, `get`, `list`, `create`)
- **Namespaced exports**: `blueprint.get`, `execution.start`, `vault.setup`, `credential.resolve`
- **Error classes**: Short names with "Error" suffix (`NetworkError`, `ValidationError`)
- **Types not classes**: Use `type` for Adapter, AdapterFactory, CredentialResolver - NOT interfaces

## Important Notes

- **Biome config** - `noExplicitAny` OFF, `noConsole` warns (except in test files and component logger)
- **LogTape logging** - Use LogTape, not console.* (Biome warns on console)
- **Import types** - Use `import type` for type-only imports (Biome enforces this)
- **bun for commands** - Use `bun run` not `pnpm run` for all commands
- **Organization-scoped** - All data is scoped by `organizationId`
- **Functional API** - NO classes. Use factory functions returning objects with methods
- **App provides Adapter** - Crane defines the Adapter type, app implements it
