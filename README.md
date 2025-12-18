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
import { crane } from '@trestleinc/crane/server';
import { components } from './_generated/api';

export const c = crane(components.crane)();
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
    return ctx.runQuery(c.api.blueprint.list, { organizationId });
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
await ctx.runMutation(api.blueprints.create, {
  organizationId: org.id,
  ...submitIntake,
});
```

### Vault Operations

```typescript
import { vault } from '@trestleinc/crane/client';

// Setup vault for organization
const setupData = await vault.setup('master-password');
await ctx.runMutation(api.crane.vault.setup, {
  organizationId: org.id,
  ...setupData,
});

// Unlock vault
const vaultData = await ctx.runQuery(api.crane.vault.get, { organizationId });
const vaultKey = await vault.unlock('master-password', vaultData);

// Encrypt and save credential
const encrypted = await vault.credential.encrypt(vaultKey, {
  username: 'user@example.com',
  password: 'secret123',
});
await ctx.runMutation(api.crane.credential.create, {
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
    const cred = await ctx.runQuery(c.api.credential.resolve, {
      organizationId: org.id,
      domain,
    });
    if (!cred) return null;
    return vault.credential.decrypt(vaultKey, {
      ciphertext: cred.encryptedPayload,
      iv: cred.payloadIv,
    });
  },
  onProgress: (tileId, status) => {
    console.log(`Tile ${tileId}: ${status}`);
  },
  onArtifact: async (type, tileId, data) => {
    const storageId = await ctx.storage.store(new Blob([data]));
    return storageId;
  },
});

console.log(result);
// { success: true, duration: 12500, outputs: { confirmationNumber: 'ABC123' } }
```

## Component API Reference

Access via `c.api`:

### blueprint

| Method | Args | Returns |
|--------|------|---------|
| `get` | `{ id }` | Blueprint or null |
| `list` | `{ organizationId, limit?, cursor? }` | Blueprint[] |
| `create` | `{ organizationId, name, tiles, metadata? }` | `{ id }` |
| `update` | `{ id, name?, tiles?, metadata? }` | void |
| `remove` | `{ id }` | void |

### execution

| Method | Args | Returns |
|--------|------|---------|
| `get` | `{ id }` | Execution or null |
| `list` | `{ organizationId, blueprintId?, status?, limit?, cursor? }` | Execution[] |
| `create` | `{ blueprintId, organizationId, variables, context? }` | `{ id }` |
| `start` | `{ id }` | void |
| `cancel` | `{ id, reason? }` | void |
| `complete` | `{ id, result }` | void |

### vault

| Method | Args | Returns |
|--------|------|---------|
| `get` | `{ organizationId }` | Vault or null |
| `setup` | `{ organizationId, salt, iterations, encryptedVaultKey, vaultKeyIv, verificationHash }` | void |
| `unlock` | `{ organizationId }` | Vault (for client-side verification) |
| `enable` | `{ organizationId, encryptedMachineKey, machineKeyIv, workosM2MClientId? }` | void |
| `context` | `{ organizationId, browserbaseContextId }` | void |

### credential

| Method | Args | Returns |
|--------|------|---------|
| `get` | `{ id }` | Credential or null |
| `list` | `{ organizationId, limit?, cursor? }` | Credential[] |
| `create` | `{ organizationId, name, domain, encryptedPayload, payloadIv }` | `{ id }` |
| `update` | `{ id, name?, domain?, encryptedPayload?, payloadIv? }` | void |
| `remove` | `{ id }` | void |
| `resolve` | `{ organizationId, domain }` | Credential or null |

## Technology Stack

- **[Convex](https://convex.dev)** - Database and serverless functions
- **[Stagehand](https://github.com/browserbase/stagehand)** - AI-powered browser automation
- **[Browserbase](https://browserbase.com)** - Cloud browser infrastructure
- **[WorkOS](https://workos.com)** - M2M authentication for automated execution
- **Web Crypto API** - Client-side credential encryption (AES-256-GCM)

## License

Apache-2.0
