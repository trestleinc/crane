/**
 * @trestleinc/crane - Component Public API
 *
 * Namespaced queries and mutations for Blueprints, Executions, Vaults, and Credentials.
 */

import { v } from 'convex/values';
import { mutation, query } from '$/component/_generated/server';
import { getLogger } from '$/component/logger';

// ============================================================================
// Validators
// ============================================================================

const tileTypeValidator = v.union(
  v.literal('NAVIGATE'),
  v.literal('CLICK'),
  v.literal('TYPE'),
  v.literal('EXTRACT'),
  v.literal('SCREENSHOT'),
  v.literal('WAIT'),
  v.literal('SELECT'),
  v.literal('FORM'),
  v.literal('AUTH')
);

const executionStatusValidator = v.union(
  v.literal('pending'),
  v.literal('running'),
  v.literal('completed'),
  v.literal('failed'),
  v.literal('cancelled')
);

const tileValidator = v.object({
  id: v.string(),
  type: tileTypeValidator,
  label: v.string(),
  description: v.optional(v.string()),
  position: v.object({ x: v.number(), y: v.number() }),
  parameters: v.any(),
  connections: v.object({
    input: v.union(v.string(), v.null()),
    output: v.union(v.string(), v.null()),
  }),
});

const inputFieldValidator = v.object({
  name: v.string(),
  type: v.string(),
  required: v.boolean(),
  description: v.optional(v.string()),
});

const metadataValidator = v.object({
  tags: v.optional(v.array(v.string())),
  inputSchema: v.optional(v.array(inputFieldValidator)),
});

const tileResultValidator = v.object({
  tileId: v.string(),
  status: v.string(),
  result: v.optional(v.any()),
  error: v.optional(v.string()),
  duration: v.optional(v.number()),
});

const resultValidator = v.object({
  success: v.boolean(),
  duration: v.optional(v.number()),
  outputs: v.optional(v.any()),
  error: v.optional(v.string()),
  tileResults: v.optional(v.array(tileResultValidator)),
});

const artifactValidator = v.object({
  type: v.string(),
  tileId: v.optional(v.string()),
  storageId: v.string(),
  metadata: v.optional(v.any()),
});

// ============================================================================
// BLUEPRINT
// ============================================================================

const _blueprintGet = query({
  args: { id: v.string() },
  returns: v.any(),
  handler: async (ctx, { id }) => {
    return ctx.db
      .query('blueprints')
      .withIndex('by_uuid', (q) => q.eq('id', id))
      .unique();
  },
});

const _blueprintList = query({
  args: {
    organizationId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, { organizationId, limit = 50 }) => {
    return ctx.db
      .query('blueprints')
      .withIndex('by_organization', (q) => q.eq('organizationId', organizationId))
      .order('desc')
      .take(limit);
  },
});

const _blueprintCreate = mutation({
  args: {
    organizationId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    tiles: v.array(tileValidator),
    metadata: v.optional(metadataValidator),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const logger = getLogger(['blueprint']);
    const id = crypto.randomUUID();
    const now = Date.now();

    await ctx.db.insert('blueprints', {
      id,
      organizationId: args.organizationId,
      name: args.name,
      description: args.description,
      tiles: args.tiles,
      metadata: args.metadata ?? { tags: [], inputSchema: [] },
      createdAt: now,
      updatedAt: now,
    });

    logger.info('Blueprint created', { id, name: args.name });
    return { id };
  },
});

const _blueprintUpdate = mutation({
  args: {
    id: v.string(),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    tiles: v.optional(v.array(tileValidator)),
    metadata: v.optional(metadataValidator),
  },
  returns: v.any(),
  handler: async (ctx, { id, ...updates }) => {
    const logger = getLogger(['blueprint']);
    const existing = await ctx.db
      .query('blueprints')
      .withIndex('by_uuid', (q) => q.eq('id', id))
      .unique();
    if (!existing) throw new Error(`Blueprint not found: ${id}`);

    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(updates)) {
      if (v !== undefined) clean[k] = v;
    }

    await ctx.db.patch(existing._id, { ...clean, updatedAt: Date.now() });
    logger.info('Blueprint updated', { id });
    return { id };
  },
});

const _blueprintRemove = mutation({
  args: { id: v.string() },
  returns: v.any(),
  handler: async (ctx, { id }) => {
    const logger = getLogger(['blueprint']);
    const bp = await ctx.db
      .query('blueprints')
      .withIndex('by_uuid', (q) => q.eq('id', id))
      .unique();
    if (bp) {
      await ctx.db.delete(bp._id);
      logger.info('Blueprint removed', { id });
    }
    return { removed: true };
  },
});

export const blueprint = {
  get: _blueprintGet,
  list: _blueprintList,
  create: _blueprintCreate,
  update: _blueprintUpdate,
  remove: _blueprintRemove,
};

// ============================================================================
// EXECUTION
// ============================================================================

