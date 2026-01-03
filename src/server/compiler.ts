/**
 * @trestleinc/crane - Blueprint Compiler
 *
 * Transforms Blueprint JSON into executable TypeScript code.
 * Generated code uses the Adapter abstraction and can run independently.
 */

import type { Blueprint, Tile } from "$/shared/validators";
import type { CompiledBlueprint, CompileOptions } from "./types";

// ============================================================================
// Types
// ============================================================================

type GeneratorContext = {
	includeComments: boolean;
	indentation: number;
	inputVars: Set<string>;
	outputVars: Set<string>;
};

// ============================================================================
// Utilities
// ============================================================================

/**
 * Extract {{variable}} patterns from a template string.
 */
function extractVariables(template: string, vars: Set<string>): void {
	const matches = template.matchAll(/\{\{(\w+)\}\}/g);
	for (const match of matches) {
		vars.add(match[1]);
	}
}

/**
 * Escape string for use in generated code.
 */
function escapeString(str: string): string {
	return str
		.replace(/\\/g, "\\\\")
		.replace(/"/g, '\\"')
		.replace(/\n/g, "\\n")
		.replace(/\r/g, "\\r")
		.replace(/\t/g, "\\t");
}

/**
 * Sort tiles by their connection order (start to end).
 */
function sortTiles(tiles: Tile[]): Tile[] {
	const startTile = tiles.find((t) => t.connections.input === null);
	if (!startTile) return tiles;

	const sorted: Tile[] = [];
	const visited = new Set<string>();
	let current: Tile | undefined = startTile;

	while (current && !visited.has(current.id)) {
		sorted.push(current);
		visited.add(current.id);
		const nextId: string | null = current.connections.output;
		if (nextId) {
			current = tiles.find((t) => t.id === nextId);
		} else {
			break;
		}
	}

	return sorted;
}

// ============================================================================
// Tile Code Generators
// ============================================================================

function generateNavigate(tile: Tile, ctx: GeneratorContext): string {
	const url = tile.parameters.url as string;
	const waitUntil = tile.parameters.waitUntil as string | undefined;
	const timeout = tile.parameters.timeout as number | undefined;

	extractVariables(url, ctx.inputVars);

	const opts: string[] = [];
	if (waitUntil) opts.push(`waitUntil: "${waitUntil}"`);
	if (timeout) opts.push(`timeout: ${timeout}`);
	const optsStr = opts.length > 0 ? `, { ${opts.join(", ")} }` : "";

	const comment = ctx.includeComments
		? `  // NAVIGATE: ${escapeString(tile.label)}\n`
		: "";
	return `${comment}  await adapter.navigate(interpolate("${escapeString(url)}", variables)${optsStr});`;
}

function generateClick(tile: Tile, ctx: GeneratorContext): string {
	const instruction = tile.parameters.instruction as string;
	extractVariables(instruction, ctx.inputVars);

	const comment = ctx.includeComments
		? `  // CLICK: ${escapeString(tile.label)}\n`
		: "";
	return `${comment}  {
    const result = await adapter.act(\`Click on \${interpolate("${escapeString(instruction)}", variables)}\`);
    if (!result.success) {
      throw new Error(\`CLICK failed: \${result.message}\`);
    }
  }`;
}

function generateType(tile: Tile, ctx: GeneratorContext): string {
	const instruction = tile.parameters.instruction as string;
	const value = tile.parameters.value as string | undefined;
	const variable = tile.parameters.variable as string | undefined;
	const credentialField = tile.parameters.credentialField as string | undefined;

	extractVariables(instruction, ctx.inputVars);
	if (value) extractVariables(value, ctx.inputVars);
	if (variable) ctx.inputVars.add(variable);

	const comment = ctx.includeComments
		? `  // TYPE: ${escapeString(tile.label)}\n`
		: "";

	if (credentialField) {
		return `${comment}  {
    const currentUrl = await adapter.currentUrl();
    const domain = new URL(currentUrl).hostname;
    const cred = await credentials?.(domain);
    if (!cred) {
      throw new Error(\`No credentials for domain: \${domain}\`);
    }
    const value = ${credentialField === "username" ? "cred.username" : credentialField === "password" ? "cred.password" : `cred.fields?.["${escapeString(credentialField)}"] ?? ""`};
    const result = await adapter.act(\`Type "\${value}" into \${interpolate("${escapeString(instruction)}", variables)}\`);
    if (!result.success) {
      throw new Error(\`TYPE failed: \${result.message}\`);
    }
  }`;
	}

	if (variable) {
		return `${comment}  {
    const value = String(variables["${escapeString(variable)}"] ?? "");
    const result = await adapter.act(\`Type "\${value}" into \${interpolate("${escapeString(instruction)}", variables)}\`);
    if (!result.success) {
      throw new Error(\`TYPE failed: \${result.message}\`);
    }
  }`;
	}

	if (value) {
		return `${comment}  {
    const value = interpolate("${escapeString(value)}", variables);
    const result = await adapter.act(\`Type "\${value}" into \${interpolate("${escapeString(instruction)}", variables)}\`);
    if (!result.success) {
      throw new Error(\`TYPE failed: \${result.message}\`);
    }
  }`;
	}

	return `${comment}  {
    const result = await adapter.act(\`Type "" into \${interpolate("${escapeString(instruction)}", variables)}\`);
    if (!result.success) {
      throw new Error(\`TYPE failed: \${result.message}\`);
    }
  }`;
}

function generateAuth(tile: Tile, ctx: GeneratorContext): string {
	const comment = ctx.includeComments
		? `  // AUTH: ${escapeString(tile.label)}\n`
		: "";
	return `${comment}  {
    if (!credentials) {
      throw new Error("AUTH tile requires credential resolver");
    }
    const currentUrl = await adapter.currentUrl();
    const domain = new URL(currentUrl).hostname;
    const cred = await credentials(domain);
    if (!cred) {
      throw new Error(\`No credentials for domain: \${domain}\`);
    }

    const usernameResult = await adapter.act(\`Type "\${cred.username}" into the username or email field\`);
    if (!usernameResult.success) {
      throw new Error(\`AUTH username failed: \${usernameResult.message}\`);
    }

    const passwordResult = await adapter.act(\`Type "\${cred.password}" into the password field\`);
    if (!passwordResult.success) {
      throw new Error(\`AUTH password failed: \${passwordResult.message}\`);
    }

    const submitResult = await adapter.act("Click the login or sign in button");
    if (!submitResult.success) {
      throw new Error(\`AUTH submit failed: \${submitResult.message}\`);
    }
  }`;
}

function generateExtract(tile: Tile, ctx: GeneratorContext): string {
	const instruction = tile.parameters.instruction as string;
	const outputVariable = tile.parameters.outputVariable as string;
	const schema = tile.parameters.schema;

	extractVariables(instruction, ctx.inputVars);
	ctx.outputVars.add(outputVariable);

	const schemaStr = schema ? `, ${JSON.stringify(schema)}` : "";
	const comment = ctx.includeComments
		? `  // EXTRACT: ${escapeString(tile.label)}\n`
		: "";
	return `${comment}  outputs["${escapeString(outputVariable)}"] = await adapter.extract(interpolate("${escapeString(instruction)}", variables)${schemaStr});`;
}

function generateScreenshot(tile: Tile, ctx: GeneratorContext): string {
	const fullPage = tile.parameters.fullPage as boolean | undefined;
	const comment = ctx.includeComments
		? `  // SCREENSHOT: ${escapeString(tile.label)}\n`
		: "";
	return `${comment}  await adapter.screenshot({ fullPage: ${fullPage ?? false} });`;
}

function generateWait(tile: Tile, ctx: GeneratorContext): string {
	const ms = tile.parameters.ms as number;
	const comment = ctx.includeComments
		? `  // WAIT: ${escapeString(tile.label)}\n`
		: "";
	return `${comment}  await new Promise(resolve => setTimeout(resolve, ${ms}));`;
}

function generateSelect(tile: Tile, ctx: GeneratorContext): string {
	const instruction = tile.parameters.instruction as string;
	const value = tile.parameters.value as string;

	extractVariables(instruction, ctx.inputVars);
	extractVariables(value, ctx.inputVars);

	const comment = ctx.includeComments
		? `  // SELECT: ${escapeString(tile.label)}\n`
		: "";
	return `${comment}  {
    const result = await adapter.act(\`Select "\${interpolate("${escapeString(value)}", variables)}" from \${interpolate("${escapeString(instruction)}", variables)}\`);
    if (!result.success) {
      throw new Error(\`SELECT failed: \${result.message}\`);
    }
  }`;
}

function generateForm(tile: Tile, ctx: GeneratorContext): string {
	const fields = tile.parameters.fields as Array<{
		instruction: string;
		value?: string;
		variable?: string;
	}>;

	const fieldCode = fields
		.map((field, i) => {
			extractVariables(field.instruction, ctx.inputVars);
			if (field.value) extractVariables(field.value, ctx.inputVars);
			if (field.variable) ctx.inputVars.add(field.variable);

			let valueExpr: string;
			if (field.value) {
				valueExpr = `interpolate("${escapeString(field.value)}", variables)`;
			} else if (field.variable) {
				valueExpr = `String(variables["${escapeString(field.variable)}"] ?? "")`;
			} else {
				valueExpr = '""';
			}

			return `    // Field ${i + 1}: ${escapeString(field.instruction)}
    {
      const value = ${valueExpr};
      const result = await adapter.act(\`Type "\${value}" into \${interpolate("${escapeString(field.instruction)}", variables)}\`);
      if (!result.success) {
        throw new Error(\`FORM field "${escapeString(field.instruction)}" failed: \${result.message}\`);
      }
    }`;
		})
		.join("\n\n");

	const comment = ctx.includeComments
		? `  // FORM: ${escapeString(tile.label)}\n`
		: "";
	return `${comment}  {
${fieldCode}
  }`;
}

/**
 * Generate code for a single tile.
 */
function generateTileCode(tile: Tile, ctx: GeneratorContext): string {
	switch (tile.type) {
		case "NAVIGATE":
			return generateNavigate(tile, ctx);
		case "CLICK":
			return generateClick(tile, ctx);
		case "TYPE":
			return generateType(tile, ctx);
		case "AUTH":
			return generateAuth(tile, ctx);
		case "EXTRACT":
			return generateExtract(tile, ctx);
		case "SCREENSHOT":
			return generateScreenshot(tile, ctx);
		case "WAIT":
			return generateWait(tile, ctx);
		case "SELECT":
			return generateSelect(tile, ctx);
		case "FORM":
			return generateForm(tile, ctx);
		default:
			return `  // Unknown tile type: ${tile.type}`;
	}
}

// ============================================================================
// Main Compiler
// ============================================================================

/**
 * Compile a blueprint into executable TypeScript code.
 *
 * @example
 * ```typescript
 * import { compile } from "@trestleinc/crane/server";
 *
 * const blueprint = await api.blueprint.get(blueprintId);
 * const { code, inputVariables, outputVariables } = compile(blueprint);
 *
 * // Write to file
 * await fs.writeFile("generated/execute.ts", code);
 * ```
 */
export function compile(
	blueprint: Blueprint,
	options: CompileOptions = {},
): CompiledBlueprint {
	const {
		functionName = "execute",
		includeComments = true,
		indentation = 2,
	} = options;

	const ctx: GeneratorContext = {
		includeComments,
		indentation,
		inputVars: new Set(),
		outputVars: new Set(),
	};

	// Sort tiles by execution order
	const sortedTiles = sortTiles(blueprint.tiles);

	// Generate tile code
	const tileCode = sortedTiles
		.map((tile) => generateTileCode(tile, ctx))
		.join("\n\n");

	// Build the full code
	const description = blueprint.description
		? `\n * ${escapeString(blueprint.description)}`
		: "";

	const code = `import type { Adapter, CredentialResolver } from "@trestleinc/crane/server";

/**
 * Generated from blueprint: ${escapeString(blueprint.name)}${description}
 */
export async function ${functionName}(
  adapter: Adapter,
  variables: Record<string, unknown>,
  credentials?: CredentialResolver
): Promise<{ outputs: Record<string, unknown> }> {
  const outputs: Record<string, unknown> = {};

${tileCode}

  return { outputs };
}

function interpolate(template: string, vars: Record<string, unknown>): string {
  return template.replace(/\\{\\{(\\w+)\\}\\}/g, (_, key) =>
    vars[key] !== undefined ? String(vars[key]) : \`{{\${key}}}\`
  );
}
`;

	return {
		code,
		functionName,
		inputVariables: Array.from(ctx.inputVars),
		outputVariables: Array.from(ctx.outputVars),
	};
}
