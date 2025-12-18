/**
 * @trestleinc/crane - Component Schema
 *
 * Defines the database tables for the Crane component:
 * - blueprints: Tile sequences with metadata
 * - executions: Run history and status
 * - vaults: Organization encryption settings
 * - credentials: Encrypted credential storage
 */

import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

// ============================================================================
// Inline Validators (to avoid circular dependencies with shared/)
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

const tileResultValidator = v.object({
  tileId: v.string(),
  status: v.string(),
  result: v.optional(v.any()),
  error: v.optional(v.string()),
  duration: v.optional(v.number()),
});

const artifactValidator = v.object({
  type: v.string(),
  tileId: v.optional(v.string()),
  storageId: v.string(),
  metadata: v.optional(v.any()),
});

// ============================================================================
// Schema Definition
// ============================================================================

export default defineSchema({
  /**
   * Blueprints - Tile sequences with metadata
   *
   * A blueprint defines a sequence of automation steps (tiles).
   * Each tile has a type, label, parameters, and connections to other tiles.
   */
  blueprints: defineTable({
    id: v.string(),
    organizationId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    tiles: v.array(tileValidator),
    metadata: v.object({
      tags: v.optional(v.array(v.string())),
      inputSchema: v.optional(v.array(inputFieldValidator)),
    }),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_uuid', ['id'])
    .index('by_organization', ['organizationId']),

  /**
   * Executions - Run history and status
   *
   * Each execution tracks a blueprint run with status, outputs, and artifacts.
   */
  executions: defineTable({
    id: v.string(),
    blueprintId: v.string(),
    organizationId: v.string(),
    context: v.optional(v.any()), // App-specific (deliverableId, beneficiaryId, etc.)
    variables: v.any(),
    status: executionStatusValidator,
    result: v.optional(
      v.object({
        success: v.boolean(),
        duration: v.optional(v.number()),
        outputs: v.optional(v.any()),
        error: v.optional(v.string()),
        tileResults: v.optional(v.array(tileResultValidator)),
      })
    ),
    artifacts: v.optional(v.array(artifactValidator)),
    createdAt: v.number(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  })
    .index('by_uuid', ['id'])
    .index('by_blueprint', ['blueprintId'])
    .index('by_organization', ['organizationId'])
    .index('by_status', ['organizationId', 'status']),

  /**
   * Vaults - Organization encryption settings
   *
   * Zero-knowledge vault for credential storage.
   * Credentials are encrypted client-side, server never sees plaintext.
   */
  vaults: defineTable({
    organizationId: v.string(),

    // Key derivation (public - needed client-side)
    salt: v.string(),
    iterations: v.number(),

    // Vault key (encrypted with master key)
    encryptedVaultKey: v.string(),
    vaultKeyIv: v.string(),

    // Machine key (encrypted with vault key)
    encryptedMachineKey: v.optional(v.string()),
    machineKeyIv: v.optional(v.string()),

    // WorkOS M2M configuration
    workosM2MClientId: v.optional(v.string()),
    automationEnabled: v.boolean(),

    // Browserbase persistent context
    browserbaseContextId: v.optional(v.string()),

    // Password verification hash
    verificationHash: v.string(),

    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_organization', ['organizationId']),

  /**
   * Credentials - Encrypted credential storage
   *
   * Credentials are encrypted client-side with the vault key.
   * Domain is used for lookup during AUTH tiles.
   */
  credentials: defineTable({
    id: v.string(),
    organizationId: v.string(),
    name: v.string(),
    domain: v.string(), // For domain-based lookup during AUTH
    encryptedPayload: v.string(), // AES-256-GCM encrypted fields
    payloadIv: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_uuid', ['id'])
    .index('by_organization', ['organizationId'])
    .index('by_domain', ['organizationId', 'domain']),
});
