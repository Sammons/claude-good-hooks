/**
 * Simple settings version utilities
 * 
 * ```ts
 * import { createVersionedSettings } from '@sammons/claude-good-hooks-settings/settings-utils/version-tracking';
 * ```
 */

import type { VersionedClaudeSettings } from '../schemas/index.js';
import { getCurrentTimestamp, CURRENT_SCHEMA_VERSION } from '../schemas/index.js';


/**
 * Create a new versioned settings structure
 */
export function createVersionedSettings(
  source: 'global' | 'project' | 'local' = 'project',
  initialVersion: string = CURRENT_SCHEMA_VERSION
): VersionedClaudeSettings {
  const now = getCurrentTimestamp();

  return {
    $schema: 'https://github.com/sammons/claude-good-hooks/schemas/claude-settings.json',
    version: initialVersion,
    hooks: {},
    meta: {
      createdAt: now,
      updatedAt: now,
      source,
      migrations: [],
    },
  };
}

/**
 * Simple utility to update settings timestamps
 */
export function updateSettingsTimestamp(settings: VersionedClaudeSettings): VersionedClaudeSettings {
  const updatedSettings = { ...settings };
  
  if (!updatedSettings.meta) {
    updatedSettings.meta = {
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp(),
      source: 'project',
      migrations: [],
    };
  }

  updatedSettings.meta.updatedAt = getCurrentTimestamp();
  return updatedSettings;
}