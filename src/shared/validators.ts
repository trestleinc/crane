import { type Infer, v } from 'convex/values';

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

export const executionStatusValidator = v.union(
  v.literal('pending'),
  v.literal('running'),
  v.literal('completed'),
  v.literal('failed'),
  v.literal('cancelled'),
);

export const tileStatusValidator = v.union(
  v.literal('pending'),
  v.literal('running'),
  v.literal('completed'),
  v.literal('failed'),
  v.literal('skipped'),
);

export const fieldTypeValidator = v.union(
  v.literal('string'),
  v.literal('number'),
  v.literal('boolean'),
  v.literal('date'),
  v.literal('array'),
);

export const tilePositionValidator = v.object({
  x: v.number(),
  y: v.number(),
});

export const tileConnectionsValidator = v.object({
  input: v.union(v.string(), v.null()),
  output: v.union(v.string(), v.null()),
});

export const tileValidator = v.object({
  id: v.string(),
  type: tileTypeValidator,
  label: v.string(),
  description: v.optional(v.string()),
  position: tilePositionValidator,
  parameters: v.record(v.string(), v.any()),
  connections: tileConnectionsValidator,
});

export const inputFieldValidator = v.object({
  name: v.string(),
  type: v.string(),
  required: v.boolean(),
  description: v.optional(v.string()),
});

export const metadataValidator = v.object({
  tags: v.optional(v.array(v.string())),
  inputSchema: v.optional(v.array(inputFieldValidator)),
});

export const tileResultValidator = v.object({
  tileId: v.string(),
  status: v.string(),
  result: v.optional(v.any()),
  error: v.optional(v.string()),
  duration: v.optional(v.number()),
});

export const artifactValidator = v.object({
  type: v.string(),
  tileId: v.optional(v.string()),
  storageId: v.string(),
  metadata: v.optional(v.record(v.string(), v.any())),
});

export const executionResultValidator = v.object({
  success: v.boolean(),
  duration: v.optional(v.number()),
  outputs: v.optional(v.record(v.string(), v.any())),
  error: v.optional(v.string()),
  tileResults: v.optional(v.array(tileResultValidator)),
});

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

export const executionDocValidator = v.object({
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
});

export const vaultDocValidator = v.object({
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
});

