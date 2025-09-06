import type { HookPlugin } from '@sammons/claude-good-hooks-types';
import { createHookPlugin, createHookCommand, createHookConfiguration } from './core-factories.js';

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
 * Configuration for file watcher hooks
 */
export interface FileWatcherConfig {
  /** Command to run when files change */
  command: string;
  /** Tool patterns to watch (default: 'Write|Edit') */
  patterns?: string;
  /** Timeout for the command in seconds */
  timeout?: number;
  /** Hook event type (default: 'PostToolUse') */
  eventType?: HookEventType;
}

/**
 * Configuration for linter hooks
 */
export interface LinterConfig {
  /** Linter command (e.g., 'npx eslint', 'npm run lint') */
  lintCommand: string;
  /** File patterns to match (default: 'Write|Edit') */
  patterns?: string;
  /** Whether to auto-fix issues */
  autoFix?: boolean;
  /** Timeout for the command in seconds */
  timeout?: number;
}

/**
 * Configuration for test runner hooks
 */
export interface TestRunnerConfig {
  /** Test command (e.g., 'npm test', 'jest') */
  testCommand: string;
  /** Tool patterns that should trigger tests (default: 'Write|Edit') */
  patterns?: string;
  /** Only run tests related to changed files */
  onlyChanged?: boolean;
  /** Timeout for the command in seconds */
  timeout?: number;
}

/**
 * Configuration for notification hooks
 */
export interface NotificationConfig {
  /** Message to display */
  message: string;
  /** Hook event type (default: 'PostToolUse') */
  eventType?: HookEventType;
  /** Tool patterns to match */
  patterns?: string;
}

/**
 * Creates a file watcher hook plugin that responds to file changes
 * 
 * @param name - Hook name
 * @param description - Hook description
 * @param version - Hook version
 * @param config - File watcher configuration
 * @returns A HookPlugin that watches for file changes
 * 
 * @example
 * ```typescript
 * const buildWatcher = createFileWatcherHook(
 *   'build-on-change',
 *   'Builds project when files change',
 *   '1.0.0',
 *   { command: 'npm run build' }
 * );
 * ```
 */
export function createFileWatcherHook(
  name: string,
  description: string,
  version: string,
  config: FileWatcherConfig
): HookPlugin {
  const { command, patterns = 'Write|Edit', timeout, eventType = 'PostToolUse' } = config;

  return createHookPlugin(
    name,
    description,
    version,
    (args) => ({
      [eventType]: [
        createHookConfiguration([
          createHookCommand(command, timeout ? { timeout } : undefined)
        ], { matcher: patterns })
      ]
    })
  );
}

/**
 * Creates a linter hook plugin that runs linting on file changes
 * 
 * @param name - Hook name
 * @param description - Hook description
 * @param version - Hook version
 * @param config - Linter configuration
 * @returns A HookPlugin that runs linting
 * 
 * @example
 * ```typescript
 * const eslintHook = createLinterHook(
 *   'eslint-hook',
 *   'Runs ESLint on file changes',
 *   '1.0.0',
 *   { lintCommand: 'npx eslint .', autoFix: true }
 * );
 * ```
 */
export function createLinterHook(
  name: string,
  description: string,
  version: string,
  config: LinterConfig
): HookPlugin {
  const { lintCommand, patterns = 'Write|Edit', autoFix = false, timeout } = config;

  return createHookPlugin(
    name,
    description,
    version,
    (args) => {
      const actualAutoFix = args.autoFix ?? autoFix;
      const command = actualAutoFix ? `${lintCommand} --fix` : lintCommand;

      return {
        PostToolUse: [
          createHookConfiguration([
            createHookCommand(command.trim(), timeout ? { timeout } : undefined)
          ], { matcher: patterns })
        ]
      };
    },
    {
      customArgs: {
        autoFix: {
          description: 'Automatically fix linting errors',
          type: 'boolean',
          default: autoFix,
        }
      }
    }
  );
}

/**
 * Creates a test runner hook plugin that runs tests on file changes
 * 
 * @param name - Hook name
 * @param description - Hook description
 * @param version - Hook version
 * @param config - Test runner configuration
 * @returns A HookPlugin that runs tests
 * 
 * @example
 * ```typescript
 * const jestHook = createTestRunnerHook(
 *   'jest-hook',
 *   'Runs Jest tests on file changes',
 *   '1.0.0',
 *   { testCommand: 'npm test', onlyChanged: true }
 * );
 * ```
 */
