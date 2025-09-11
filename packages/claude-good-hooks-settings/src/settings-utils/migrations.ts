/**
 * Simple settings conversion utilities
 *
 * Focused on the single real use case: converting legacy settings to current format.
 * ```ts
 * import { convertLegacyToVersionedSettings, isLegacySettings } from '@sammons/claude-good-hooks-settings/settings-utils/migrations';
 * ```
 */

import type { ClaudeSettings } from '@sammons/claude-good-hooks-types';
import type { VersionedClaudeSettings } from '../schemas/index.js';
import { CURRENT_SCHEMA_VERSION } from '../schemas/index.js';

/**
 * Check if settings are in legacy (unversioned) format
 */
export function isLegacySettings(settings: any): boolean {
  if (!settings || typeof settings !== 'object') {
    return false;
  }

  // If it has a version field, it's not legacy
  if (settings.version && typeof settings.version === 'string') {
    return false;
  }

  // If it has meta or $schema, it's probably versioned but missing version field
  if (settings.meta || settings.$schema) {
    return false;
  }

  // If it has hooks, it's legacy format
  return settings.hooks && typeof settings.hooks === 'object';
}

/**
 * Convert legacy settings to current versioned format
 * This is the single real use case we need to handle.
 */
export function convertLegacyToVersionedSettings(
  legacySettings: ClaudeSettings,
  source: 'global' | 'project' | 'local' = 'project'
): VersionedClaudeSettings {
  const now = new Date().toISOString();

  const versionedSettings: VersionedClaudeSettings = {
    $schema: 'https://github.com/sammons/claude-good-hooks/schemas/claude-settings.json',
    version: CURRENT_SCHEMA_VERSION,
    hooks: {},
    meta: {
      createdAt: now,
      updatedAt: now,
      source,
      migrations: [
        {
          version: CURRENT_SCHEMA_VERSION,
          appliedAt: now,
          description: 'Converted from legacy settings format',
          changes: ['Added versioning and metadata', 'Applied schema validation'],
        },
      ],
    },
  };

  // Convert legacy hooks to versioned format
  if (legacySettings.hooks) {
    const hooks = (versionedSettings.hooks = {});

    for (const [eventType, configurations] of Object.entries(legacySettings.hooks)) {
      if (configurations && Array.isArray(configurations)) {
        const mappedConfigs = configurations.map(config => {
          const mappedConfig: any = {
            enabled: true,
            hooks: config.hooks.map((hook: any) => ({
              type: hook.type as 'command',
              command: hook.command,
              timeout: hook.timeout,
              enabled: true,
            })),
          };
          if (config.matcher) {
            mappedConfig.matcher = config.matcher;
          }
          return mappedConfig;
        });
        (hooks as any)[eventType] = mappedConfigs;
      }
    }
  }

  return versionedSettings;
}

/**
 * Convert settings if needed - handles both legacy and current formats
 */
export function ensureVersionedSettings(
  settings: any,
  source: 'global' | 'project' | 'local' = 'project'
): VersionedClaudeSettings {
  // If already versioned, return as-is
  if (settings.version && typeof settings.version === 'string') {
    return settings as VersionedClaudeSettings;
  }

  // If legacy format, convert it
  if (isLegacySettings(settings)) {
    return convertLegacyToVersionedSettings(settings as ClaudeSettings, source);
  }

  // If empty or invalid, return minimal versioned settings
  const now = new Date().toISOString();
  return {
    $schema: 'https://github.com/sammons/claude-good-hooks/schemas/claude-settings.json',
    version: CURRENT_SCHEMA_VERSION,
    hooks: {},
    meta: {
      createdAt: now,
      updatedAt: now,
      source,
      migrations: [],
    },
  };
}
