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
						parameters: any;
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
				any,
				Name
			>;
			blueprintGet: FunctionReference<
				"query",
				"internal",
				{ id: string },
				any,
				Name
			>;
			blueprintList: FunctionReference<
				"query",
				"internal",
				{ limit?: number; organizationId: string },
				any,
				Name
			>;
			blueprintRemove: FunctionReference<
				"mutation",
				"internal",
				{ id: string },
				any,
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
						parameters: any;
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
				any,
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
				any,
				Name
			>;
			credentialGet: FunctionReference<
				"query",
				"internal",
				{ id: string },
				any,
				Name
			>;
			credentialList: FunctionReference<
				"query",
				"internal",
				{ limit?: number; organizationId: string },
				any,
				Name
			>;
			credentialRemove: FunctionReference<
				"mutation",
				"internal",
				{ id: string },
				any,
				Name
			>;
			credentialResolve: FunctionReference<
				"query",
				"internal",
				{ domain: string; organizationId: string },
				any,
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
				any,
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
						outputs?: any;
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
				any,
				Name
			>;
			executionCreate: FunctionReference<
				"mutation",
				"internal",
				{
					blueprintId: string;
					context?: any;
					organizationId: string;
					variables: any;
				},
				any,
				Name
			>;
			executionGet: FunctionReference<
				"query",
				"internal",
				{ id: string },
				any,
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
				any,
				Name
			>;
			executionStart: FunctionReference<
				"mutation",
				"internal",
				{ id: string },
				any,
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
				null,
				Name
			>;
			vaultGet: FunctionReference<
				"query",
				"internal",
				{ organizationId: string },
				any,
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
				any,
				Name
			>;
			vaultUnlock: FunctionReference<
				"query",
				"internal",
				{ organizationId: string },
				any,
				Name
			>;
		};
	};
