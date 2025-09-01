export * from './test-harness.js';
export * from './mock-environment.js';
export * from './assertions.js';
export * from './coverage.js';
export * from './fixtures.js';
export * from './test-runner.js';
export * from './utils/index.js';
export * from './types.js';

// Re-export commonly used types from the main types package
export type {
  HookCommand,
  HookConfiguration,
  HookPlugin,
  ClaudeSettings,
  HookMetadata,
  HookExecutionContext,
  HookExecutionResult
} from '@sammons/claude-good-hooks-types';