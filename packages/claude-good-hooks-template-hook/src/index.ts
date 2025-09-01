import type { HookPlugin, ClaudeSettings } from '@sammons/claude-good-hooks-types';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Template Hook for Claude Code
 * 
 * This template demonstrates how to create a custom hook plugin for Claude Code.
 * It includes examples of:
 * - Custom arguments with validation
 * - Dynamic hook generation based on arguments
 * - Multiple hook events (PreToolUse, PostToolUse)
 * - Proper TypeScript typing
 * - Error handling and fallbacks
 * 
 * To create your own hook:
 * 1. Change the 'name' property to your hook's unique identifier
 * 2. Update the description to match your hook's purpose
 * 3. Modify customArgs to define the arguments your hook accepts
 * 4. Implement your logic in the makeHook function
 * 5. Export your hook as the default export
 */
const templateHook: HookPlugin = {
  name: 'template', // Change this to your hook's unique identifier
  description: 'A template hook for Claude Code',
  get version() {
    try {
      const packageJsonPath = resolve(__dirname, '../package.json');
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      return packageJson.version;
    } catch (error) {
      // Fallback to hardcoded version if package.json cannot be read
      return '1.0.0';
    }
  },

  /**
   * Define custom arguments that users can pass when applying the hook.
   * These arguments allow users to customize the hook's behavior.
   */
  customArgs: {
    verbose: {
      description: 'Enable verbose output',
      type: 'boolean',
      default: false,
    },
    logFile: {
      description: 'Path to log file',
      type: 'string',
      default: '/tmp/hook.log',
    },
    timeout: {
      description: 'Command timeout in seconds',
      type: 'number',
      default: 5,
    },
  },

  /**
   * Generate hook configuration based on user-provided arguments.
   * This function demonstrates various hook patterns and best practices.
   */
  makeHook: (args: Record<string, any>): NonNullable<ClaudeSettings['hooks']> => {
    // Validate and sanitize arguments with proper defaults
    const safeArgs = {
      verbose: Boolean(args.verbose ?? false),
      logFile: String(args.logFile || '/tmp/hook.log'),
      timeout: Math.max(1, Number(args.timeout || 5)), // Ensure minimum 1 second
    };

    const hooks: NonNullable<ClaudeSettings['hooks']> = {
      PreToolUse: [],
      PostToolUse: [],
    };

    // Example: Add verbose logging hook if enabled
    if (safeArgs.verbose) {
      hooks.PreToolUse!.push({
        matcher: '*',
        hooks: [
          {
            type: 'command',
            command: `echo "Verbose mode enabled, logging to ${safeArgs.logFile}"`,
            timeout: safeArgs.timeout * 1000,
          },
        ],
      });
    }

    // Add the default PreToolUse hook for file modifications
    hooks.PreToolUse!.push({
      matcher: 'Write|Edit',
      hooks: [
        {
          type: 'command',
          command: safeArgs.verbose
            ? `echo "[$(date)] File modification" >> ${safeArgs.logFile}`
            : 'echo "About to modify a file"',
          timeout: safeArgs.timeout * 1000,
        },
      ],
    });

    // Add the default PostToolUse hook for shell commands
    hooks.PostToolUse!.push({
      matcher: 'Bash',
      hooks: [
        {
          type: 'command',
          command: safeArgs.verbose
            ? `echo "[$(date)] Command executed" >> ${safeArgs.logFile}`
            : 'echo "Command executed"',
          timeout: safeArgs.timeout * 1000,
        },
      ],
    });

    return hooks;
  },
};

/**
 * Export the hook as default.
 * 
 * This allows the hook to be imported and used by the Claude Good Hooks system.
 * The hook can be applied using the CLI tool or programmatically.
 * 
 * Example usage:
 * ```bash
 * claude-good-hooks apply template --verbose=true --timeout=10
 * ```
 * 
 * Or programmatically:
 * ```typescript
 * import templateHook from '@sammons/claude-good-hooks-template-hook';
 * const hookConfig = templateHook.makeHook({ verbose: true, timeout: 10 });
 * ```
 */
export default templateHook;
