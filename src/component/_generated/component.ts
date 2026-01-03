/* eslint-disable */
/**
 * Generated `ComponentApi` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { FunctionReference } from "convex/server";

/**
 * A utility for referencing a Convex component's exposed API.
 *
 * Useful when expecting a parameter like `components.myComponent`.
 * Usage:
 * ```ts
 * async function myFunction(ctx: QueryCtx, component: ComponentApi) {
 *   return ctx.runQuery(component.someFile.someQuery, { ...args });
 * }
 * ```
 */
export type ComponentApi<Name extends string | undefined = string | undefined> =
  {
    public: {
      blueprintCreate: FunctionReference<
        "mutation",
        "internal",
        {
          description?: string;
          metadata?: {
            inputSchema?: Array<{
              description?: string;
              name: string;
              required: boolean;
              type: string;
            }>;
            tags?: Array<string>;
          };
          name: string;
          organizationId: string;
          tiles: Array<{
            connections: { input: string | null; output: string | null };
            description?: string;
            id: string;
            label: string;
            parameters: Record<string, any>;
            position: { x: number; y: number };
            type:
              | "NAVIGATE"
              | "CLICK"
              | "TYPE"
              | "EXTRACT"
              | "SCREENSHOT"
              | "WAIT"
              | "SELECT"
              | "FORM"
              | "AUTH";
          }>;
        },
        {
          createdAt: number;
          description?: string;
          id: string;
          metadata: {
            inputSchema?: Array<{
              description?: string;
              name: string;
              required: boolean;
              type: string;
            }>;
            tags?: Array<string>;
          };
          name: string;
          organizationId: string;
          tiles: Array<{
            connections: { input: string | null; output: string | null };
            description?: string;
            id: string;
            label: string;
            parameters: Record<string, any>;
            position: { x: number; y: number };
            type:
              | "NAVIGATE"
              | "CLICK"
              | "TYPE"
              | "EXTRACT"
              | "SCREENSHOT"
              | "WAIT"
              | "SELECT"
              | "FORM"
              | "AUTH";
          }>;
          updatedAt: number;
        },
        Name
      >;
      blueprintGet: FunctionReference<
        "query",
        "internal",
        { id: string },
        {
          createdAt: number;
          description?: string;
          id: string;
          metadata: {
            inputSchema?: Array<{
              description?: string;
              name: string;
              required: boolean;
              type: string;
            }>;
            tags?: Array<string>;
          };
          name: string;
          organizationId: string;
          tiles: Array<{
            connections: { input: string | null; output: string | null };
            description?: string;
            id: string;
            label: string;
            parameters: Record<string, any>;
            position: { x: number; y: number };
            type:
              | "NAVIGATE"
              | "CLICK"
              | "TYPE"
              | "EXTRACT"
              | "SCREENSHOT"
              | "WAIT"
              | "SELECT"
              | "FORM"
              | "AUTH";
          }>;
          updatedAt: number;
        } | null,
        Name
      >;
      blueprintList: FunctionReference<
        "query",
        "internal",
        { limit?: number; organizationId: string },
        Array<{
          createdAt: number;
          description?: string;
          id: string;
          metadata: {
            inputSchema?: Array<{
              description?: string;
              name: string;
              required: boolean;
              type: string;
            }>;
            tags?: Array<string>;
          };
          name: string;
          organizationId: string;
          tiles: Array<{
            connections: { input: string | null; output: string | null };
            description?: string;
            id: string;
            label: string;
            parameters: Record<string, any>;
            position: { x: number; y: number };
            type:
              | "NAVIGATE"
              | "CLICK"
              | "TYPE"
              | "EXTRACT"
              | "SCREENSHOT"
              | "WAIT"
              | "SELECT"
              | "FORM"
              | "AUTH";
          }>;
          updatedAt: number;
        }>,
        Name
      >;
      blueprintRemove: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { removed: boolean },
        Name
      >;
      blueprintUpdate: FunctionReference<
        "mutation",
        "internal",
        {
          description?: string;
          id: string;
          metadata?: {
            inputSchema?: Array<{
              description?: string;
              name: string;
              required: boolean;
              type: string;
            }>;
            tags?: Array<string>;
          };
          name?: string;
          tiles?: Array<{
            connections: { input: string | null; output: string | null };
            description?: string;
            id: string;
            label: string;
            parameters: Record<string, any>;
            position: { x: number; y: number };
            type:
              | "NAVIGATE"
              | "CLICK"
              | "TYPE"
              | "EXTRACT"
              | "SCREENSHOT"
              | "WAIT"
              | "SELECT"
              | "FORM"
              | "AUTH";
          }>;
        },
        {
          createdAt: number;
          description?: string;
          id: string;
          metadata: {
            inputSchema?: Array<{
              description?: string;
              name: string;
              required: boolean;
              type: string;
            }>;
            tags?: Array<string>;
          };
          name: string;
          organizationId: string;
          tiles: Array<{
            connections: { input: string | null; output: string | null };
            description?: string;
            id: string;
            label: string;
            parameters: Record<string, any>;
            position: { x: number; y: number };
            type:
              | "NAVIGATE"
              | "CLICK"
              | "TYPE"
              | "EXTRACT"
              | "SCREENSHOT"
              | "WAIT"
              | "SELECT"
              | "FORM"
              | "AUTH";
          }>;
          updatedAt: number;
        } | null,
        Name
      >;
      credentialCreate: FunctionReference<
        "mutation",
        "internal",
        {
          domain: string;
          encryptedPayload: string;
          name: string;
          organizationId: string;
          payloadIv: string;
        },
        {
          createdAt: number;
          domain: string;
          encryptedPayload: string;
          id: string;
          name: string;
          organizationId: string;
          payloadIv: string;
          updatedAt: number;
        },
        Name
      >;
      credentialGet: FunctionReference<
        "query",
        "internal",
        { id: string },
        {
          createdAt: number;
          domain: string;
          encryptedPayload: string;
          id: string;
          name: string;
          organizationId: string;
          payloadIv: string;
          updatedAt: number;
        } | null,
        Name
      >;
      credentialList: FunctionReference<
        "query",
        "internal",
        { limit?: number; organizationId: string },
        Array<{
          createdAt: number;
          domain: string;
          encryptedPayload: string;
          id: string;
          name: string;
          organizationId: string;
          payloadIv: string;
          updatedAt: number;
        }>,
        Name
      >;
      credentialRemove: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { removed: boolean },
        Name
      >;
      credentialResolve: FunctionReference<
        "query",
        "internal",
        { domain: string; organizationId: string },
        {
          createdAt: number;
          domain: string;
          encryptedPayload: string;
          id: string;
          name: string;
          organizationId: string;
          payloadIv: string;
          updatedAt: number;
        } | null,
        Name
      >;
      credentialUpdate: FunctionReference<
        "mutation",
        "internal",
        {
          domain?: string;
          encryptedPayload?: string;
          id: string;
          name?: string;
          payloadIv?: string;
        },
        {
          createdAt: number;
          domain: string;
          encryptedPayload: string;
          id: string;
          name: string;
          organizationId: string;
          payloadIv: string;
          updatedAt: number;
        } | null,
        Name
      >;
      executionComplete: FunctionReference<
        "mutation",
        "internal",
        {
          id: string;
          result: {
            duration?: number;
            error?: string;
            outputs?: Record<string, any>;
            success: boolean;
            tileResults?: Array<{
              duration?: number;
              error?: string;
              result?: any;
              status: string;
              tileId: string;
            }>;
          };
        },
        {
          artifacts?: Array<{
            metadata?: Record<string, any>;
            storageId: string;
            tileId?: string;
            type: string;
          }>;
          blueprintId: string;
          completedAt?: number;
          context?: Record<string, any>;
          createdAt: number;
          id: string;
          organizationId: string;
          result?: {
            duration?: number;
            error?: string;
            outputs?: Record<string, any>;
            success: boolean;
            tileResults?: Array<{
              duration?: number;
              error?: string;
              result?: any;
              status: string;
              tileId: string;
            }>;
          };
          startedAt?: number;
          status: "pending" | "running" | "completed" | "failed" | "cancelled";
          variables: Record<string, any>;
          workflowId?: string;
        } | null,
        Name
      >;
      executionCreate: FunctionReference<
        "mutation",
        "internal",
        {
          blueprintId: string;
          context?: Record<string, any>;
          organizationId: string;
          variables: Record<string, any>;
        },
        {
          artifacts?: Array<{
            metadata?: Record<string, any>;
            storageId: string;
            tileId?: string;
            type: string;
          }>;
          blueprintId: string;
          completedAt?: number;
          context?: Record<string, any>;
          createdAt: number;
          id: string;
          organizationId: string;
          result?: {
            duration?: number;
            error?: string;
            outputs?: Record<string, any>;
            success: boolean;
            tileResults?: Array<{
              duration?: number;
              error?: string;
              result?: any;
              status: string;
              tileId: string;
            }>;
          };
          startedAt?: number;
          status: "pending" | "running" | "completed" | "failed" | "cancelled";
          variables: Record<string, any>;
          workflowId?: string;
        },
        Name
      >;
      executionGet: FunctionReference<
        "query",
        "internal",
        { id: string },
        {
          artifacts?: Array<{
            metadata?: Record<string, any>;
            storageId: string;
            tileId?: string;
            type: string;
          }>;
          blueprintId: string;
          completedAt?: number;
          context?: Record<string, any>;
          createdAt: number;
          id: string;
          organizationId: string;
          result?: {
            duration?: number;
            error?: string;
            outputs?: Record<string, any>;
            success: boolean;
            tileResults?: Array<{
              duration?: number;
              error?: string;
              result?: any;
              status: string;
              tileId: string;
            }>;
          };
          startedAt?: number;
          status: "pending" | "running" | "completed" | "failed" | "cancelled";
          variables: Record<string, any>;
          workflowId?: string;
        } | null,
        Name
      >;
      executionList: FunctionReference<
        "query",
        "internal",
        {
          blueprintId?: string;
          limit?: number;
          organizationId: string;
          status?: "pending" | "running" | "completed" | "failed" | "cancelled";
        },
        Array<{
          artifacts?: Array<{
            metadata?: Record<string, any>;
            storageId: string;
            tileId?: string;
            type: string;
          }>;
          blueprintId: string;
          completedAt?: number;
          context?: Record<string, any>;
          createdAt: number;
          id: string;
          organizationId: string;
          result?: {
            duration?: number;
            error?: string;
            outputs?: Record<string, any>;
            success: boolean;
            tileResults?: Array<{
              duration?: number;
              error?: string;
              result?: any;
              status: string;
              tileId: string;
            }>;
          };
          startedAt?: number;
          status: "pending" | "running" | "completed" | "failed" | "cancelled";
          variables: Record<string, any>;
          workflowId?: string;
        }>,
        Name
      >;
      executionStart: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        {
          artifacts?: Array<{
            metadata?: Record<string, any>;
            storageId: string;
            tileId?: string;
            type: string;
          }>;
          blueprintId: string;
          completedAt?: number;
          context?: Record<string, any>;
          createdAt: number;
          id: string;
          organizationId: string;
          result?: {
            duration?: number;
            error?: string;
            outputs?: Record<string, any>;
            success: boolean;
            tileResults?: Array<{
              duration?: number;
              error?: string;
              result?: any;
              status: string;
              tileId: string;
            }>;
          };
          startedAt?: number;
          status: "pending" | "running" | "completed" | "failed" | "cancelled";
          variables: Record<string, any>;
          workflowId?: string;
        } | null,
        Name
      >;
      vaultContext: FunctionReference<
        "mutation",
        "internal",
        { browserbaseContextId: string; organizationId: string },
        null,
        Name
      >;
      vaultEnable: FunctionReference<
        "mutation",
        "internal",
        {
          encryptedMachineKey: string;
          machineKeyIv: string;
          organizationId: string;
          workosM2MClientId?: string;
        },
        {
          automationEnabled: boolean;
          browserbaseContextId?: string;
          createdAt: number;
          encryptedMachineKey?: string;
          encryptedVaultKey: string;
          iterations: number;
          machineKeyIv?: string;
          organizationId: string;
          salt: string;
          updatedAt: number;
          vaultKeyIv: string;
          verificationHash: string;
          workosM2MClientId?: string;
        } | null,
        Name
      >;
      vaultGet: FunctionReference<
        "query",
        "internal",
        { organizationId: string },
        {
          automationEnabled: boolean;
          browserbaseContextId?: string;
          createdAt: number;
          encryptedMachineKey?: string;
          encryptedVaultKey: string;
          iterations: number;
          machineKeyIv?: string;
          organizationId: string;
          salt: string;
          updatedAt: number;
          vaultKeyIv: string;
          verificationHash: string;
          workosM2MClientId?: string;
        } | null,
        Name
      >;
      vaultSetup: FunctionReference<
        "mutation",
        "internal",
        {
          encryptedVaultKey: string;
          iterations: number;
          organizationId: string;
          salt: string;
          vaultKeyIv: string;
          verificationHash: string;
        },
        {
          automationEnabled: boolean;
          browserbaseContextId?: string;
          createdAt: number;
          encryptedMachineKey?: string;
          encryptedVaultKey: string;
          iterations: number;
          machineKeyIv?: string;
          organizationId: string;
          salt: string;
          updatedAt: number;
          vaultKeyIv: string;
          verificationHash: string;
          workosM2MClientId?: string;
        },
        Name
      >;
      vaultUnlock: FunctionReference<
        "query",
        "internal",
        { organizationId: string },
        {
          automationEnabled: boolean;
          browserbaseContextId?: string;
          createdAt: number;
          encryptedMachineKey?: string;
          encryptedVaultKey: string;
          iterations: number;
          machineKeyIv?: string;
          organizationId: string;
          salt: string;
          updatedAt: number;
          vaultKeyIv: string;
          verificationHash: string;
          workosM2MClientId?: string;
        } | null,
        Name
      >;
    };
  };
