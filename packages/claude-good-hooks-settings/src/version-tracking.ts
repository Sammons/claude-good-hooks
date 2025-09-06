/**
 * Settings version tracking and management system
 */

import type { VersionedClaudeSettings, SettingsVersion, MigrationRecord } from './schemas/index.js';
import {
  parseVersion,
  compareVersions,
  formatVersion,
  getCurrentTimestamp,
  CURRENT_SCHEMA_VERSION,
} from './schemas/index.js';
import { detectSettingsVersion, needsMigration } from './migrations.js';

export interface VersionInfo {
  current: string;
  latest: string;
  needsUpdate: boolean;
  isSupported: boolean;
  migrationAvailable: boolean;
}

export interface VersionHistory {
  versions: Array<{
    version: string;
    timestamp: string;
    description?: string;
    changes?: string[];
  }>;
  currentVersion: string;
  totalMigrations: number;
}

export interface SettingsChangeRecord {
  timestamp: string;
  version: string;
  changeType: 'create' | 'update' | 'migrate' | 'rollback';
  description: string;
  affectedSections?: string[];
  metadata?: Record<string, any>;
}

/**
 * Version compatibility matrix
 */
const VERSION_COMPATIBILITY = {
  '0.0.0': { supported: true, deprecated: true, migrationRequired: true },
  '1.0.0': { supported: true, deprecated: false, migrationRequired: false },
} as const;

/**
 * Get version information for settings
 */
export function getVersionInfo(settings: any): VersionInfo {
  const current = detectSettingsVersion(settings);
  const latest = CURRENT_SCHEMA_VERSION;
  const needsUpdate = needsMigration(settings, latest);

  const compatibility = VERSION_COMPATIBILITY[current as keyof typeof VERSION_COMPATIBILITY] || {
    supported: false,
    deprecated: true,
    migrationRequired: true,
  };

  return {
    current,
    latest,
    needsUpdate,
    isSupported: compatibility.supported,
    migrationAvailable: compatibility.migrationRequired,
  };
}

/**
 * Check if a version is supported
 */
export function isVersionSupported(version: string): boolean {
  const compatibility = VERSION_COMPATIBILITY[version as keyof typeof VERSION_COMPATIBILITY];
  return compatibility?.supported || false;
}

/**
 * Check if a version is deprecated
 */
export function isVersionDeprecated(version: string): boolean {
  const compatibility = VERSION_COMPATIBILITY[version as keyof typeof VERSION_COMPATIBILITY];
  return compatibility?.deprecated || false;
}

/**
 * Get migration path visualization
 */
export function getVersionMigrationPath(fromVersion: string, toVersion: string): string[] {
  // This would be enhanced with actual migration registry data
  const from = parseVersion(fromVersion);
  const to = parseVersion(toVersion);

  const path: string[] = [];

  // Simple path generation for now
  if (compareVersions(fromVersion, '1.0.0') < 0) {
    path.push('1.0.0');
  }

  return path;
}

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
 * Update settings version after successful migration
 */
export function updateSettingsVersion(
  settings: VersionedClaudeSettings,
  newVersion: string,
  migrationRecord?: MigrationRecord
): VersionedClaudeSettings {
  const updatedSettings = { ...settings };

  updatedSettings.version = newVersion;

  if (!updatedSettings.meta) {
    updatedSettings.meta = {};
  }

  updatedSettings.meta.updatedAt = getCurrentTimestamp();

  if (migrationRecord) {
    if (!updatedSettings.meta.migrations) {
      updatedSettings.meta.migrations = [];
    }
    updatedSettings.meta.migrations.push(migrationRecord);
  }

  return updatedSettings;
}

/**
 * Get version history from migration records
 */
export function getVersionHistory(settings: VersionedClaudeSettings): VersionHistory {
  const migrations = settings.meta?.migrations || [];
  const currentVersion = settings.version || '0.0.0';

  const versions = migrations
    .map(migration => ({
      version: migration.version,
      timestamp: migration.appliedAt,
      description: migration.description,
      changes: migration.changes,
    }))
    .sort((a, b) => compareVersions(a.version, b.version));

  // Add current version if not in migrations
  const hasCurrentVersion = versions.some(v => v.version === currentVersion);
  if (!hasCurrentVersion) {
    versions.push({
      version: currentVersion,
      timestamp: settings.meta?.createdAt || settings.meta?.updatedAt || getCurrentTimestamp(),
      description: 'Current version',
      changes: undefined,
    });
  }

  return {
    versions,
    currentVersion,
    totalMigrations: migrations.length,
  };
}

/**
 * Track a settings change
 */
export function trackSettingsChange(
  settings: VersionedClaudeSettings,
  changeType: SettingsChangeRecord['changeType'],
  description: string,
  affectedSections?: string[],
  metadata?: Record<string, any>
): VersionedClaudeSettings {
  const updatedSettings = { ...settings };

  if (!updatedSettings.meta) {
    updatedSettings.meta = {};
  }

  updatedSettings.meta.updatedAt = getCurrentTimestamp();

  // Store change record in metadata (could be extended to separate change log)
  if (!updatedSettings.meta.changes) {
    (updatedSettings.meta as any).changes = [];
  }

  const changeRecord: SettingsChangeRecord = {
    timestamp: getCurrentTimestamp(),
    version: updatedSettings.version || '0.0.0',
    changeType,
    description,
    affectedSections,
    metadata,
  };

  (updatedSettings.meta as any).changes.push(changeRecord);

  return updatedSettings;
}

