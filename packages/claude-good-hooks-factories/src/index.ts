/**
 * Claude Good Hooks Factories
 *
 * Factory utilities to help hook authors create publishable npm modules
 * that provide Claude Code hooks. This package is designed for developers
 * who want to create and share hook modules via npm.
 */

// Re-export core types for convenience
export type {
  HookCommand,
  HookConfiguration,
  HookPlugin,
  ClaudeSettings,
  HookMetadata,
} from '@sammons/claude-good-hooks-types';

// Export type guards for runtime validation
export {
  isHookCommand,
  isHookConfiguration,
  isHookPlugin,
  isClaudeSettings,
  isHookMetadata,
} from '@sammons/claude-good-hooks-types';

// Core factory functions - the essential building blocks
export {
  createHookCommand,
  createHookConfiguration,
  createHookPlugin,
  createClaudeSettings,
  type HookCommandOptions,
  type HookConfigOptions,
  type HookPluginOptions,
} from './core-factories.js';

// Pattern helper functions - common hook patterns made easy
export {
  createFileWatcherHook,
  createLinterHook,
  createTestRunnerHook,
  createNotificationHook,
  createConditionalHook,
  createArgumentSchema,
  type HookEventType,
  type FileWatcherConfig,
  type LinterConfig,
  type TestRunnerConfig,
  type NotificationConfig,
} from './pattern-helpers.js';

// Import functions for default export
import { createHookPlugin, createHookCommand, createHookConfiguration } from './core-factories.js';
import { 
  createFileWatcherHook, 
  createLinterHook, 
  createTestRunnerHook,
  createNotificationHook,
  createConditionalHook,
  createArgumentSchema 
} from './pattern-helpers.js';

// Default export for convenience
export default {
  createHookPlugin,
  createHookCommand,
  createHookConfiguration,
  createFileWatcherHook,
  createLinterHook,
  createTestRunnerHook,
  createNotificationHook,
  createConditionalHook,
  createArgumentSchema,
};