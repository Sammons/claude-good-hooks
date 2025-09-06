import type {
  HookCommand,
  HookConfiguration,
  HookPlugin,
  ClaudeSettings,
} from '@sammons/claude-good-hooks-types';

/**
 * Configuration options for creating hook commands
 */
export interface HookCommandOptions {
  /** Timeout in seconds for the command */
  timeout?: number;
}

/**
 * Configuration options for creating hook configurations
 */
export interface HookConfigOptions {
  /** Tool matcher pattern (for PreToolUse/PostToolUse events) */
  matcher?: string;
}

/**
 * Configuration options for creating hook plugins
 */
export interface HookPluginOptions {
  /** Custom arguments schema for the hook */
  customArgs?: HookPlugin['customArgs'];
}

/**
 * Creates a hook command with validation and defaults
 * 
 * This is a core building block for hook authors to create individual commands
 * that will be executed by Claude Code.
 *
 * @param command - The shell command to execute
 * @param options - Optional configuration
 * @returns A properly typed HookCommand
 *
 * @example
 * ```typescript
 * // Simple command
 * const command = createHookCommand('echo "Hello World"');
 * 
 * // Command with timeout
 * const commandWithTimeout = createHookCommand('npm test', { timeout: 30 });
 * ```
 */
export function createHookCommand(command: string, options: HookCommandOptions = {}): HookCommand {
  if (!command || typeof command !== 'string') {
    throw new Error('Command must be a non-empty string');
  }

  const { timeout } = options;

  if (timeout !== undefined && (typeof timeout !== 'number' || timeout <= 0)) {
    throw new Error('Timeout must be a positive number');
  }

  const hookCommand: HookCommand = {
    type: 'command',
    command,
  };

  if (timeout !== undefined) {
    hookCommand.timeout = timeout;
  }

  return hookCommand;
}

/**
 * Creates a hook configuration with validation and defaults
 * 
 * Hook configurations group commands together and optionally specify
 * which tools they should match for PreToolUse/PostToolUse events.
 *
 * @param hooks - Array of hook commands or a single hook command
 * @param options - Optional configuration
 * @returns A properly typed HookConfiguration
 *
 * @example
 * ```typescript
 * // Configuration with matcher for file operations
 * const config = createHookConfiguration([
 *   createHookCommand('npm run lint'),
 *   createHookCommand('npm test')
 * ], { matcher: 'Write|Edit' });
 * 
 * // Configuration without matcher (for events like SessionStart)
 * const sessionConfig = createHookConfiguration([
 *   createHookCommand('echo "Session started"')
 * ]);
 * ```
 */
export function createHookConfiguration(
  hooks: HookCommand[] | HookCommand,
  options: HookConfigOptions = {}
): HookConfiguration {
  const hookArray = Array.isArray(hooks) ? hooks : [hooks];

  if (hookArray.length === 0) {
    throw new Error('At least one hook command must be provided');
  }

  const { matcher } = options;

  const config: HookConfiguration = {
    hooks: hookArray,
  };

  if (matcher !== undefined) {
    if (typeof matcher !== 'string') {
      throw new Error('Matcher must be a string');
    }
    config.matcher = matcher;
  }

  return config;
}

/**
 * Creates a hook plugin with comprehensive validation and metadata support
 * 
 * This is the main function hook authors use to create publishable hook modules.
 * The resulting HookPlugin should be the default export of your npm module.
 *
 * @param name - Plugin name (should match your npm package name)
 * @param description - Plugin description for users
 * @param version - Plugin version (semver format, should match package.json)
 * @param makeHook - Function that generates hook configurations from user arguments
 * @param options - Optional metadata and configuration
 * @returns A properly typed HookPlugin
 *
 * @example
 * ```typescript
 * // Create a linter hook module
 * const linterHook = createHookPlugin(
 *   'eslint-hook',
 *   'Runs ESLint on file changes',
 *   '1.0.0',
 *   (args) => ({
 *     PostToolUse: [
 *       createHookConfiguration([
 *         createHookCommand(`npx eslint ${args.pattern || '.'} ${args.fix ? '--fix' : ''}`)
 *       ], { matcher: 'Write|Edit' })
 *     ]
 *   }),
 *   {
 *     customArgs: {
 *       pattern: {
 *         description: 'File pattern to lint',
 *         type: 'string',
 *         default: '.',
 *       },
 *       fix: {
 *         description: 'Automatically fix linting errors',
 *         type: 'boolean',
 *         default: false,
 *       }
 *     }
 *   }
 * );
 * 
 * export default linterHook;
 * ```
 */
export function createHookPlugin(
  name: string,
  description: string,
  version: string,
  makeHook: HookPlugin['makeHook'],
  options: HookPluginOptions = {}
): HookPlugin {
  if (!name || typeof name !== 'string') {
    throw new Error('Plugin name must be a non-empty string');
  }

  if (!description || typeof description !== 'string') {
    throw new Error('Plugin description must be a non-empty string');
  }

  if (!version || typeof version !== 'string') {
    throw new Error('Plugin version must be a non-empty string');
  }

  // Basic semver validation
  const semverRegex = /^\d+\.\d+\.\d+(-[\w.]+)?(\+[\w.]+)?$/;
  if (!semverRegex.test(version)) {
    throw new Error('Plugin version must be in semver format (e.g., "1.0.0")');
  }

  if (typeof makeHook !== 'function') {
    throw new Error('makeHook must be a function');
  }

  const plugin: HookPlugin = {
    name,
    description,
    version,
    makeHook,
  };

  if (options.customArgs) {
    plugin.customArgs = options.customArgs;
  }

  return plugin;
}

/**
 * Creates a complete Claude settings object with hooks
 * 
 * This utility helps hook authors create settings objects for testing
 * or for generating example configurations.
 *
 * @param hooks - Object containing hook configurations for different events
 * @returns A properly typed ClaudeSettings object
 *
 * @example
 * ```typescript
 * // Create settings for testing your hook
 * const testSettings = createClaudeSettings({
 *   PostToolUse: [
 *     createHookConfiguration([
 *       createHookCommand('echo "Test command"')
 *     ], { matcher: 'Write' })
 *   ]
 * });
 * ```
 */
export function createClaudeSettings(hooks?: ClaudeSettings['hooks']): ClaudeSettings {
  const result: ClaudeSettings = {};
  if (hooks !== undefined) {
    result.hooks = hooks;
  }
  return result;
}