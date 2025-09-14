/**
 * Settings management utilities for Claude Good Hooks
 * (Previously @sammons/claude-good-hooks-settings)
 */

// Re-export all schema types and utilities
export * from './schemas/index.js';

// Re-export all standalone utility functions
export * from './settings-utils/index.js';

// Re-export from settings-helper (except SettingsScope to avoid duplicate)
export { SettingsHelper } from './settings-helper.js';

// Re-export from dual-settings-helper (including SettingsScope from here)
export * from './dual-settings-helper.js';

// Re-export shared settings types
export * from './settings-types.js';

// Re-export migration utilities
export * from './migration-utility.js';
