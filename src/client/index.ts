/**
 * @trestleinc/crane - Client exports
 *
 * Import from '@trestleinc/crane/client' for client-side utilities.
 */

// Blueprint builder
export { blueprint } from '$/client/blueprint.js';
export type {
  Blueprint,
  BlueprintDraft,
  Tile,
  TileType,
  InputField,
  TypeOptions,
  FormField,
  ScreenshotOptions,
} from '$/client/blueprint.js';

// Vault operations
export { vault } from '$/client/vault.js';
export type {
  VaultData,
  VaultKey,
  CredentialInput,
  EncryptedPayload,
  DecryptedCredential,
} from '$/client/vault.js';

// Error types
export {
  NetworkError,
  AuthorizationError,
  NotFoundError,
  ValidationError,
  VaultUnlockError,
  CredentialNotFoundError,
  NonRetriableError,
} from '$/client/errors.js';

// Logger utility
export { getLogger } from '$/client/logger.js';

// Re-export shared types and validators for convenience
export * from '$/shared/index.js';
