/**
 * @trestleinc/crane - Client exports
 *
 * Import from '@trestleinc/crane/client' for client-side utilities.
 */

export type {
	Blueprint,
	BlueprintDraft,
	FormField,
	InputField,
	ScreenshotOptions,
	Tile,
	TileType,
	TypeOptions,
} from "$/client/blueprint";
export { blueprint } from "$/client/blueprint";

export {
	AuthorizationError,
	CredentialNotFoundError,
	NetworkError,
	NonRetriableError,
	NotFoundError,
	ValidationError,
	VaultUnlockError,
} from "$/client/errors";

export { getLogger } from "$/client/logger";

export type {
	CredentialInput,
	DecryptedCredential,
	EncryptedPayload,
	VaultData,
	VaultKey,
} from "$/client/vault";
export { vault } from "$/client/vault";

export type {
	CredentialHooks,
	CredentialOptions,
	ExecutionHooks,
	ExecutionOptions,
	ResourceHooks,
	ResourceOptions,
	VaultHooks,
	VaultOptions,
} from "$/server/resource";

export * from "$/shared/index";
