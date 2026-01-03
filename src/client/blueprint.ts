/**
 * @trestleinc/crane - Client Blueprint Builder
 *
 * Functional builder for creating blueprints with a fluent API.
 * Returns immutable draft objects at each step.
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Tile types supported by blueprints.
 */
export type TileType =
	| "NAVIGATE"
	| "CLICK"
	| "TYPE"
	| "EXTRACT"
	| "SCREENSHOT"
	| "WAIT"
	| "SELECT"
	| "FORM"
	| "AUTH";

/**
 * A tile in a blueprint.
 */
export type Tile = {
	id: string;
	type: TileType;
	label: string;
	description?: string;
	position: { x: number; y: number };
	parameters: Record<string, unknown>;
	connections: { input: string | null; output: string | null };
};

/**
 * Input field definition for a blueprint.
 */
export type InputField = {
	name: string;
	type: string;
	required: boolean;
	description?: string;
};

/**
 * A complete blueprint definition.
 */
export type Blueprint = {
	name: string;
	description?: string;
	tiles: Tile[];
	metadata: {
		tags?: string[];
		inputSchema: InputField[];
	};
};

/**
 * Type options for TYPE tiles.
 */
export type TypeOptions = {
	value?: string;
	variable?: string;
	credentialField?: "username" | "password" | string;
};

/**
 * Field definition for FORM tiles.
 */
export type FormField = {
	instruction: string;
	value?: string;
	variable?: string;
};

/**
 * Screenshot options for SCREENSHOT tiles.
 */
export type ScreenshotOptions = {
	fullPage?: boolean;
};

// ============================================================================
// Draft Builder Type
// ============================================================================

/**
 * Blueprint draft with builder methods.
 * Each method returns a new immutable draft.
 */
export type BlueprintDraft = {
	/** Add an input field to the blueprint schema */
	input: (
		name: string,
		type: string,
		required: boolean,
		description?: string,
	) => BlueprintDraft;

	/** Add a NAVIGATE tile */
	navigate: (
		url: string,
		options?: {
			waitUntil?: "load" | "domcontentloaded" | "networkidle";
			timeout?: number;
		},
	) => BlueprintDraft;

	/** Add an AUTH tile for automated login */
	auth: () => BlueprintDraft;

	/** Add a TYPE tile */
	type: (instruction: string, options: TypeOptions) => BlueprintDraft;

	/** Add a CLICK tile */
	click: (instruction: string) => BlueprintDraft;

	/** Add a SCREENSHOT tile */
	screenshot: (options?: ScreenshotOptions) => BlueprintDraft;

	/** Add an EXTRACT tile */
	extract: (
		instruction: string,
		outputVariable: string,
		schema?: unknown,
	) => BlueprintDraft;

	/** Add a WAIT tile */
	wait: (ms: number) => BlueprintDraft;

	/** Add a SELECT tile */
	select: (instruction: string, value: string) => BlueprintDraft;

	/** Add a FORM tile */
	form: (fields: FormField[]) => BlueprintDraft;

	/** Set description for the blueprint */
	describe: (description: string) => BlueprintDraft;

	/** Add tags to the blueprint */
	tag: (...tags: string[]) => BlueprintDraft;

	/** Build the final blueprint */
	build: () => Blueprint;
};

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Generate a unique tile ID.
 */
