// Export metadata types
export * from './metadata-schema.js';

// Export hook types
export * from './hooks/hook-command.js';
export * from './hooks/hook-configuration.js';
export * from './hooks/hook-factory-argument.js';
export * from './hooks/hook-factory.js';
export * from './hooks/hook-plugin.js';
export * from './hooks/hook-metadata.js';
export * from './hooks/hook-version.js';
export * from './hooks/hook-dependency.js';
export * from './hooks/hook-composition.js';
export * from './hooks/hook-debug-config.js';
export * from './hooks/hook-marketplace-info.js';
export * from './hooks/enhanced-hook-plugin.js';
export * from './hooks/hook-execution-context.js';
export * from './hooks/hook-execution-result.js';
export * from './hooks/hook-chain.js';
export * from './hooks/version-compatibility.js';

// Export settings types
export * from './settings/claude-settings.js';
export * from './settings/settings-metadata.js';
export * from './settings/versioned-claude-settings.js';

// Export validation types
export * from './validation/schema-validation-error.js';
export * from './validation/schema-validation-result.js';

// Export versioning types
export * from './versioning/settings-version.js';
export * from './versioning/migration-record.js';

// Export type guards
export * from '../guards/is-hook-command.js';
export * from '../guards/is-hook-configuration.js';
export * from '../guards/is-hook-plugin.js';
export * from '../guards/is-hook-metadata.js';
export * from '../guards/is-hook-version.js';
export * from '../guards/is-hook-dependency.js';
export * from '../guards/is-hook-composition.js';
export * from '../guards/is-enhanced-hook-plugin.js';
export * from '../guards/is-hook-execution-context.js';
export * from '../guards/is-hook-execution-result.js';
export * from '../guards/is-claude-settings.js';
