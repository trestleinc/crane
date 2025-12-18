# @trestleinc/crane

> Browser automation engine with integrated credential vault.

Crane executes **blueprints** (sequences of automation steps) against web portals that lack APIs. It stores blueprint definitions, manages encrypted credentials, and tracks execution history.

## Installation

```bash
bun add @trestleinc/crane
```

```typescript
// convex/convex.config.ts
import crane from '@trestleinc/crane/convex.config';
import { defineApp } from 'convex/server';

const app = defineApp();
app.use(crane);
export default app;
```

## Quick Start

```typescript
// convex/crane.ts
import { crane } from '@trestleinc/crane/server';
import { components } from './_generated/api';

export const c = crane(components.crane);
```

```typescript
// convex/blueprints.ts
import { query, mutation } from './_generated/server';
import { v } from 'convex/values';
import { c } from './crane';

export const list = query({
  args: { organizationId: v.string() },
  handler: async (ctx, { organizationId }) => {
    return ctx.runQuery(c.api.blueprint.list, { organizationId });
  },
});

export const create = mutation({
  args: { organizationId: v.string(), name: v.string(), tiles: v.array(v.any()) },
  handler: async (ctx, args) => {
    return ctx.runMutation(c.api.blueprint.create, args);
  },
});
```

## Core Concepts

### Blueprints

A blueprint is a sequence of **tiles** (automation steps):

```
NAVIGATE → AUTH → TYPE → CLICK → SCREENSHOT → EXTRACT
```

| Tile Type | Purpose |
|-----------|---------|
| `NAVIGATE` | Go to URL (supports `{{variable}}` interpolation) |
| `AUTH` | Login using stored credentials (domain-based lookup) |
| `TYPE` | Type into a field |
| `CLICK` | Click an element |
| `EXTRACT` | Extract data from page |
| `SCREENSHOT` | Capture screenshot |
| `WAIT` | Wait for time or condition |
| `SELECT` | Select dropdown option |
| `FORM` | Fill multiple form fields |

### Executions

Track blueprint runs with status, duration, outputs, and artifacts.

### Credential Vault

Zero-knowledge credential storage:
- Credentials encrypted client-side before storage
- Server never sees plaintext passwords
- WorkOS M2M authentication for automated execution

## API Reference

### Component API (via `c.api`)

```typescript
// Blueprints
blueprint.get(ctx, { id })
blueprint.list(ctx, { organizationId })
blueprint.create(ctx, { organizationId, name, tiles, metadata? })
blueprint.update(ctx, { id, name?, tiles?, metadata? })
blueprint.remove(ctx, { id })

// Executions
execution.get(ctx, { id })
execution.list(ctx, { organizationId, blueprintId?, status? })
execution.start(ctx, { id, startedAt })
execution.cancel(ctx, { id, reason? })
execution.complete(ctx, { id, result, artifacts? })

// Vault
vault.get(ctx, { organizationId })
vault.setup(ctx, { organizationId, salt, iterations, encryptedVaultKey, ... })
vault.unlock(ctx, { organizationId }) // Returns verification data
vault.enable(ctx, { organizationId, workosM2MClientId, encryptedMachineKey, ... })

// Credentials
credential.get(ctx, { id })
credential.list(ctx, { organizationId })
credential.create(ctx, { organizationId, domain, encryptedPayload, ... })
credential.update(ctx, { id, encryptedPayload?, ... })
credential.remove(ctx, { id })
credential.resolve(ctx, { organizationId, domain }) // For AUTH tile
```

### Client Exports

```typescript
import { blueprint, vault } from '@trestleinc/crane/client';

// Build blueprints with fluent API
const submitIntake = blueprint
  .create('submit-intake')
  .input('portalUrl', 'string', true)
  .navigate('{{portalUrl}}')
  .auth()
  .type('first name field', { variable: 'firstName' })
  .click('submit button')
  .screenshot()
  .extract('confirmation number', 'confirmationNumber')
  .build();

// Vault operations
await vault.setup(masterPassword, ctx);
const key = await vault.unlock(masterPassword, vaultData);
await vault.credential.save(key, credential, ctx);
```

### Server Exports

```typescript
import { crane } from '@trestleinc/crane/server';
import type { Adapter, AdapterFactory, CredentialResolver } from '@trestleinc/crane/server';

// Adapter factory - app provides browser implementation
const createAdapter: AdapterFactory = async ({ blueprintId, contextId }) => {
  const stagehand = new Stagehand({ /* ... */ });
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

// Execute a blueprint
const result = await c.execute(ctx, {
  blueprintId: 'bp_123',
  variables: { firstName: 'John', lastName: 'Doe' },
  adapter: createAdapter,
  credentials: (domain) => vault.credential.resolve(key, domain),
});
```

## Stagehand 3 Integration

Crane works with [Stagehand 3](https://github.com/browserbase/stagehand)'s observe/act pattern:

```typescript
// Observe phase (uses LLM)
const elements = await stagehand.observe('login button');

// Act phase (no LLM - 2-3x faster)
await stagehand.act(elements[0]);
```

## Technology Stack

- **Convex** - Database and serverless functions
- **Stagehand 3** - AI-powered browser automation (peer dependency)
- **Browserbase** - Cloud browser infrastructure
- **WorkOS** - M2M authentication for automated execution
- **Web Crypto API** - Client-side credential encryption

## License

Apache-2.0
