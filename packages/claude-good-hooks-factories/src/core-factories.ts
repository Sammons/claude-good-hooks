import type {
  HookCommand,
  HookConfiguration,
  HookPlugin,
  ClaudeSettings,
} from '@sammons/claude-good-hooks-types';

/**
 * Creates a hook command with optional timeout
 *
 * @param command - The shell command to execute
 * @param timeout - Optional timeout in seconds
 * @returns A properly typed HookCommand
 *
 * @example
 * ```typescript
 * const command = createHookCommand('echo "Hello World"');
 * const commandWithTimeout = createHookCommand('npm test', 30);
 * ```
 */
export function createHookCommand(command: string, timeout?: number): HookCommand {
  if (!command || typeof command !== 'string') {
    throw new Error('Command must be a non-empty string');
  }

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
 * Creates a hook configuration with optional matcher and hooks
 *
 * @param matcher - Optional pattern to match tool names (for PreToolUse/PostToolUse events)
 * @param hooks - Array of hook commands or a single hook command
 * @returns A properly typed HookConfiguration
 *
 * @example
 * ```typescript
 * const config = createHookConfiguration('Write', [
 *   createHookCommand('echo "File written"')
 * ]);
 *
 * const configWithoutMatcher = createHookConfiguration(undefined, [
 *   createHookCommand('echo "Event triggered"')
 * ]);
 * ```
 */
export function createHookConfiguration(
  matcher?: string,
  hooks: HookCommand[] | HookCommand = []
): HookConfiguration {
  const hookArray = Array.isArray(hooks) ? hooks : [hooks];

  if (hookArray.length === 0) {
    throw new Error('At least one hook command must be provided');
  }

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
 * Creates a hook plugin with metadata and configuration generator
 *
 * @param name - Plugin name
 * @param description - Plugin description
 * @param version - Plugin version
 * @param makeHook - Function that generates hook configurations from arguments
 * @returns A properly typed HookPlugin
 *
 * @example
 * ```typescript
 * const plugin = createHookPlugin(
 *   'file-watcher',
 *   'Watches files and runs commands on changes',
 *   '1.0.0',
 *   (args) => ({
 *     PostToolUse: [
 *       createHookConfiguration('Write', [
 *         createHookCommand(`echo "File ${args.pattern} changed"`)
 *       ])
 *     ]
 *   })
 * );
 * ```
 */
export function createHookPlugin(
  name: string,
  description: string,
  version: string,
  makeHook: HookPlugin['makeHook']
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

  if (typeof makeHook !== 'function') {
    throw new Error('makeHook must be a function');
  }

  return {
    name,
    description,
    version,
    makeHook,
  };
}

/**
 * Creates a complete Claude settings object with hooks
 *
 * @param hooks - Object containing hook configurations for different events
 * @returns A properly typed ClaudeSettings object
 *
 * @example
 * ```typescript
 * const settings = createClaudeSettings({
 *   PostToolUse: [
 *     createHookConfiguration('Write', [
 *       createHookCommand('echo "File operation completed"')
 *     ])
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
