/**
 * @sammons/claude-good-hooks-settings
 * 
 * Settings management utilities for Claude Good Hooks, including validation,
 * atomic operations, migrations, and version tracking.
 */

// Re-export all schema types and utilities
export * from './schemas/index.js';

// Re-export all standalone utility functions
export * from './settings-utils/index.js';

// Re-export the core settings helper (renamed from SettingsService)
export * from './settings-helper.js';

// Note: Backwards compatibility exports removed - use settings-utils imports
// Files have been consolidated into settings-utils/ directory