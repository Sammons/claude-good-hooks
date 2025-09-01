import type {
  HookConfiguration,
  ClaudeSettings
} from '@sammons/claude-good-hooks-types';

import { createHookCommand, createHookConfiguration } from './core-factories.js';

/**
 * Hook event types supported by Claude Code
 */
export type HookEventType =
  | 'PreToolUse'
  | 'PostToolUse'
  | 'UserPromptSubmit'
  | 'Notification'
  | 'Stop'
  | 'SubagentStop'
  | 'SessionEnd'
  | 'SessionStart'
  | 'PreCompact';

/**
 * Creates a simple hook that runs a command for a specific event type
 * 
 * @param eventType - The hook event type
 * @param command - The shell command to execute
 * @param matcher - Optional matcher pattern (for PreToolUse/PostToolUse events)
 * @param timeout - Optional timeout in seconds
 * @returns Claude settings object with the configured hook
 * 
 * @example
 * ```typescript
 * const hook = createSimpleHook('PostToolUse', 'echo "File written"', 'Write');
 * const sessionHook = createSimpleHook('SessionStart', 'echo "Session started"');
 * ```
 */
export function createSimpleHook(
  eventType: HookEventType,
  command: string,
  matcher?: string,
  timeout?: number
): ClaudeSettings {
  const hookCommand = createHookCommand(command, timeout);
  const hookConfig = createHookConfiguration(matcher, [hookCommand]);

  return {
    hooks: {
      [eventType]: [hookConfig]
    }
  };
}

/**
 * Creates a file watcher hook that runs commands when specific files are modified
 * 
 * @param patterns - File patterns to watch (tool matcher patterns)
 * @param command - Command to execute when files match
 * @param timeout - Optional timeout in seconds
 * @returns Claude settings object with file watching hooks
 * 
 * @example
 * ```typescript
 * // Watch for any file writes
 * const watcher = createFileWatcherHook(['*'], 'npm run lint');
 * 
 * // Watch for specific file types
 * const tsWatcher = createFileWatcherHook(['*.ts', '*.tsx'], 'npm run type-check');
 * 
 * // Watch for specific tools
 * const editWatcher = createFileWatcherHook(['Edit', 'Write'], 'git add .');
 * ```
 */
export function createFileWatcherHook(
  patterns: string[],
  command: string,
  timeout?: number
): ClaudeSettings {
  if (!patterns || patterns.length === 0) {
    throw new Error('At least one pattern must be provided');
  }

  const hookCommand = createHookCommand(command, timeout);
  const hookConfigurations: HookConfiguration[] = patterns.map(pattern => 
    createHookConfiguration(pattern, [hookCommand])
  );

  return {
    hooks: {
      PostToolUse: hookConfigurations
    }
  };
}

/**
 * Creates a conditional hook that runs different commands based on conditions
 * 
 * @param condition - Shell condition to evaluate (e.g., "test -f package.json")
 * @param trueCommand - Command to run if condition is true
 * @param falseCommand - Command to run if condition is false (optional)
 * @param eventType - Hook event type (default: 'PostToolUse')
 * @param matcher - Optional matcher pattern
 * @param timeout - Optional timeout in seconds
 * @returns Claude settings object with conditional hook
 * 
 * @example
 * ```typescript
 * const conditionalHook = createConditionalHook(
 *   'test -f package.json',
 *   'npm run build',
 *   'echo "No package.json found"'
 * );
 * 
 * const gitHook = createConditionalHook(
 *   'git diff --staged --quiet',
 *   'echo "No staged changes"',
 *   'git add . && git commit -m "Auto-commit"',
 *   'PostToolUse',
 *   'Write'
 * );
 * ```
 */
export function createConditionalHook(
  condition: string,
  trueCommand: string,
  falseCommand?: string,
  eventType: HookEventType = 'PostToolUse',
  matcher?: string,
  timeout?: number
): ClaudeSettings {
  if (!condition || typeof condition !== 'string') {
    throw new Error('Condition must be a non-empty string');
  }

  if (!trueCommand || typeof trueCommand !== 'string') {
    throw new Error('True command must be a non-empty string');
  }

  // Build the conditional command
  let conditionalCommand = `if ${condition}; then ${trueCommand};`;
  if (falseCommand) {
    conditionalCommand += ` else ${falseCommand};`;
  }
  conditionalCommand += ' fi';

  const hookCommand = createHookCommand(conditionalCommand, timeout);
  const hookConfig = createHookConfiguration(matcher, [hookCommand]);

  return {
    hooks: {
      [eventType]: [hookConfig]
    }
  };
}

/**
 * Creates a multi-step hook that runs multiple commands in sequence
 * 
 * @param commands - Array of commands to execute in order
 * @param eventType - Hook event type (default: 'PostToolUse')
 * @param matcher - Optional matcher pattern
 * @param timeout - Optional timeout in seconds (applies to each command)
 * @returns Claude settings object with multi-step hook
 * 
 * @example
 * ```typescript
 * const buildHook = createMultiStepHook([
 *   'npm run lint',
 *   'npm run test',
 *   'npm run build'
 * ], 'PostToolUse', 'Write');
 * ```
 */
export function createMultiStepHook(
  commands: string[],
  eventType: HookEventType = 'PostToolUse',
  matcher?: string,
  timeout?: number
): ClaudeSettings {
  if (!commands || commands.length === 0) {
    throw new Error('At least one command must be provided');
  }

  const hookCommands = commands.map(command => createHookCommand(command, timeout));
  const hookConfig = createHookConfiguration(matcher, hookCommands);

  return {
    hooks: {
      [eventType]: [hookConfig]
    }
  };
}

/**
 * Creates a debounced hook that only runs if a certain amount of time has passed
 * since the last execution
 * 
 * @param command - Command to execute
 * @param debounceSeconds - Minimum seconds between executions
 * @param eventType - Hook event type (default: 'PostToolUse')
 * @param matcher - Optional matcher pattern
 * @param timeout - Optional timeout in seconds
 * @returns Claude settings object with debounced hook
 * 
 * @example
 * ```typescript
 * const debouncedLint = createDebouncedHook(
 *   'npm run lint',
 *   30, // Only run lint if 30 seconds have passed since last run
 *   'PostToolUse',
 *   'Edit'
 * );
 * ```
 */
export function createDebouncedHook(
  command: string,
  debounceSeconds: number,
  eventType: HookEventType = 'PostToolUse',
  matcher?: string,
  timeout?: number
): ClaudeSettings {
  if (debounceSeconds <= 0) {
    throw new Error('Debounce seconds must be positive');
  }

  const lockFile = '/tmp/claude-hook-debounce.lock';
  const debouncedCommand = `
    if [ ! -f "${lockFile}" ] || [ $((\`date +%s\` - \`stat -f %m "${lockFile}" 2>/dev/null || echo 0\`)) -gt ${debounceSeconds} ]; then
      touch "${lockFile}" && ${command}
    else
      echo "Hook debounced, skipping execution"
    fi
  `.trim();

  const hookCommand = createHookCommand(debouncedCommand, timeout);
  const hookConfig = createHookConfiguration(matcher, [hookCommand]);

  return {
    hooks: {
      [eventType]: [hookConfig]
    }
  };
}