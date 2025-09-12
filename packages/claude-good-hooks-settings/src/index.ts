/**
 * @sammons/claude-good-hooks-settings
 *
 * ⚠️ DEPRECATED: This package is deprecated.
 * Settings functionality has been integrated into @sammons/claude-good-hooks directly.
 *
 * This package now serves as a compatibility layer and will be removed in a future version.
 * Please update your imports to use @sammons/claude-good-hooks instead.
 */

// Log deprecation warning on import
if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
  console.warn(
    '\x1b[33m⚠️  Warning: @sammons/claude-good-hooks-settings is deprecated.\x1b[0m\n' +
      'Settings functionality has been integrated into @sammons/claude-good-hooks.\n' +
      'Please update your imports to use the main package instead.\n'
  );
}

// Re-export everything from the existing implementation for backwards compatibility
export * from './schemas/index.js';
export * from './settings-utils/index.js';
export * from './settings-helper.js';
export * from './dual-settings-helper.js';
export * from './migration-utility.js';

// Export a deprecation notice function that can be called
export function deprecationNotice(): void {
  console.warn(
    '⚠️  @sammons/claude-good-hooks-settings is deprecated. ' +
      'Use @sammons/claude-good-hooks instead.'
  );
}