/**
 * Get settings change history
 */
export function getChangeHistory(settings: VersionedClaudeSettings): SettingsChangeRecord[] {
  return (settings.meta as any)?.changes || [];
}

/**
 * Compare two settings versions to identify differences
 */
export function compareSettingsVersions(
  oldSettings: VersionedClaudeSettings,
  newSettings: VersionedClaudeSettings
): {
  versionChanged: boolean;
  hooksChanged: boolean;
  metadataChanged: boolean;
  addedHooks: string[];
  removedHooks: string[];
  modifiedHooks: string[];
} {
  const result = {
    versionChanged: oldSettings.version !== newSettings.version,
    hooksChanged: false,
    metadataChanged: false,
    addedHooks: [] as string[],
    removedHooks: [] as string[],
    modifiedHooks: [] as string[],
  };

  // Compare hooks
  const oldHookTypes = new Set(Object.keys(oldSettings.hooks || {}));
  const newHookTypes = new Set(Object.keys(newSettings.hooks || {}));

  // Find added hooks
  for (const hookType of newHookTypes) {
    if (!oldHookTypes.has(hookType)) {
      result.addedHooks.push(hookType);
      result.hooksChanged = true;
    }
  }

  // Find removed hooks
  for (const hookType of oldHookTypes) {
    if (!newHookTypes.has(hookType)) {
      result.removedHooks.push(hookType);
      result.hooksChanged = true;
    }
  }

  // Find modified hooks
  for (const hookType of oldHookTypes) {
    if (newHookTypes.has(hookType)) {
      const oldHooks = JSON.stringify(
        oldSettings.hooks?.[hookType as keyof typeof oldSettings.hooks]
      );
      const newHooks = JSON.stringify(
        newSettings.hooks?.[hookType as keyof typeof newSettings.hooks]
      );

      if (oldHooks !== newHooks) {
        result.modifiedHooks.push(hookType);
        result.hooksChanged = true;
      }
    }
  }

  // Compare metadata (excluding updatedAt which always changes)
  const oldMeta = { ...oldSettings.meta };
  const newMeta = { ...newSettings.meta };
  delete oldMeta?.updatedAt;
  delete newMeta?.updatedAt;

  result.metadataChanged = JSON.stringify(oldMeta) !== JSON.stringify(newMeta);

  return result;
}

/**
 * Generate a version bump suggestion based on changes
 */
export function suggestVersionBump(
  changes: ReturnType<typeof compareSettingsVersions>,
  currentVersion: string
): string {
  const version = parseVersion(currentVersion);

  // Major version bump for breaking changes (removed hooks)
  if (changes.removedHooks.length > 0) {
    return formatVersion({ ...version, major: version.major + 1, minor: 0, patch: 0 });
  }

  // Minor version bump for new features (added hooks)
  if (changes.addedHooks.length > 0) {
    return formatVersion({ ...version, minor: version.minor + 1, patch: 0 });
  }

  // Patch version bump for modifications
  if (changes.modifiedHooks.length > 0 || changes.metadataChanged) {
    return formatVersion({ ...version, patch: version.patch + 1 });
  }

  // No version bump needed
  return currentVersion;
}

/**
 * Validate version compatibility
 */
export function validateVersionCompatibility(
  settingsVersion: string,
  requiredVersion?: string
): {
  compatible: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Check if version is supported
  if (!isVersionSupported(settingsVersion)) {
    errors.push(`Settings version ${settingsVersion} is not supported`);
  }

  // Check if version is deprecated
  if (isVersionDeprecated(settingsVersion)) {
    warnings.push(
      `Settings version ${settingsVersion} is deprecated. Consider upgrading to ${CURRENT_SCHEMA_VERSION}`
    );
  }

  // Check against required version
  if (requiredVersion && compareVersions(settingsVersion, requiredVersion) < 0) {
    errors.push(`Settings version ${settingsVersion} is below required version ${requiredVersion}`);
  }

  return {
    compatible: errors.length === 0,
    warnings,
    errors,
  };
}

/**
 * Get version compatibility report
 */
export function getVersionCompatibilityReport(settings: VersionedClaudeSettings): {
  version: string;
  status: 'current' | 'supported' | 'deprecated' | 'unsupported';
  recommendations: string[];
  migrationPath?: string[];
} {
  const version = settings.version || '0.0.0';
  const versionInfo = getVersionInfo(settings);

  let status: 'current' | 'supported' | 'deprecated' | 'unsupported';
  const recommendations: string[] = [];

  if (version === CURRENT_SCHEMA_VERSION) {
    status = 'current';
  } else if (versionInfo.isSupported && !isVersionDeprecated(version)) {
    status = 'supported';
  } else if (versionInfo.isSupported && isVersionDeprecated(version)) {
    status = 'deprecated';
    recommendations.push(`Upgrade to version ${CURRENT_SCHEMA_VERSION}`);
  } else {
    status = 'unsupported';
    recommendations.push(`Immediately upgrade to version ${CURRENT_SCHEMA_VERSION}`);
    recommendations.push('Backup your current settings before migration');
  }

  const migrationPath = versionInfo.migrationAvailable
    ? getVersionMigrationPath(version, CURRENT_SCHEMA_VERSION)
    : undefined;

  if (migrationPath && migrationPath.length > 0) {
    recommendations.push(`Migration path: ${version} → ${migrationPath.join(' → ')}`);
  }

  return {
    version,
    status,
    recommendations,
    migrationPath,
  };
}