function generateTileId(): string {
	return `tile_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Create a draft builder from current state.
 */
function createDraft(
	name: string,
	description: string | undefined,
	tiles: Tile[],
	inputSchema: InputField[],
	tags: string[],
): BlueprintDraft {
	// Calculate position for next tile (vertical layout)
	const nextY = tiles.length * 120;
	const lastTile = tiles[tiles.length - 1];

	/**
	 * Add a tile and return new draft.
	 */
	const addTile = (
		type: TileType,
		label: string,
		parameters: Record<string, unknown>,
		tileDescription?: string,
	): BlueprintDraft => {
		const id = generateTileId();
		const newTile: Tile = {
			id,
			type,
			label,
			description: tileDescription,
			position: { x: 0, y: nextY },
			parameters,
			connections: {
				input: lastTile?.id ?? null,
				output: null,
			},
		};

		// Update previous tile's output connection
		const updatedTiles = tiles.map((t) =>
			t.id === lastTile?.id
				? { ...t, connections: { ...t.connections, output: id } }
				: t,
		);

		return createDraft(
			name,
			description,
			[...updatedTiles, newTile],
			inputSchema,
			tags,
		);
	};

	return {
		input: (fieldName, fieldType, required, fieldDescription) => {
			const newField: InputField = {
				name: fieldName,
				type: fieldType,
				required,
				description: fieldDescription,
			};
			return createDraft(
				name,
				description,
				tiles,
				[...inputSchema, newField],
				tags,
			);
		},

		navigate: (url, options) =>
			addTile(
				"NAVIGATE",
				`Navigate to ${url.slice(0, 30)}${url.length > 30 ? "..." : ""}`,
				{
					url,
					waitUntil: options?.waitUntil ?? "load",
					timeout: options?.timeout ?? 30000,
				},
			),

		auth: () => addTile("AUTH", "Authenticate", {}),

		type: (instruction, options) =>
			addTile(
				"TYPE",
				`Type: ${instruction.slice(0, 30)}${instruction.length > 30 ? "..." : ""}`,
				{
					instruction,
					...options,
				},
			),

		click: (instruction) =>
			addTile(
				"CLICK",
				`Click: ${instruction.slice(0, 30)}${instruction.length > 30 ? "..." : ""}`,
				{
					instruction,
				},
			),

		screenshot: (options) =>
			addTile("SCREENSHOT", "Take screenshot", {
				fullPage: options?.fullPage ?? false,
			}),

		extract: (instruction, outputVariable, schema) =>
			addTile("EXTRACT", `Extract: ${outputVariable}`, {
				instruction,
				outputVariable,
				schema,
			}),

		wait: (ms) => addTile("WAIT", `Wait ${ms}ms`, { ms }),

		select: (instruction, value) =>
			addTile(
				"SELECT",
				`Select: ${value.slice(0, 30)}${value.length > 30 ? "..." : ""}`,
				{
					instruction,
					value,
				},
			),

		form: (fields) =>
			addTile("FORM", `Fill form (${fields.length} fields)`, {
				fields,
			}),

		describe: (desc) => createDraft(name, desc, tiles, inputSchema, tags),

		tag: (...newTags) =>
			createDraft(name, description, tiles, inputSchema, [...tags, ...newTags]),

		build: (): Blueprint => ({
			name,
			description,
			tiles,
			metadata: {
				tags: tags.length > 0 ? tags : undefined,
				inputSchema,
			},
		}),
	};
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Blueprint builder with fluent API.
 *
 * @example
 * ```typescript
 * import { blueprint } from '@trestleinc/crane/client';
 *
 * const submitIntake = blueprint
 *   .create('submit-intake')
 *   .describe('Submit beneficiary intake form')
 *   .input('portalUrl', 'string', true)
 *   .input('firstName', 'string', true)
 *   .input('lastName', 'string', true)
 *   .navigate('{{portalUrl}}')
 *   .auth()
 *   .type('first name field', { variable: 'firstName' })
 *   .type('last name field', { variable: 'lastName' })
 *   .click('submit button')
 *   .screenshot()
 *   .extract('confirmation number', 'confirmationNumber')
 *   .build();
 *
 * // Use with Convex
 * await ctx.runMutation(api.crane.blueprint.create, {
 *   organizationId: org.id,
 *   ...submitIntake,
 * });
 * ```
 */
export const blueprint = {
	/**
	 * Create a new blueprint draft.
	 */
	create: (name: string): BlueprintDraft =>
		createDraft(name, undefined, [], [], []),
} as const;
