# Validation & Type Philosophy

> Canonical reference for Trestle's Convex projects (crane, bridge, ledger)

This document establishes a unified approach to validation and type safety that balances Convex-native patterns with maximum type safety.

---

## Table of Contents

- [Philosophy Overview](#philosophy-overview)
- [The Four Layers](#the-four-layers)
  - [Layer 1: Convex Native Validators](#layer-1-convex-native-validators-foundation)
  - [Layer 2: convex-helpers Utilities](#layer-2-convex-helpers-utilities-ergonomics)
  - [Layer 3: Branded Types](#layer-3-branded-types-compile-time-safety)
  - [Layer 4: Effect.ts for Client Errors](#layer-4-effectts-for-client-errors)
- [File Structure](#file-structure)
- [Decision Matrix](#decision-matrix)
- [Anti-Patterns to Avoid](#anti-patterns-to-avoid)

---

## Philosophy Overview

### Convex-Native First

Convex provides built-in validators (`v.*` from `convex/values`) that offer:
- **Zero bundle size overhead** - validators are stripped at build time
- **Runtime type checking** - automatic validation at function boundaries
- **TypeScript inference** - use `Infer<typeof validator>` for type derivation

### Single Source of Truth

All validators and types live in **one file**: `shared/validators.ts`. Types are derived from validators using `Infer<typeof validator>` - no duplicate interfaces.

### Layered Validation Strategy

| Layer | Purpose | Bundle Impact | When to Use |
|-------|---------|---------------|-------------|
| 1. Convex Validators | Runtime validation | Zero | Always for Convex functions |
| 2. convex-helpers | Ergonomic utilities | Minimal | Cleaner syntax, common patterns |
| 3. Branded Types | Compile-time safety | Zero | ID type safety, domain modeling |
| 4. Effect.ts | Structured errors | Client only | Client-side error handling |

### Why NOT Zod for Convex Functions

```typescript
// DON'T: Zod in Convex function definitions
import { z } from 'zod';
const schema = z.object({ name: z.string() });

export const create = mutation({
  args: { data: v.any() },
  handler: async (ctx, { data }) => {
    const parsed = schema.parse(data); // Bundle bloat + redundant validation
  },
});

// DO: Use Convex validators directly
export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    // Already validated by Convex runtime
  },
});
```

**Reasons to avoid Zod in Convex:**
- Adds ~12KB to bundle for functionality Convex provides natively
- Double validation (Convex validates args, then Zod validates again)
- Type inference requires manual alignment

**When Zod IS appropriate:**
- React form validation (client-side only)
- External API response validation
- Complex cross-field validation not expressible with Convex validators

---

## The Four Layers

### Layer 1: Convex Native Validators (Foundation)

Use `v.*` from `convex/values` as the foundation. Types are derived using `Infer<typeof validator>`.

#### Pattern: Validator → Inferred Type

```typescript
// shared/validators.ts

import { type Infer, v } from 'convex/values';

// 1. Define Convex validator
export const tileTypeValidator = v.union(
  v.literal('NAVIGATE'),
  v.literal('CLICK'),
  v.literal('TYPE'),
  v.literal('EXTRACT'),
  v.literal('SCREENSHOT'),
  v.literal('WAIT'),
  v.literal('SELECT'),
  v.literal('FORM'),
  v.literal('AUTH'),
);

// 2. Derive TypeScript type from validator
export type TileType = Infer<typeof tileTypeValidator>;
// Result: 'NAVIGATE' | 'CLICK' | 'TYPE' | 'EXTRACT' | 'SCREENSHOT' | 'WAIT' | 'SELECT' | 'FORM' | 'AUTH'
```

#### Complex Validators

```typescript
// Nested object validator
export const tileValidator = v.object({
  id: v.string(),
  type: tileTypeValidator,
  label: v.string(),
  description: v.optional(v.string()),
  position: v.object({ x: v.number(), y: v.number() }),
  parameters: v.record(v.string(), v.any()),
  connections: v.object({
    input: v.union(v.string(), v.null()),
    output: v.union(v.string(), v.null()),
  }),
});

// Derive type from validator - full type hinting, no duplicate interface
export type Tile = Infer<typeof tileValidator>;
```

#### Document Validators

```typescript
// Full document validator (matches database schema)
export const blueprintDocValidator = v.object({
  id: v.string(),
  organizationId: v.string(),
  name: v.string(),
  description: v.optional(v.string()),
  tiles: v.array(tileValidator),
  metadata: metadataValidator,
  createdAt: v.number(),
  updatedAt: v.number(),
});

// Derive type
export type Blueprint = Infer<typeof blueprintDocValidator>;

// Use in queries
export const get = query({
  args: { id: v.string() },
  returns: v.union(blueprintDocValidator, v.null()),
  handler: async (ctx, { id }) => {
    return ctx.db.query('blueprints')
      .withIndex('by_uuid', q => q.eq('id', id))
      .unique();
  },
});
```

---

### Layer 2: convex-helpers Utilities (Ergonomics)

The `convex-helpers` package provides utilities that make validators more ergonomic.

#### Installation

```bash
bun add convex-helpers
```

#### Key Utilities

##### `literals()` - Cleaner Union of Literals

```typescript
import { literals } from 'convex-helpers/validators';

// Verbose native approach
const statusValidator = v.union(
  v.literal('pending'),
  v.literal('running'),
  v.literal('completed'),
  v.literal('failed'),
  v.literal('cancelled'),
);

// Cleaner with literals()
const statusValidator = literals('pending', 'running', 'completed', 'failed', 'cancelled');
```

##### `nullable()` - Value or Null

```typescript
import { nullable } from 'convex-helpers/validators';

// Verbose
const field = v.union(v.string(), v.null());

// Cleaner
const field = nullable(v.string());
```

##### `partial()` - All Fields Optional

```typescript
import { partial } from 'convex-helpers/validators';

const updateArgs = partial(v.object({
  name: v.string(),
  description: v.string(),
  tiles: v.array(tileValidator),
}));
// All fields become optional
```

---

### Layer 3: Branded Types (Compile-Time Safety)

Branded types add compile-time type safety for IDs without runtime overhead.

#### The Problem

```typescript
// Without branded types, all IDs are just strings
function deleteBlueprint(blueprintId: string) { ... }
function deleteExecution(executionId: string) { ... }

// Easy to mix up!
deleteBlueprint(executionId); // Compiles but wrong!
```

#### The Solution

```typescript
// shared/validators.ts

// Declare unique symbols (compile-time only)
declare const BLUEPRINT_ID: unique symbol;
declare const EXECUTION_ID: unique symbol;

// Create branded types
export type BlueprintId = string & { readonly [BLUEPRINT_ID]: typeof BLUEPRINT_ID };
export type ExecutionId = string & { readonly [EXECUTION_ID]: typeof EXECUTION_ID };

// Factory functions
export const createId = {
  blueprint: (id: string) => id as BlueprintId,
  execution: (id: string) => id as ExecutionId,
} as const;
```

#### Using Branded Types

```typescript
function deleteBlueprint(id: BlueprintId): Promise<void> { ... }
function deleteExecution(id: ExecutionId): Promise<void> { ... }

const bpId = createId.blueprint(crypto.randomUUID());
const execId = createId.execution(crypto.randomUUID());

deleteBlueprint(execId); // Compile error: ExecutionId not assignable to BlueprintId
deleteBlueprint(bpId);   // Works
```

**Note:** Branded types are purely compile-time. Convex validators remain `v.string()` because the runtime value is still a string.

---

### Layer 4: Effect.ts for Client Errors

Effect.ts provides structured, typed error handling for client-side code. **Do NOT use Effect in Convex function handlers.**

#### Client Error Definitions

```typescript
// src/client/errors.ts
import { Data } from 'effect';

export class NetworkError extends Data.TaggedError('NetworkError')<{
  readonly cause: unknown;
  readonly retryable: boolean;
  readonly operation: string;
}> {}

export class NotFoundError extends Data.TaggedError('NotFoundError')<{
  readonly entity: 'blueprint' | 'execution' | 'vault' | 'credential';
  readonly id: string;
}> {}
```

#### Server Error Definitions (Plain Classes)

```typescript
// src/server/errors.ts (NOT using Effect)
export class CraneError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'CraneError';
  }
}

export class NotFoundError extends CraneError {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, 'NOT_FOUND');
  }
}
```

| Context | Pattern | Reason |
|---------|---------|--------|
| Client | Effect.TaggedError | Full Effect ecosystem, structured metadata |
| Server | Plain Error classes | Works with Convex error handling, no Effect runtime |

---

## File Structure

```
src/
├── shared/
│   ├── validators.ts    # SINGLE SOURCE OF TRUTH
│   │   ├── Convex validators (tileTypeValidator, blueprintDocValidator, etc.)
│   │   ├── Inferred types (TileType, Blueprint, Execution, etc.)
│   │   ├── Branded ID types (BlueprintId, ExecutionId, etc.)
│   │   ├── Input validators (blueprintInputValidator, etc.)
│   │   └── Response validators (idResponseValidator, etc.)
│   │
│   └── index.ts         # Re-exports from validators.ts
│
├── component/
│   ├── schema.ts        # Imports validators from ../shared/validators
│   └── public.ts        # Imports validators from ../shared/validators
│
├── server/
│   ├── errors.ts        # Server-side error classes (plain Error)
│   └── resources/*.ts   # Import from ../../shared/validators
│
└── client/
    └── errors.ts        # Client-side errors (Effect.TaggedError)
```

### Import Pattern

```typescript
// Internal imports use path alias
import {
  type Blueprint,
  tileValidator,
  blueprintDocValidator,
} from '$/shared/validators';

// Via public exports (for external consumers)
import { Blueprint, tileValidator } from '@trestleinc/crane/shared';
```

---

## Decision Matrix

| Use Case | Approach | Example |
|----------|----------|---------|
| Convex function args | Convex validators | `args: { id: v.string() }` |
| Convex function returns | Document validators | `returns: blueprintDocValidator` |
| TypeScript types | `Infer<typeof validator>` | `type Blueprint = Infer<typeof blueprintDocValidator>` |
| Dynamic user data | `v.record(v.string(), v.any())` | `variables: v.record(v.string(), v.any())` |
| Enum-like values | `literals()` | `literals('pending', 'running', 'completed')` |
| Nullable fields | `nullable()` | `nullable(v.string())` |
| ID type safety | Branded types | `BlueprintId`, `ExecutionId` |
| Client errors | Effect.TaggedError | `new NotFoundError({ entity: 'blueprint', id })` |
| Server errors | Plain Error classes | `throw new NotFoundError('Blueprint', id)` |

---

## Anti-Patterns to Avoid

### DON'T: Duplicate Interfaces

```typescript
// DON'T: Separate interface that duplicates validator
export const blueprintValidator = v.object({ id: v.string(), name: v.string() });
export interface Blueprint { id: string; name: string; } // Redundant!

// DO: Derive type from validator
export const blueprintValidator = v.object({ id: v.string(), name: v.string() });
export type Blueprint = Infer<typeof blueprintValidator>;
```

### DON'T: Multiple Validator Files

```typescript
// DON'T: Spread validators across files
// types.ts - interfaces
// validators.ts - runtime guards
// convex-validators.ts - Convex validators

// DO: Single file
// validators.ts - everything
```

### DON'T: Bare `v.any()` for Structured Data

```typescript
// DON'T
variables: v.any(),

// DO
variables: v.record(v.string(), v.any()),
```

### DON'T: `returns: v.any()`

```typescript
// DON'T
export const get = query({
  args: { id: v.string() },
  returns: v.any(),
  handler: async (ctx, { id }) => { ... },
});

// DO
export const get = query({
  args: { id: v.string() },
  returns: v.union(blueprintDocValidator, v.null()),
  handler: async (ctx, { id }) => { ... },
});
```

### DON'T: Effect.ts in Convex Handlers

```typescript
// DON'T
import { Effect } from 'effect';
export const create = mutation({
  handler: async (ctx, args) => {
    return Effect.runPromise(Effect.tryPromise(() => doSomething()));
  },
});

// DO
export const create = mutation({
  handler: async (ctx, args) => {
    try {
      return await doSomething();
    } catch (error) {
      throw new ValidationError('Something went wrong');
    }
  },
});
```

---

## Summary

1. **Single file** - All validators and types in `shared/validators.ts`
2. **Types from validators** - Use `Infer<typeof validator>`, not duplicate interfaces
3. **Convex validators** for all function definitions - zero bundle overhead
4. **convex-helpers** for cleaner syntax - `literals()`, `nullable()`, `partial()`
5. **Branded types** for IDs - compile-time safety, zero runtime cost
6. **Effect.ts** for client errors only - structured, typed error handling
7. **No `v.any()`** where avoidable - use `v.record()` for flexibility
