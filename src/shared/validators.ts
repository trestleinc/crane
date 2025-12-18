/**
 * @trestleinc/crane - Shared Validators
 *
 * Type definitions and runtime guards for Crane entities.
 * These are used across client, server, and component code for type safety.
 */

// ============================================================================
// TileType (Blueprint tile types)
// ============================================================================

const tileTypeValues = {
  NAVIGATE: 'NAVIGATE',
  CLICK: 'CLICK',
  TYPE: 'TYPE',
  EXTRACT: 'EXTRACT',
  SCREENSHOT: 'SCREENSHOT',
  WAIT: 'WAIT',
  SELECT: 'SELECT',
  FORM: 'FORM',
  AUTH: 'AUTH',
} as const;

export type TileType = (typeof tileTypeValues)[keyof typeof tileTypeValues];

const tileTypeDisplayNames: Record<TileType, string> = {
  NAVIGATE: 'Navigate',
  CLICK: 'Click',
  TYPE: 'Type',
  EXTRACT: 'Extract',
  SCREENSHOT: 'Screenshot',
  WAIT: 'Wait',
  SELECT: 'Select',
  FORM: 'Form',
  AUTH: 'Authenticate',
};

export const TileType = {
  ...tileTypeValues,
  valid: (value: string): value is TileType =>
    Object.values(tileTypeValues).includes(value as TileType),
  display: (t: TileType): string => tileTypeDisplayNames[t],
} as const;

// ============================================================================
// ExecutionStatus (Execution run states)
// ============================================================================

const executionStatusValues = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

export type ExecutionStatus = (typeof executionStatusValues)[keyof typeof executionStatusValues];

const executionStatusDisplayNames: Record<ExecutionStatus, string> = {
  pending: 'Pending',
  running: 'Running',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

export const ExecutionStatus = {
  ...executionStatusValues,
  valid: (value: string): value is ExecutionStatus =>
    Object.values(executionStatusValues).includes(value as ExecutionStatus),
  display: (s: ExecutionStatus): string => executionStatusDisplayNames[s],
  isTerminal: (s: ExecutionStatus): boolean =>
    s === 'completed' || s === 'failed' || s === 'cancelled',
} as const;

// ============================================================================
// TileStatus (Individual tile execution states)
// ============================================================================

const tileStatusValues = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  SKIPPED: 'skipped',
} as const;

export type TileStatus = (typeof tileStatusValues)[keyof typeof tileStatusValues];

export const TileStatus = {
  ...tileStatusValues,
  valid: (value: string): value is TileStatus =>
    Object.values(tileStatusValues).includes(value as TileStatus),
} as const;

// ============================================================================
// FieldType (Blueprint input field types)
// ============================================================================

const fieldTypeValues = {
  STRING: 'string',
  NUMBER: 'number',
  BOOLEAN: 'boolean',
  DATE: 'date',
  ARRAY: 'array',
} as const;

export type FieldType = (typeof fieldTypeValues)[keyof typeof fieldTypeValues];

export const FieldType = {
  ...fieldTypeValues,
  valid: (value: string): value is FieldType =>
    Object.values(fieldTypeValues).includes(value as FieldType),
} as const;
