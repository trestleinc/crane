/**
 * @trestleinc/crane - Shared exports
 *
 * Types and utilities that can be used in any environment.
 */

// Enums with attached methods
export {
  // Tile types
  TileType,
  // Execution status
  ExecutionStatus,
  // Tile status
  TileStatus,
  // Field types
  FieldType,
} from './validators.js';

// Re-export types from validators
export type {
  TileType as TileTypeValue,
  ExecutionStatus as ExecutionStatusValue,
  TileStatus as TileStatusValue,
  FieldType as FieldTypeValue,
} from './validators.js';

// Entity types
export type {
  // Tile types
  TilePosition,
  TileConnections,
  Tile,
  // Input field types
  InputField,
  // Blueprint types
  BlueprintMetadata,
  Blueprint,
  BlueprintInput,
  BlueprintUpdate,
  // Execution types
  TileResult,
  ExecutionArtifact,
  ExecutionResult,
  Execution,
  ExecutionInput,
  // Vault types
  Vault,
  VaultSetupInput,
  VaultEnableInput,
  // Credential types
  Credential,
  CredentialInput,
  CredentialUpdate,
  ResolvedCredential,
  // List options
  ListOptions,
  BlueprintListOptions,
  ExecutionListOptions,
  CredentialListOptions,
} from './types.js';
