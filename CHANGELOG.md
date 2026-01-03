# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-01-02

Major refactoring release with breaking changes, new features, and improved type safety.

### Breaking Changes

- **API Pattern Change**: Migrated from namespaced `c.api.blueprint.*` to direct `c.blueprints.*` pattern
  - `c.api.blueprint.*` → `c.blueprints.*`
  - `c.api.execution.*` → `c.executions.*`
  - `c.api.credential.*` → `c.credentials.*`
  - `c.api.vault.*` → `c.vault.*`
- **`evalRemove` hook now receives full document** instead of just ID for better authorization context
- **`onRemove` hook now receives full document** instead of just ID for cleanup tasks
- **Factory pattern requires options**: `crane(component)(options)` instead of `crane(component)()`

### Added

- **`beforeUpdate` hook**: Modify updates before they're applied to the database
  ```typescript
  beforeUpdate: async (ctx, updates, prev) => ({
    ...updates,
    updatedBy: currentUserId,
  })
  ```
- **`onError` hook**: Centralized error logging for all operations
  ```typescript
  onError: async (ctx, error, operation) => {
    await logError(ctx, `blueprints.${operation}`, error);
  }
  ```
- **Type-safe `CraneComponentApi` type**: Replaces `any` for component API typing
- **Custom error classes** with structured error codes:
  - `CraneError` - Base class with `code` property
  - `NotFoundError` - Resource not found (includes resource type + ID)
  - `ValidationError` - Validation failed
  - `AuthorizationError` - Authorization denied
- **Three execution modes**:
  - `http` - External HTTP endpoint execution
  - `runner` - Custom function execution
  - `workflow` - Durable Convex workflow with retry
- **Workflow integration** with retry configuration and cancellation support
- **Blueprint compiler** (`compile()`) for converting blueprints to executable code

### Improved

- **Performance**: Mutations now return full documents internally, enabling hooks to access complete data
- **Type safety**: All hook types properly typed with generic constraints
- **Error handling**: Structured errors with codes for programmatic handling
- **Documentation**: Complete API reference in README.md and AGENTS.md

### Migration Guide

```typescript
// Before (v1.x)
const c = crane(components.crane)();
await ctx.runQuery(c.api.blueprint.get, { id });
await ctx.runMutation(c.api.credential.create, args);

// After (v2.x)
const c = crane(components.crane)({
  blueprints: { hooks: { /* ... */ } },
});
await ctx.runQuery(c.blueprints.get, { id });
await ctx.runMutation(c.credentials.create, args);
```

Update your hooks if you were using `evalRemove` or `onRemove`:

```typescript
// Before (v1.x)
evalRemove: async (ctx, id) => { /* ... */ }
onRemove: async (ctx, id) => { /* ... */ }

// After (v2.x) - now receives full document
evalRemove: async (ctx, doc) => { /* doc.id, doc.organizationId available */ }
onRemove: async (ctx, doc) => { /* full document for cleanup */ }
```

## [0.0.1] - 2025-12-17

Initial release of @trestleinc/crane.

### Added

- **Blueprints** - Automation workflow definitions
  - Tile-based sequence builder
  - Tile types: NAVIGATE, CLICK, TYPE, EXTRACT, SCREENSHOT, WAIT, SELECT, FORM, AUTH
  - Template variable interpolation (`{{variable}}` syntax)
  - Metadata with tags and input schemas
- **Executions** - Blueprint run tracking
  - Status tracking: pending, running, completed, failed, cancelled
  - Variable storage and result capture
  - Artifact storage for screenshots
- **Vaults** - Zero-knowledge credential storage
  - Client-side encryption with AES-256-GCM
  - Organization-scoped vault setup
  - WorkOS M2M authentication support
- **Credentials** - Encrypted credential management
  - Domain-based lookup for AUTH tiles
  - Encrypted payload storage
- **Namespaced API** (`c.api.*`)
  - `blueprint.{get, list, create, update, remove}`
  - `execution.{get, list, create, start, complete, cancel}`
  - `vault.{get, setup, unlock, enable, context}`
  - `credential.{get, list, create, update, remove, resolve}`
- **Client utilities**
  - Fluent blueprint builder
  - Vault setup and unlock
  - Credential encryption/decryption
- **Server hooks** for authorization and side effects
