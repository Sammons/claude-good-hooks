import type { HookPlugin, ClaudeSettings } from '@sammons/claude-good-hooks-types';
import { 
  createSimpleHook,
  createLintingHook,
  createTestingHook,
  createNotificationHook,
  createGitAutoCommitHook,
  createConditionalHook,
  createMultiStepHook,
  quickStartHooks
} from '@sammons/claude-good-hooks-factories';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Template Hook for Claude Code
 * 
 * This template demonstrates how to create a custom hook plugin for Claude Code
 * using the claude-good-hooks-factories package for simplified hook creation.
 * 
 * It includes examples of:
 * - Using factory functions for easy hook creation
 * - Custom arguments with validation
 * - Dynamic hook generation based on arguments
 * - Multiple hook events (PreToolUse, PostToolUse, etc.)
 * - Proper TypeScript typing
 * - Error handling and fallbacks
 * - Various common development workflows (linting, testing, notifications)
 * 
 * To create your own hook:
 * 1. Change the 'name' property to your hook's unique identifier
 * 2. Update the description to match your hook's purpose
 * 3. Modify customArgs to define the arguments your hook accepts
 * 4. Use factory functions from @sammons/claude-good-hooks-factories
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
    mode: {
      description: 'Hook mode: basic, development, or full',
      type: 'string',
      default: 'basic',
    },
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
      default: 30,
    },
    enableNotifications: {
      description: 'Enable desktop notifications',
      type: 'boolean',
      default: true,
    },
    autoCommit: {
      description: 'Enable automatic git commits',
      type: 'boolean',
      default: false,
    },
    projectType: {
      description: 'Project type for quick start (react, node, typescript, generic)',
      type: 'string',
      default: 'generic',
    },
  },

  /**
   * Generate hook configuration based on user-provided arguments.
   * This function demonstrates how to use factory functions from 
   * @sammons/claude-good-hooks-factories to create hooks easily.
   */
  makeHook: (args: Record<string, any>): NonNullable<ClaudeSettings['hooks']> => {
    // Validate and sanitize arguments with proper defaults
    const safeArgs = {
      mode: String(args.mode || 'basic'),
      verbose: Boolean(args.verbose ?? false),
      logFile: String(args.logFile || '/tmp/hook.log'),
      timeout: Math.max(1, Number(args.timeout || 30)),
      enableNotifications: Boolean(args.enableNotifications ?? true),
      autoCommit: Boolean(args.autoCommit ?? false),
      projectType: String(args.projectType || 'generic') as 'react' | 'node' | 'typescript' | 'generic',
    };

    // Start with a base configuration based on mode
    let baseHooks: ClaudeSettings;
    
    switch (safeArgs.mode) {
      case 'development':
        // Use factory function for development workflow
        baseHooks = {
          hooks: {
            ...quickStartHooks(safeArgs.projectType).hooks,
            // Add linting hook with factory
            ...createLintingHook('npm run lint', 'npm run lint --fix').hooks,
            // Add testing hook with factory
            ...createTestingHook('npm test').hooks,
          }
        };
        break;
        
      case 'full':
        // Combine multiple factory-created hooks for comprehensive workflow
        const lintHook = createLintingHook('npm run lint', 'npm run lint --fix');
        const testHook = createTestingHook('npm test');
        const buildHook = createMultiStepHook([
          'npm run type-check',
          'npm run build'
        ]);
        
        baseHooks = {
          hooks: {
            // Session hooks
            ...quickStartHooks(safeArgs.projectType).hooks,
            
            // Merge PostToolUse hooks from multiple factories
            PostToolUse: [
              ...(lintHook.hooks.PostToolUse || []),
              ...(testHook.hooks.PostToolUse || []),
              ...(buildHook.hooks.PostToolUse || []),
            ],
          }
        };
        break;
        
      default: // 'basic' mode
        // Use simple factory functions for basic functionality
        baseHooks = createSimpleHook(
          'PostToolUse',
          safeArgs.verbose 
            ? `echo "[$(date)] File operation completed" >> ${safeArgs.logFile}`
            : 'echo "File operation completed"',
          'Write|Edit',
          safeArgs.timeout
        );
        break;
    }

    // Add optional features using factory functions
    const additionalHooks: ClaudeSettings[] = [];

    // Add notifications if enabled
    if (safeArgs.enableNotifications) {
      additionalHooks.push(
        createNotificationHook('Claude operation completed', 'PostToolUse', 'Write|Edit')
      );
    }

    // Add auto-commit if enabled
    if (safeArgs.autoCommit) {
      additionalHooks.push(
        createGitAutoCommitHook('Auto-commit via template hook', 'Write|Edit')
      );
    }

    // Add verbose logging using conditional hook factory
    if (safeArgs.verbose) {
      additionalHooks.push(
        createConditionalHook(
          'test -f package.json',
          `echo "[$(date)] Operation in Node.js project" >> ${safeArgs.logFile}`,
          `echo "[$(date)] Operation in non-Node.js project" >> ${safeArgs.logFile}`,
          'PreToolUse',
          '*',
          safeArgs.timeout
        )
      );
    }

    // Merge all hook configurations
    const mergedHooks: NonNullable<ClaudeSettings['hooks']> = {};
    const allHooks = [baseHooks, ...additionalHooks];

    // Combine hooks from all configurations
    for (const hookConfig of allHooks) {
      if (hookConfig.hooks) {
        for (const [eventType, configurations] of Object.entries(hookConfig.hooks)) {
          const eventTypeKey = eventType as keyof ClaudeSettings['hooks'];
          if (!mergedHooks[eventTypeKey]) {
            (mergedHooks as any)[eventTypeKey] = [];
          }
          if (configurations && Array.isArray(configurations)) {
            (mergedHooks as any)[eventTypeKey].push(...configurations);
          }
        }
      }
    }

    return mergedHooks;
  },
};

/**
 * Export the hook as default.
 * 
 * This template demonstrates how to use factory functions from 
 * @sammons/claude-good-hooks-factories to create sophisticated hooks
 * with minimal code.
 * 
 * Example usage with different modes:
 * 
 * Basic mode (default):
 * ```bash
 * claude-good-hooks apply template --mode=basic --verbose=true
 * ```
 * 
 * Development mode with linting and testing:
 * ```bash
 * claude-good-hooks apply template --mode=development --projectType=react --enableNotifications=true
 * ```
 * 
 * Full mode with comprehensive workflow:
 * ```bash
 * claude-good-hooks apply template --mode=full --autoCommit=true --verbose=true --timeout=60
 * ```
 * 
 * Programmatic usage:
 * ```typescript
 * import templateHook from '@sammons/claude-good-hooks-template-hook';
 * 
 * // Basic configuration
 * const basicHook = templateHook.makeHook({ mode: 'basic' });
 * 
 * // Full development workflow
 * const devHook = templateHook.makeHook({
 *   mode: 'full',
 *   projectType: 'typescript',
 *   enableNotifications: true,
 *   autoCommit: true,
 *   verbose: true
 * });
 * ```
 * 
 * You can also use individual factory functions directly:
 * ```typescript
 * import { 
 *   createLintingHook,
 *   createTestingHook,
 *   createNotificationHook,
 *   quickStartHooks
 * } from '@sammons/claude-good-hooks-factories';
 * 
 * // Create individual hooks
 * const lintHook = createLintingHook('eslint .', 'eslint . --fix');
 * const testHook = createTestingHook('npm test');
 * const notifyHook = createNotificationHook('Build complete!');
 * const projectHooks = quickStartHooks('react');
 * ```
 */
export default templateHook;