const _executionGet = query({
  args: { id: v.string() },
  returns: v.any(),
  handler: async (ctx, { id }) => {
    return ctx.db
      .query('executions')
      .withIndex('by_uuid', (q) => q.eq('id', id))
      .unique();
  },
});

const _executionList = query({
  args: {
    organizationId: v.string(),
    blueprintId: v.optional(v.string()),
    status: v.optional(executionStatusValidator),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, { organizationId, blueprintId, status, limit = 50 }) => {
    let results;
    if (blueprintId) {
      results = await ctx.db
        .query('executions')
        .withIndex('by_blueprint', (q) => q.eq('blueprintId', blueprintId))
        .order('desc')
        .take(limit);
    } else {
      results = await ctx.db
        .query('executions')
        .withIndex('by_organization', (q) => q.eq('organizationId', organizationId))
        .order('desc')
        .take(limit);
    }
    return status ? results.filter((e) => e.status === status) : results;
  },
});

const _executionCreate = mutation({
  args: {
    blueprintId: v.string(),
    organizationId: v.string(),
    variables: v.any(),
    context: v.optional(v.any()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const logger = getLogger(['execution']);

    // Verify blueprint exists
    const bp = await ctx.db
      .query('blueprints')
      .withIndex('by_uuid', (q) => q.eq('id', args.blueprintId))
      .unique();
    if (!bp) throw new Error(`Blueprint not found: ${args.blueprintId}`);

    const id = crypto.randomUUID();
    const now = Date.now();

    await ctx.db.insert('executions', {
      id,
      blueprintId: args.blueprintId,
      organizationId: args.organizationId,
      variables: args.variables,
      context: args.context,
      status: 'pending',
      createdAt: now,
    });

    logger.info('Execution created', { id, blueprintId: args.blueprintId });
    return { id };
  },
});

const _executionStart = mutation({
  args: { id: v.string() },
  returns: v.any(),
  handler: async (ctx, { id }) => {
    const logger = getLogger(['execution']);
    const e = await ctx.db
      .query('executions')
      .withIndex('by_uuid', (q) => q.eq('id', id))
      .unique();
    if (!e) throw new Error(`Execution not found: ${id}`);
    if (e.status !== 'pending') throw new Error(`Execution not pending: ${id}`);
    await ctx.db.patch(e._id, { status: 'running', startedAt: Date.now() });
    logger.info('Execution started', { id });
    return { started: true };
  },
});

const _executionCancel = mutation({
  args: { id: v.string(), reason: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, { id, reason }) => {
    const logger = getLogger(['execution']);
    const e = await ctx.db
      .query('executions')
      .withIndex('by_uuid', (q) => q.eq('id', id))
      .unique();
    if (e && (e.status === 'pending' || e.status === 'running')) {
      await ctx.db.patch(e._id, {
        status: 'cancelled',
        result: { success: false, error: reason ?? 'Cancelled' },
        completedAt: Date.now(),
      });
      logger.info('Execution cancelled', { id });
    }
    return { cancelled: true };
  },
});

const _executionComplete = mutation({
  args: {
    id: v.string(),
    result: resultValidator,
    artifacts: v.optional(v.array(artifactValidator)),
  },
  returns: v.any(),
  handler: async (ctx, { id, result, artifacts }) => {
    const logger = getLogger(['execution']);
    const e = await ctx.db
      .query('executions')
      .withIndex('by_uuid', (q) => q.eq('id', id))
      .unique();
    if (!e) throw new Error(`Execution not found: ${id}`);

    await ctx.db.patch(e._id, {
      status: result.success ? 'completed' : 'failed',
      result,
      artifacts,
      completedAt: Date.now(),
    });
    logger.info('Execution completed', { id, success: result.success });
    return { completed: true };
  },
});

export const execution = {
  get: _executionGet,
  list: _executionList,
  create: _executionCreate,
  start: _executionStart,
  cancel: _executionCancel,
  complete: _executionComplete,
};

// ============================================================================
// VAULT
// ============================================================================

const _vaultGet = query({
  args: { organizationId: v.string() },
  returns: v.any(),
  handler: async (ctx, { organizationId }) => {
    return ctx.db
      .query('vaults')
      .withIndex('by_organization', (q) => q.eq('organizationId', organizationId))
      .unique();
  },
});

const _vaultSetup = mutation({
  args: {
    organizationId: v.string(),
    salt: v.string(),
    iterations: v.number(),
    encryptedVaultKey: v.string(),
    vaultKeyIv: v.string(),
    verificationHash: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const logger = getLogger(['vault']);

    // Check if vault already exists
    const existing = await ctx.db
      .query('vaults')
      .withIndex('by_organization', (q) => q.eq('organizationId', args.organizationId))
      .unique();

    if (existing) {
      throw new Error('Vault already exists for this organization');
    }

    const now = Date.now();
    await ctx.db.insert('vaults', {
      ...args,
      automationEnabled: false,
      createdAt: now,
      updatedAt: now,
    });

    logger.info('Vault setup', { organizationId: args.organizationId });
    return { success: true };
  },
});

const _vaultUnlock = query({
  args: { organizationId: v.string() },
  returns: v.any(),
  handler: async (ctx, { organizationId }) => {
    // Returns the vault data needed for client-side decryption
    const vault = await ctx.db
      .query('vaults')
      .withIndex('by_organization', (q) => q.eq('organizationId', organizationId))
      .unique();

    if (!vault) return null;

    // Return only what's needed for client-side unlock
    return {
      salt: vault.salt,
      iterations: vault.iterations,
      encryptedVaultKey: vault.encryptedVaultKey,
      vaultKeyIv: vault.vaultKeyIv,
      verificationHash: vault.verificationHash,
    };
  },
});

const _vaultEnable = mutation({
  args: {
    organizationId: v.string(),
    workosM2MClientId: v.string(),
    encryptedMachineKey: v.string(),
    machineKeyIv: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const logger = getLogger(['vault']);
    const vault = await ctx.db
      .query('vaults')
      .withIndex('by_organization', (q) => q.eq('organizationId', args.organizationId))
      .unique();

    if (!vault) throw new Error('Vault not found');

    await ctx.db.patch(vault._id, {
      workosM2MClientId: args.workosM2MClientId,
      encryptedMachineKey: args.encryptedMachineKey,
      machineKeyIv: args.machineKeyIv,
      automationEnabled: true,
      updatedAt: Date.now(),
    });

    logger.info('Vault automation enabled', { organizationId: args.organizationId });
    return { enabled: true };
  },
});

const _vaultContext = mutation({
  args: {
    organizationId: v.string(),
    browserbaseContextId: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const logger = getLogger(['vault']);
    const vault = await ctx.db
      .query('vaults')
      .withIndex('by_organization', (q) => q.eq('organizationId', args.organizationId))
      .unique();

    if (!vault) throw new Error('Vault not found');

    await ctx.db.patch(vault._id, {
      browserbaseContextId: args.browserbaseContextId,
      updatedAt: Date.now(),
    });

    logger.info('Vault context updated', { organizationId: args.organizationId });
    return { updated: true };
  },
});

export const vault = {
  get: _vaultGet,
  setup: _vaultSetup,
  unlock: _vaultUnlock,
  enable: _vaultEnable,
  context: _vaultContext,
};

// ============================================================================
// CREDENTIAL
// ============================================================================

const _credentialGet = query({
  args: { id: v.string() },
  returns: v.any(),
  handler: async (ctx, { id }) => {
    return ctx.db
      .query('credentials')
      .withIndex('by_uuid', (q) => q.eq('id', id))
      .unique();
  },
});

const _credentialList = query({
  args: {
    organizationId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, { organizationId, limit = 50 }) => {
    return ctx.db
      .query('credentials')
      .withIndex('by_organization', (q) => q.eq('organizationId', organizationId))
      .order('desc')
      .take(limit);
  },
});

const _credentialCreate = mutation({
  args: {
    organizationId: v.string(),
    name: v.string(),
    domain: v.string(),
    encryptedPayload: v.string(),
    payloadIv: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const logger = getLogger(['credential']);
    const id = crypto.randomUUID();
    const now = Date.now();

    await ctx.db.insert('credentials', {
      id,
      ...args,
      createdAt: now,
      updatedAt: now,
    });

    logger.info('Credential created', { id, domain: args.domain });
    return { id };
  },
});

const _credentialUpdate = mutation({
  args: {
    id: v.string(),
    name: v.optional(v.string()),
    domain: v.optional(v.string()),
    encryptedPayload: v.optional(v.string()),
    payloadIv: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, { id, ...updates }) => {
    const logger = getLogger(['credential']);
    const existing = await ctx.db
      .query('credentials')
      .withIndex('by_uuid', (q) => q.eq('id', id))
      .unique();
    if (!existing) throw new Error(`Credential not found: ${id}`);

    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(updates)) {
      if (v !== undefined) clean[k] = v;
    }

    await ctx.db.patch(existing._id, { ...clean, updatedAt: Date.now() });
    logger.info('Credential updated', { id });
    return { id };
  },
});

const _credentialRemove = mutation({
  args: { id: v.string() },
  returns: v.any(),
  handler: async (ctx, { id }) => {
    const logger = getLogger(['credential']);
    const cred = await ctx.db
      .query('credentials')
      .withIndex('by_uuid', (q) => q.eq('id', id))
      .unique();
    if (cred) {
      await ctx.db.delete(cred._id);
      logger.info('Credential removed', { id });
    }
    return { removed: true };
  },
});

const _credentialResolve = query({
  args: {
    organizationId: v.string(),
    domain: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, { organizationId, domain }) => {
    // Find credential by domain for AUTH tile
    return ctx.db
      .query('credentials')
      .withIndex('by_domain', (q) => q.eq('organizationId', organizationId).eq('domain', domain))
      .first();
  },
});

export const credential = {
  get: _credentialGet,
  list: _credentialList,
  create: _credentialCreate,
  update: _credentialUpdate,
  remove: _credentialRemove,
  resolve: _credentialResolve,
};
