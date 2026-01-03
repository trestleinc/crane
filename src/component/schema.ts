/**
 * @trestleinc/crane - Component Schema
 *
 * Defines the database tables for the Crane component:
 * - blueprints: Tile sequences with metadata
 * - executions: Run history and status
 * - vaults: Organization encryption settings
 * - credentials: Encrypted credential storage
 *
 * All validators imported from shared/validators.ts (single source of truth)
 * @see val.md for validation philosophy
 */

import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import {
  artifactValidator,
  executionResultValidator,
  executionStatusValidator,
  metadataValidator,
  tileValidator,
} from '$/shared/validators';

export default defineSchema({
  blueprints: defineTable({
    id: v.string(),
    organizationId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    tiles: v.array(tileValidator),
    metadata: metadataValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_uuid', ['id'])
    .index('by_organization', ['organizationId']),

  executions: defineTable({
    id: v.string(),
    blueprintId: v.string(),
    organizationId: v.string(),
    context: v.optional(v.record(v.string(), v.any())),
    variables: v.record(v.string(), v.any()),
    status: executionStatusValidator,
    result: v.optional(executionResultValidator),
    artifacts: v.optional(v.array(artifactValidator)),
    workflowId: v.optional(v.string()),
    createdAt: v.number(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  })
    .index('by_uuid', ['id'])
    .index('by_blueprint', ['blueprintId'])
    .index('by_organization', ['organizationId'])
    .index('by_status', ['organizationId', 'status']),

  vaults: defineTable({
    organizationId: v.string(),
    salt: v.string(),
    iterations: v.number(),
    encryptedVaultKey: v.string(),
    vaultKeyIv: v.string(),
    encryptedMachineKey: v.optional(v.string()),
    machineKeyIv: v.optional(v.string()),
    workosM2MClientId: v.optional(v.string()),
    automationEnabled: v.boolean(),
    browserbaseContextId: v.optional(v.string()),
    verificationHash: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_organization', ['organizationId']),

  credentials: defineTable({
    id: v.string(),
    organizationId: v.string(),
    name: v.string(),
    domain: v.string(),
    encryptedPayload: v.string(),
    payloadIv: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_uuid', ['id'])
    .index('by_organization', ['organizationId'])
    .index('by_domain', ['organizationId', 'domain']),
});