export function createTestRunnerHook(
  name: string,
  description: string,
  version: string,
  config: TestRunnerConfig
): HookPlugin {
  const { testCommand, patterns = 'Write|Edit', onlyChanged = false, timeout } = config;

  return createHookPlugin(
    name,
    description,
    version,
    (args) => {
      const actualOnlyChanged = args.onlyChanged ?? onlyChanged;
      const changedFlag = actualOnlyChanged ? '--onlyChanged' : '';
      const command = actualOnlyChanged ? `${testCommand} ${changedFlag}` : testCommand;

      return {
        PostToolUse: [
          createHookConfiguration([
            createHookCommand(command.trim(), timeout ? { timeout } : undefined)
          ], { matcher: patterns })
        ]
      };
    },
    {
      customArgs: {
        onlyChanged: {
          description: 'Only run tests related to changed files',
          type: 'boolean',
          default: onlyChanged,
        }
      }
    }
  );
}

/**
 * Creates a notification hook plugin that displays messages to users
 * 
 * @param name - Hook name
 * @param description - Hook description
 * @param version - Hook version
 * @param config - Notification configuration
 * @returns A HookPlugin that shows notifications
 * 
 * @example
 * ```typescript
 * const buildNotifier = createNotificationHook(
 *   'build-notifier',
 *   'Notifies when build completes',
 *   '1.0.0',
 *   { message: 'Build completed!' }
 * );
 * ```
 */
export function createNotificationHook(
  name: string,
  description: string,
  version: string,
  config: NotificationConfig
): HookPlugin {
  const { message, eventType = 'PostToolUse', patterns } = config;

  return createHookPlugin(
    name,
    description,
    version,
    (args) => {
      const actualMessage = args.message || message;
      
      // Cross-platform notification command
      const notifyCommand = process.platform === 'darwin'
        ? `osascript -e 'display notification "${actualMessage}" with title "Claude Hook"'`
        : process.platform === 'linux'
          ? `notify-send "Claude Hook" "${actualMessage}"`
          : `echo "${actualMessage}"`;

      const config = createHookConfiguration([
        createHookCommand(notifyCommand)
      ], patterns ? { matcher: patterns } : undefined);

      return {
        [eventType]: [config]
      };
    },
    {
      customArgs: {
        message: {
          description: 'Notification message to display',
          type: 'string',
          default: message,
        }
      }
    }
  );
}

/**
 * Creates a conditional hook that runs different commands based on conditions
 * 
 * @param name - Hook name
 * @param description - Hook description
 * @param version - Hook version
 * @param condition - Shell condition to evaluate
 * @param trueCommand - Command to run if condition is true
 * @param falseCommand - Optional command to run if condition is false
 * @param patterns - Tool patterns to match
 * @param eventType - Hook event type
 * @returns A HookPlugin that runs conditional commands
 * 
 * @example
 * ```typescript
 * const packageLockHook = createConditionalHook(
 *   'package-lock-checker',
 *   'Runs npm ci if package-lock.json exists, npm install otherwise',
 *   '1.0.0',
 *   'test -f package-lock.json',
 *   'npm ci',
 *   'npm install',
 *   'Write',
 *   'PostToolUse'
 * );
 * ```
 */
export function createConditionalHook(
  name: string,
  description: string,
  version: string,
  condition: string,
  trueCommand: string,
  falseCommand?: string,
  patterns?: string,
  eventType: HookEventType = 'PostToolUse'
): HookPlugin {
  return createHookPlugin(
    name,
    description,
    version,
    (args) => {
      const actualCondition = args.condition || condition;
      const actualTrueCommand = args.trueCommand || trueCommand;
      const actualFalseCommand = args.falseCommand || falseCommand;

      let conditionalCommand = `if ${actualCondition}; then ${actualTrueCommand};`;
      if (actualFalseCommand) {
        conditionalCommand += ` else ${actualFalseCommand};`;
      }
      conditionalCommand += ' fi';

      const config = createHookConfiguration([
        createHookCommand(conditionalCommand)
      ], patterns ? { matcher: patterns } : undefined);

      return {
        [eventType]: [config]
      };
    },
    {
      customArgs: {
        condition: {
          description: 'Shell condition to evaluate',
          type: 'string',
          default: condition,
        },
        trueCommand: {
          description: 'Command to run if condition is true',
          type: 'string',
          default: trueCommand,
        },
        falseCommand: {
          description: 'Command to run if condition is false',
          type: 'string',
          default: falseCommand || '',
        }
      }
    }
  );
}

/**
 * Creates a simple argument schema for common hook patterns
 * 
 * @param schema - Object describing the argument schema
 * @returns A customArgs object for use in HookPlugin options
 * 
 * @example
 * ```typescript
 * const myHook = createHookPlugin(
 *   'my-hook',
 *   'My custom hook',
 *   '1.0.0',
 *   (args) => ({ ... }),
 *   {
 *     customArgs: createArgumentSchema({
 *       pattern: { type: 'string', description: 'File pattern', default: '*' },
 *       timeout: { type: 'number', description: 'Timeout in seconds', default: 30 }
 *     })
 *   }
 * );
 * ```
 */
export function createArgumentSchema(
  schema: Record<string, {
    type: 'string' | 'number' | 'boolean';
    description: string;
    default?: any;
    required?: boolean;
  }>
): HookPlugin['customArgs'] {
  return schema;
}