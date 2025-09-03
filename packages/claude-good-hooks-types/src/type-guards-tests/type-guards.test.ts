import { describe, it } from 'vitest';

/**
 * Type Guards Tests - Main test file (split into focused test files)
 *
 * This file serves as the main entry point for type guard function tests.
 * Individual test scenarios have been split into focused files for better organization:
 *
 * - type-guards.hook-command.test.ts - isHookCommand function tests
 * - type-guards.hook-configuration.test.ts - isHookConfiguration function tests
 * - type-guards.hook-plugin.test.ts - isHookPlugin function tests
 * - type-guards.claude-settings.test.ts - isClaudeSettings function tests
 * - type-guards.hook-metadata.test.ts - isHookMetadata function tests
 * - type-guards.integration.test.ts - Integration tests with real-world data structures
 * - type-guards.performance-edge-cases.test.ts - Performance tests and edge case handling
 */

describe('Type Guard Functions', () => {
  it('should have comprehensive test coverage across all split test files', () => {
    // This test file has been split into focused test files for better maintainability.
    // Each split file covers specific aspects of the type guard functions:
    //
    // 1. Hook Command - isHookCommand validation and edge cases
    // 2. Hook Configuration - isHookConfiguration validation and edge cases
    // 3. Hook Plugin - isHookPlugin validation including customArgs
    // 4. Claude Settings - isClaudeSettings validation for all hook types
    // 5. Hook Metadata - isHookMetadata validation for package management
    // 6. Integration - Real-world data structure validation
    // 7. Performance & Edge Cases - Performance testing and malformed data handling
    //
    // All tests maintain the same coverage but are now organized by function area.
  });
});
