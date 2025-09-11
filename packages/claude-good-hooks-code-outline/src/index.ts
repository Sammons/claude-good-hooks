import * as fs from 'fs';
import * as path from 'path';
import type { HookPlugin } from '@sammons/claude-good-hooks-types';
import { generateCodeOutlineScript } from './script-generator';

const codeOutlineHook: HookPlugin = {
  name: 'code-outline',
  description: 'Generates code structure outline using code-outline-cli at session start',
  version: '1.0.0',
  customArgs: {
    format: {
      description: 'Output format for code outline',
      type: 'string',
      default: 'compressed',
    },
    depth: {
      description: 'Maximum depth to scan (optional)',
      type: 'number',
      default: undefined,
    },
    includeAll: {
      description: 'Include all nodes in the outline',
      type: 'boolean',
      default: false,
    },
    compress: {
      description: 'Compress the output for token efficiency (default: true)',
      type: 'boolean',
      default: true,
    },
    autoDetectProject: {
      description: 'Automatically detect project type and use appropriate patterns',
      type: 'boolean',
      default: true,
    },
    customPatterns: {
      description: 'Custom glob patterns to override auto-detection (comma-separated)',
      type: 'string',
      default: undefined,
    },
  },
  makeHook: (args: Record<string, unknown>, context: { settingsDirectoryPath: string }) => {
    // Validate that settingsDirectoryPath exists
    if (!context.settingsDirectoryPath) {
      throw new Error('settingsDirectoryPath is required but was not provided');
    }

    if (!fs.existsSync(context.settingsDirectoryPath)) {
      throw new Error(`Settings directory does not exist: ${context.settingsDirectoryPath}`);
    }

    // Parse and validate arguments
    const format = validateFormat(args.format);
    const depth = args.depth ? validateDepth(args.depth) : undefined;
    const includeAll = Boolean(args.includeAll);
    const compress = args.compress !== false; // Default to true
    const customPatterns = args.customPatterns ? String(args.customPatterns) : undefined;

    // Create scripts subdirectory if it doesn't exist
    const scriptsDir = path.join(context.settingsDirectoryPath, 'scripts');
    try {
      if (!fs.existsSync(scriptsDir)) {
        fs.mkdirSync(scriptsDir, { recursive: true });
      }
    } catch (error) {
      throw new Error(
        `Failed to create scripts directory: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // Determine project type and patterns
    let patterns: string[];

    if (customPatterns) {
      // Use custom patterns provided by user
      patterns = customPatterns.split(',').map(pattern => pattern.trim());
    } else {
      // Default patterns for JavaScript/TypeScript projects
      patterns = [
        '**/*.{js,ts,jsx,tsx}',
        '!node_modules/**',
        '!dist/**',
        '!build/**',
        '!coverage/**',
      ];
    }

    // Find the node_modules path for this package
    let modulePath: string;
    try {
      // Resolve the path to the code-outline-cli module
      const cliPath = require.resolve('@sammons/code-outline-cli/package.json');
      // Get the node_modules directory (go up two levels from package.json)
      modulePath = path.dirname(path.dirname(cliPath));
    } catch (error) {
      throw new Error(
        `Failed to locate @sammons/code-outline-cli: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // Generate the script content
    const scriptContent = generateCodeOutlineScript({
      format,
      depth,
      includeAll,
      compress,
      patterns,
      modulePath,
      settingsPath: context.settingsDirectoryPath,
    });

    // Write the script file
    const scriptPath = path.join(scriptsDir, 'code-outline-hook.js');
    try {
      fs.writeFileSync(scriptPath, scriptContent, { mode: 0o755 });
    } catch (error) {
      throw new Error(
        `Failed to write script file: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // Build the command
    const command = `$CLAUDE_PROJECT_DIR/.claude/scripts/code-outline-hook.js`;

    return {
      SessionStart: [
        {
          hooks: [
            {
              type: 'command',
              command,
              timeout: 45000, // 45 seconds timeout for larger codebases
            },
          ],
        },
      ],
    };
  },
};

/**
 * Validates the format argument
 */
function validateFormat(format: unknown): 'ascii' | 'json' | 'yaml' | 'compressed' {
  const validFormats = ['ascii', 'json', 'yaml', 'compressed'] as const;

  if (
    typeof format === 'string' &&
    validFormats.includes(format as (typeof validFormats)[number])
  ) {
    return format as 'ascii' | 'json' | 'yaml' | 'compressed';
  }

  return 'compressed'; // Default format for token efficiency
}

/**
 * Validates the depth argument
 */
function validateDepth(depth: unknown): number | undefined {
  if (typeof depth === 'number' && depth > 0 && Number.isInteger(depth)) {
    return depth;
  }

  if (typeof depth === 'string') {
    const parsed = parseInt(depth, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return undefined;
}

// Default export - the main code-outline hook
export default codeOutlineHook;

// Named export for deep imports
export const codeOutline = codeOutlineHook;

// Additional specialized hooks that can be accessed via deep imports
// Example: @sammons/claude-good-hooks-code-outline/minimal
export const minimal: HookPlugin = {
  ...codeOutlineHook,
  name: 'code-outline-minimal',
  description: 'Minimal code outline - compressed format with top-level structure only',
  makeHook: (args: Record<string, unknown>, context: { settingsDirectoryPath: string }) => {
    // Force minimal settings
    const minimalArgs = {
      ...args,
      depth: 2, // Only show top 2 levels
      format: 'compressed',
      compress: true,
      includeAll: false,
    };
    return codeOutlineHook.makeHook(minimalArgs, context);
  },
};

// Example: @sammons/claude-good-hooks-code-outline/detailed
export const detailed: HookPlugin = {
  ...codeOutlineHook,
  name: 'code-outline-detailed',
  description: 'Detailed code outline - includes all nodes with JSON output',
  makeHook: (args: Record<string, unknown>, context: { settingsDirectoryPath: string }) => {
    // Force detailed settings
    const detailedArgs = {
      ...args,
      format: 'json',
      includeAll: true,
      depth: undefined, // No depth limit
    };
    return codeOutlineHook.makeHook(detailedArgs, context);
  },
};

// Example: @sammons/claude-good-hooks-code-outline/typescript
export const typescript: HookPlugin = {
  ...codeOutlineHook,
  name: 'code-outline-typescript',
  description: 'TypeScript-specific code outline',
  makeHook: (args: Record<string, unknown>, context: { settingsDirectoryPath: string }) => {
    // Force TypeScript-specific patterns
    const tsArgs = {
      ...args,
      customPatterns: '**/*.{ts,tsx},!**/*.js,!**/*.jsx,!node_modules/**,!dist/**,!build/**',
    };
    return codeOutlineHook.makeHook(tsArgs, context);
  },
};
