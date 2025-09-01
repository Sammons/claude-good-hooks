/**
 * Claude Good Hooks Factories
 * 
 * A collection of factory functions and utilities to simplify creating
 * Claude Code hooks with TypeScript support.
 */

// Re-export types from the types package for convenience
export type {
  HookCommand,
  HookConfiguration,
  HookPlugin,
  ClaudeSettings,
  HookMetadata
} from '@sammons/claude-good-hooks-types';

// Export type guards for runtime validation
export {
  isHookCommand,
  isHookConfiguration,
  isHookPlugin,
  isClaudeSettings,
  isHookMetadata
} from '@sammons/claude-good-hooks-types';

// Core factory functions - the building blocks
export {
  createHookCommand,
  createHookConfiguration,
  createHookPlugin,
  createClaudeSettings
} from './core-factories.js';

// Convenience factory functions - simplified hook creation
export {
  createSimpleHook,
  createFileWatcherHook,
  createConditionalHook,
  createMultiStepHook,
  createDebouncedHook,
  type HookEventType
} from './convenience-factories.js';


// Utility factory functions - common development workflows
export {
  createNotificationHook,
  createGitAutoCommitHook,
  createLintingHook,
  createTestingHook,
  createBuildHook,
  createFileBackupHook,
  createDevServerRestartHook,
  createDocumentationHook
} from './utility-factories.js';

// Import types for internal use
import type { ClaudeSettings } from '@sammons/claude-good-hooks-types';
import type { HookEventType } from './convenience-factories.js';

/**
 * Factory function options for common configurations
 */
export interface FactoryOptions {
  /** Timeout in seconds for hook commands */
  timeout?: number;
  /** Tool matcher pattern */
  matcher?: string;
  /** Hook event type */
  eventType?: HookEventType;
}

/**
 * Creates a comprehensive development workflow hook that combines
 * linting, testing, and building
 * 
 * @param options - Configuration options
 * @returns Claude settings with full development workflow
 * 
 * @example
 * ```typescript
 * import { createDevWorkflowHook } from '@sammons/claude-good-hooks-factories';
 * 
 * const devHook = createDevWorkflowHook({
 *   lintCommand: 'eslint .',
 *   testCommand: 'npm test',
 *   buildCommand: 'npm run build'
 * });
 * ```
 */
export function createDevWorkflowHook(options: {
  lintCommand?: string;
  testCommand?: string;
  buildCommand?: string;
  matcher?: string;
  autoFix?: boolean;
}): ClaudeSettings {
  const {
    lintCommand = 'npm run lint',
    testCommand = 'npm test',
    buildCommand = 'npm run build',
    matcher = 'Write|Edit',
    autoFix = false
  } = options;

  const commands: string[] = [];
  
  if (autoFix) {
    commands.push(`${lintCommand} --fix || ${lintCommand}`);
  } else {
    commands.push(lintCommand);
  }
  
  commands.push(testCommand);
  commands.push(buildCommand);

  return {
    hooks: {
      PostToolUse: [{
        matcher,
        hooks: commands.map(cmd => ({
          type: 'command' as const,
          command: cmd
        }))
      }]
    }
  };
}

/**
 * Quick start function that creates a basic hook setup for new projects
 * 
 * @param projectType - Type of project (react, node, etc.)
 * @returns Claude settings with sensible defaults for the project type
 * 
 * @example
 * ```typescript
 * import { quickStartHooks } from '@sammons/claude-good-hooks-factories';
 * 
 * const hooks = quickStartHooks('react');
 * ```
 */
export function quickStartHooks(projectType: 'react' | 'node' | 'typescript' | 'generic' = 'generic'): ClaudeSettings {
  const commonHooks = {
    SessionStart: [{
      hooks: [{
        type: 'command' as const,
        command: 'echo "Claude session started in $(pwd)"'
      }]
    }],
    SessionEnd: [{
      hooks: [{
        type: 'command' as const,
        command: 'echo "Claude session ended"'
      }]
    }]
  };

  switch (projectType) {
    case 'react':
      return {
        hooks: {
          ...commonHooks,
          PostToolUse: [{
            matcher: 'Write|Edit',
            hooks: [{
              type: 'command',
              command: 'npm run lint && npm test && npm run build'
            }]
          }]
        }
      };
    
    case 'node':
      return {
        hooks: {
          ...commonHooks,
          PostToolUse: [{
            matcher: 'Write|Edit',
            hooks: [{
              type: 'command',
              command: 'npm run lint && npm test'
            }]
          }]
        }
      };
    
    case 'typescript':
      return {
        hooks: {
          ...commonHooks,
          PostToolUse: [{
            matcher: 'Write|Edit',
            hooks: [{
              type: 'command',
              command: 'npm run type-check && npm run lint'
            }]
          }]
        }
      };
    
    default:
      return {
        hooks: commonHooks
      };
  }
}

// Import for default export
import {
  createHookCommand,
  createHookConfiguration,
  createHookPlugin
} from './core-factories.js';

import {
  createSimpleHook,
  createFileWatcherHook,
  createConditionalHook
} from './convenience-factories.js';

// Default export for convenience
const factories = {
  createHookCommand,
  createHookConfiguration,
  createHookPlugin,
  createSimpleHook,
  createFileWatcherHook,
  createConditionalHook,
  createDevWorkflowHook,
  quickStartHooks
};

export default factories;