export const credentialDocValidator = v.object({
  id: v.string(),
  organizationId: v.string(),
  name: v.string(),
  domain: v.string(),
  encryptedPayload: v.string(),
  payloadIv: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const blueprintInputValidator = v.object({
  organizationId: v.string(),
  name: v.string(),
  description: v.optional(v.string()),
  tiles: v.array(tileValidator),
  metadata: v.optional(metadataValidator),
});

export const blueprintUpdateValidator = v.object({
  name: v.optional(v.string()),
  description: v.optional(v.string()),
  tiles: v.optional(v.array(tileValidator)),
  metadata: v.optional(metadataValidator),
});

export const executionInputValidator = v.object({
  blueprintId: v.string(),
  organizationId: v.string(),
  variables: v.record(v.string(), v.any()),
  context: v.optional(v.record(v.string(), v.any())),
  workflowId: v.optional(v.string()),
});

export const credentialInputValidator = v.object({
  organizationId: v.string(),
  name: v.string(),
  domain: v.string(),
  encryptedPayload: v.string(),
  payloadIv: v.string(),
});

export const credentialUpdateValidator = v.object({
  name: v.optional(v.string()),
  domain: v.optional(v.string()),
  encryptedPayload: v.optional(v.string()),
  payloadIv: v.optional(v.string()),
});

export const vaultSetupInputValidator = v.object({
  organizationId: v.string(),
  salt: v.string(),
  iterations: v.number(),
  encryptedVaultKey: v.string(),
  vaultKeyIv: v.string(),
  verificationHash: v.string(),
});

export const vaultEnableInputValidator = v.object({
  organizationId: v.string(),
  encryptedMachineKey: v.string(),
  machineKeyIv: v.string(),
  workosM2MClientId: v.optional(v.string()),
});

export const listOptionsValidator = v.object({
  limit: v.optional(v.number()),
  cursor: v.optional(v.string()),
});

export const blueprintListOptionsValidator = v.object({
  organizationId: v.string(),
  tags: v.optional(v.array(v.string())),
  limit: v.optional(v.number()),
});

export const executionListOptionsValidator = v.object({
  organizationId: v.string(),
  status: v.optional(executionStatusValidator),
  blueprintId: v.optional(v.string()),
  limit: v.optional(v.number()),
});

export const credentialListOptionsValidator = v.object({
  organizationId: v.string(),
  domain: v.optional(v.string()),
  limit: v.optional(v.number()),
});

export const idResponseValidator = v.object({
  id: v.string(),
});

export const removedResponseValidator = v.object({
  removed: v.boolean(),
});

export const startedResponseValidator = v.object({
  started: v.boolean(),
});

export const completedResponseValidator = v.object({
  completed: v.boolean(),
});

export const cancelledResponseValidator = v.object({
  cancelled: v.boolean(),
});

export const resolvedCredentialValidator = v.object({
  username: v.string(),
  password: v.string(),
  fields: v.optional(v.record(v.string(), v.string())),
});

declare const BLUEPRINT_ID: unique symbol;
export type BlueprintId = string & {
  readonly [BLUEPRINT_ID]: typeof BLUEPRINT_ID;
};

declare const EXECUTION_ID: unique symbol;
export type ExecutionId = string & {
  readonly [EXECUTION_ID]: typeof EXECUTION_ID;
};

declare const CREDENTIAL_ID: unique symbol;
export type CredentialId = string & {
  readonly [CREDENTIAL_ID]: typeof CREDENTIAL_ID;
};

declare const ORGANIZATION_ID: unique symbol;
export type OrganizationId = string & {
  readonly [ORGANIZATION_ID]: typeof ORGANIZATION_ID;
};

export const createId = {
  blueprint: (id: string) => id as BlueprintId,
  execution: (id: string) => id as ExecutionId,
  credential: (id: string) => id as CredentialId,
  organization: (id: string) => id as OrganizationId,
} as const;

export type TileType = Infer<typeof tileTypeValidator>;
export type ExecutionStatus = Infer<typeof executionStatusValidator>;
export type TileStatus = Infer<typeof tileStatusValidator>;
export type FieldType = Infer<typeof fieldTypeValidator>;

export type TilePosition = Infer<typeof tilePositionValidator>;
export type TileConnections = Infer<typeof tileConnectionsValidator>;
export type Tile = Infer<typeof tileValidator>;
export type InputField = Infer<typeof inputFieldValidator>;
export type Metadata = Infer<typeof metadataValidator>;
export type TileResult = Infer<typeof tileResultValidator>;
export type Artifact = Infer<typeof artifactValidator>;
export type ExecutionResult = Infer<typeof executionResultValidator>;

export type Blueprint = Infer<typeof blueprintDocValidator>;
export type Execution = Infer<typeof executionDocValidator>;
export type Vault = Infer<typeof vaultDocValidator>;
export type Credential = Infer<typeof credentialDocValidator>;

export type BlueprintInput = Infer<typeof blueprintInputValidator>;
export type BlueprintUpdate = Infer<typeof blueprintUpdateValidator>;
export type ExecutionInput = Infer<typeof executionInputValidator>;
export type CredentialInput = Infer<typeof credentialInputValidator>;
export type CredentialUpdate = Infer<typeof credentialUpdateValidator>;
export type VaultSetupInput = Infer<typeof vaultSetupInputValidator>;
export type VaultEnableInput = Infer<typeof vaultEnableInputValidator>;

export type ListOptions = Infer<typeof listOptionsValidator>;
export type BlueprintListOptions = Infer<typeof blueprintListOptionsValidator>;
export type ExecutionListOptions = Infer<typeof executionListOptionsValidator>;
export type CredentialListOptions = Infer<typeof credentialListOptionsValidator>;

export type IdResponse = Infer<typeof idResponseValidator>;
export type RemovedResponse = Infer<typeof removedResponseValidator>;
export type StartedResponse = Infer<typeof startedResponseValidator>;
export type CompletedResponse = Infer<typeof completedResponseValidator>;
export type CancelledResponse = Infer<typeof cancelledResponseValidator>;

export type ResolvedCredential = Infer<typeof resolvedCredentialValidator>;
