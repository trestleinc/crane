/**
 * @trestleinc/crane - Shared Types
 *
 * Type definitions for Crane entities used across client, server, and component code.
 * These are safe to import in any environment (browser, Node.js, Convex).
 */

import type { TileType, ExecutionStatus, TileStatus, FieldType } from './validators.js';

// Re-export validator types for convenience
export type { TileType, ExecutionStatus, TileStatus, FieldType };

// ============================================================================
// Tile (Blueprint Step)
// ============================================================================

/**
 * Position of a tile in the visual editor.
 */
export interface TilePosition {
  x: number;
  y: number;
}

/**
 * Connections between tiles (linked list structure).
 */
export interface TileConnections {
  input: string | null;
  output: string | null;
}

/**
 * A tile in a blueprint representing a single automation step.
 */
export interface Tile {
  id: string;
  type: TileType;
  label: string;
  description?: string;
  position: TilePosition;
  parameters: Record<string, unknown>;
  connections: TileConnections;
}

// ============================================================================
// InputField (Blueprint Input Schema)
// ============================================================================

/**
 * An input field definition for a blueprint.
 */
export interface InputField {
  name: string;
  type: FieldType;
  required: boolean;
  description?: string;
}

// ============================================================================
// Blueprint (Automation Definition)
// ============================================================================

/**
 * Blueprint metadata including tags and input schema.
 */
export interface BlueprintMetadata {
  tags?: string[];
  inputSchema?: InputField[];
}

/**
 * A Blueprint defines a sequence of automation steps (tiles).
 */
export interface Blueprint {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  tiles: Tile[];
  metadata: BlueprintMetadata;
  createdAt: number;
  updatedAt: number;
}

/**
 * Input for creating a blueprint.
 */
export interface BlueprintInput {
  organizationId: string;
  name: string;
  description?: string;
  tiles: Tile[];
  metadata?: BlueprintMetadata;
}

/**
 * Input for updating a blueprint.
 */
export interface BlueprintUpdate {
  name?: string;
  description?: string;
  tiles?: Tile[];
  metadata?: BlueprintMetadata;
}

// ============================================================================
// Execution (Run History)
// ============================================================================

/**
 * Result of executing a single tile.
 */
export interface TileResult {
  tileId: string;
  status: 'completed' | 'failed';
  result?: unknown;
  error?: string;
  duration?: number;
}

/**
 * Artifact produced during execution (screenshots, files).
 */
export interface ExecutionArtifact {
  type: string;
  tileId?: string;
  storageId: string;
  metadata?: Record<string, unknown>;
}

/**
 * Result of a blueprint execution.
 */
export interface ExecutionResult {
  success: boolean;
  duration?: number;
  outputs?: Record<string, unknown>;
  error?: string;
  tileResults?: TileResult[];
}

/**
 * An Execution tracks a blueprint run with status and results.
 */
export interface Execution {
  id: string;
  blueprintId: string;
  organizationId: string;
  context?: unknown;
  variables: Record<string, unknown>;
  status: ExecutionStatus;
  result?: ExecutionResult;
  artifacts?: ExecutionArtifact[];
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

/**
 * Input for creating an execution.
 */
export interface ExecutionInput {
  blueprintId: string;
  organizationId: string;
  variables: Record<string, unknown>;
  context?: unknown;
}

// ============================================================================
// Vault (Encryption Settings)
// ============================================================================

/**
 * A Vault stores organization encryption settings for zero-knowledge credential storage.
 */
export interface Vault {
  organizationId: string;
  salt: string;
  iterations: number;
  encryptedVaultKey: string;
  vaultKeyIv: string;
  encryptedMachineKey?: string;
  machineKeyIv?: string;
  workosM2MClientId?: string;
  automationEnabled: boolean;
  browserbaseContextId?: string;
  verificationHash: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Input for setting up a vault.
 */
export interface VaultSetupInput {
  organizationId: string;
  salt: string;
  iterations: number;
  encryptedVaultKey: string;
  vaultKeyIv: string;
  verificationHash: string;
}

/**
 * Input for enabling vault automation.
 */
export interface VaultEnableInput {
  organizationId: string;
  encryptedMachineKey: string;
  machineKeyIv: string;
  workosM2MClientId?: string;
}

// ============================================================================
// Credential (Encrypted Secrets)
// ============================================================================

/**
 * A Credential stores encrypted login credentials for a domain.
 */
export interface Credential {
  id: string;
  organizationId: string;
  name: string;
  domain: string;
  encryptedPayload: string;
  payloadIv: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Input for creating a credential.
 */
export interface CredentialInput {
  organizationId: string;
  name: string;
  domain: string;
  encryptedPayload: string;
  payloadIv: string;
}

/**
 * Input for updating a credential.
 */
export interface CredentialUpdate {
  name?: string;
  domain?: string;
  encryptedPayload?: string;
  payloadIv?: string;
}

/**
 * Resolved credential for authentication (decrypted fields).
 */
export interface ResolvedCredential {
  username: string;
  password: string;
  fields?: Record<string, string>;
}

// ============================================================================
// List Options
// ============================================================================

export interface ListOptions {
  limit?: number;
  cursor?: string;
}

export interface BlueprintListOptions extends ListOptions {
  tags?: string[];
}

export interface ExecutionListOptions extends ListOptions {
  status?: ExecutionStatus;
  blueprintId?: string;
}

export interface CredentialListOptions extends ListOptions {
  domain?: string;
}
