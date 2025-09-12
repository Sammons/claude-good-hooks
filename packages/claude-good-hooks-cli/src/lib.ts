/**
 * Library exports for @sammons/claude-good-hooks
 *
 * This file exports the settings functionality that was previously
 * in the deprecated @sammons/claude-good-hooks-settings package.
 */

// Export all settings functionality from the main index
// This includes schemas, utils, helpers, and migration tools
export * from './settings/index.js';

// Export service classes
export { SettingsService } from './services/settings.service.js';
export { DualSettingsService } from './services/dual-settings.service.js';
export { HookService } from './services/hook.service.js';
export { ModuleService } from './services/module.service.js';

// Export types
export * from '@sammons/claude-good-hooks-types';
