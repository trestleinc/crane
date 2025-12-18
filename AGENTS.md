# AGENTS.md - Development Guide

## Commands
- **Build:** `bun run build` (uses Rslib, outputs to `dist/`)
- **Test:** `bun test` (Vitest). Run single: `bun test src/path/to/test.ts`
- **Lint & Format:** `bun run check:fix` (Biome) - **ALWAYS RUN BEFORE COMMITTING**
- **Type Check:** Build includes type checking via Rslib

## Code Style & Conventions
- **Formatting:** 2 spaces, single quotes, semicolons (enforced by Biome).
- **Imports:** Use `import type` for types. Use `node:` protocol for Node built-ins.
- **Logging:** Use `LogTape`. Avoid `console.*` (warns in Biome, allowed in tests).
- **Structure:** Single package. `src/client` (browser), `src/server` (Convex), `src/component`.
- **Documentation:** ALWAYS use `Context7` tool for library docs (Convex, Stagehand, jose).
- **Scoping:** All data is scoped by `organizationId`.
- **No Classes:** Use factory functions and type aliases. NOT interfaces for class implementations.

## Public API

### Server (`@trestleinc/crane/server`)
```typescript
crane(component)              // Factory to create crane instance

// Types (app implements)
Adapter                       // Browser adapter object
AdapterFactory                // Factory function for adapters
CredentialResolver            // Function to resolve credentials by domain
```

### Crane Methods
```typescript
c.execute(ctx, options)       // Run blueprint with adapter
c.vault.m2m.token()           // Get WorkOS M2M token
c.vault.m2m.verify(token)     // Verify M2M token
c.vault.key(vault)            // Derive vault key
```

### Client (`@trestleinc/crane/client`)
```typescript
// Blueprint builder (fluent API)
blueprint.create(name).navigate(url).auth().type(instruction, opts).click(instruction).build()

// Vault operations
vault.setup(password, ctx)
vault.unlock(password, vaultData)
vault.credential.save(key, credential, ctx)
vault.credential.encrypt(key, fields)
vault.credential.decrypt(key, encrypted)

// Error types
NetworkError, AuthorizationError, NotFoundError, ValidationError, NonRetriableError
```

### Component API (via `c.api`)
```typescript
blueprint.get, blueprint.list, blueprint.create, blueprint.update, blueprint.remove
execution.get, execution.list, execution.start, execution.cancel, execution.complete
vault.get, vault.setup, vault.unlock, vault.enable
credential.get, credential.list, credential.create, credential.update, credential.remove, credential.resolve
```

## Critical Rules (from CLAUDE.md)
- NEVER use WebSearch for library documentation; use Context7.
- Use `bun` for all commands.
- Namespaced API pattern: `blueprint.get`, `execution.start`, `vault.setup`, `credential.resolve`.
- NO CLASSES - Use functional patterns with type aliases.
- App provides Adapter implementation - Crane defines the type.
