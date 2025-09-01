/**
 * Settings migration system for handling configuration schema changes
 */

import type { ClaudeSettings } from './index.js';
import type { 
  VersionedClaudeSettings, 
  MigrationRecord, 
  SettingsVersion 
} from './schemas/index.js';
import { 
  parseVersion, 
  compareVersions, 
  formatVersion,
  CURRENT_SCHEMA_VERSION 
} from './schemas/index.js';
import { convertLegacySettings, validateSettingsComprehensive } from './validation.js';

export interface Migration {
  version: string;
  description: string;
  up: (settings: any) => any;
  down?: (settings: any) => any;
  validate?: (settings: any) => boolean;
}

export interface MigrationResult {
  success: boolean;
  migratedSettings?: VersionedClaudeSettings;
  appliedMigrations: string[];
  errors: string[];
}

/**
 * Registry of all available migrations
 */
export class MigrationRegistry {
  private migrations: Map<string, Migration> = new Map();

  /**
   * Register a migration
   */
  register(migration: Migration): void {
    this.migrations.set(migration.version, migration);
  }

  /**
   * Get all migrations in version order
   */
  getAllMigrations(): Migration[] {
    return Array.from(this.migrations.values())
      .sort((a, b) => compareVersions(a.version, b.version));
  }

  /**
   * Get migrations needed to upgrade from one version to another
   */
  getMigrationsForRange(fromVersion: string, toVersion: string): Migration[] {
    return this.getAllMigrations()
      .filter(migration => {
        return compareVersions(migration.version, fromVersion) > 0 &&
               compareVersions(migration.version, toVersion) <= 0;
      });
  }

  /**
   * Get a specific migration by version
   */
  getMigration(version: string): Migration | undefined {
    return this.migrations.get(version);
  }

  /**
   * Check if migrations exist for a version range
   */
  hasMigrationsForRange(fromVersion: string, toVersion: string): boolean {
    return this.getMigrationsForRange(fromVersion, toVersion).length > 0;
  }
}

// Global migration registry
export const migrationRegistry = new MigrationRegistry();

/**
 * Migration from unversioned to versioned settings (0.0.0 -> 1.0.0)
 */
migrationRegistry.register({
  version: '1.0.0',
  description: 'Convert legacy unversioned settings to versioned format with metadata',
  up: (settings: ClaudeSettings): VersionedClaudeSettings => {
    return convertLegacySettings(settings, 'project');
  },
  validate: (settings: any): boolean => {
    return settings && typeof settings === 'object' && 
           typeof settings.version === 'string' &&
           settings.meta && typeof settings.meta === 'object';
  }
});

/**
 * Detects the version of settings configuration
 */
export function detectSettingsVersion(settings: any): string {
  if (!settings || typeof settings !== 'object') {
    return '0.0.0';
  }

  // If version field exists, use it
  if (settings.version && typeof settings.version === 'string') {
    try {
      parseVersion(settings.version); // Validate format
      return settings.version;
    } catch {
      // Invalid version format, treat as legacy
      return '0.0.0';
    }
  }

  // Check for versioned structure indicators
  if (settings.meta || settings.$schema) {
    return '1.0.0'; // Has metadata but no version field
  }

  // Legacy unversioned format
  return '0.0.0';
}

/**
 * Check if settings need migration
 */
export function needsMigration(settings: any, targetVersion: string = CURRENT_SCHEMA_VERSION): boolean {
  const currentVersion = detectSettingsVersion(settings);
  return compareVersions(currentVersion, targetVersion) < 0;
}

/**
 * Get the migration path from current version to target version
 */
export function getMigrationPath(
  fromVersion: string, 
  toVersion: string = CURRENT_SCHEMA_VERSION
): Migration[] {
  return migrationRegistry.getMigrationsForRange(fromVersion, toVersion);
}

/**
 * Apply a single migration
 */
export function applyMigration(
  settings: any,
  migration: Migration,
  source: 'global' | 'project' | 'local' = 'project'
): { success: boolean; settings?: any; error?: string } {
  try {
    // Apply the migration
    const migratedSettings = migration.up(settings);

    // Validate the result if validation function exists
    if (migration.validate && !migration.validate(migratedSettings)) {
      return {
        success: false,
        error: `Migration validation failed for version ${migration.version}`
      };
    }

    // Add migration record to metadata
    const now = new Date().toISOString();
    
    if (!migratedSettings.meta) {
      migratedSettings.meta = {};
    }
    
    if (!migratedSettings.meta.migrations) {
      migratedSettings.meta.migrations = [];
    }
    
    const migrationRecord: MigrationRecord = {
      version: migration.version,
      appliedAt: now,
      description: migration.description,
      changes: [`Migrated to version ${migration.version}`]
    };
    
    migratedSettings.meta.migrations.push(migrationRecord);
    migratedSettings.meta.updatedAt = now;
    migratedSettings.meta.source = source;

    return { success: true, settings: migratedSettings };

  } catch (error) {
    return {
      success: false,
      error: `Migration failed: ${(error as Error).message}`
    };
  }
}

/**
 * Apply all migrations from current version to target version
 */
export function migrateSettings(
  settings: any,
  targetVersion: string = CURRENT_SCHEMA_VERSION,
  source: 'global' | 'project' | 'local' = 'project'
): MigrationResult {
  const result: MigrationResult = {
    success: false,
    appliedMigrations: [],
    errors: []
  };

  try {
    let currentSettings = settings;
    const currentVersion = detectSettingsVersion(settings);
    
    // Check if migration is needed
    if (!needsMigration(currentSettings, targetVersion)) {
      // Validate current settings
      const validation = validateSettingsComprehensive(currentSettings, source);
      return {
        success: validation.valid,
        migratedSettings: validation.settings,
        appliedMigrations: [],
        errors: validation.valid ? [] : validation.errors.map(e => e.message)
      };
    }

    // Get migration path
    const migrations = getMigrationPath(currentVersion, targetVersion);
    
    if (migrations.length === 0) {
      result.errors.push(`No migration path found from version ${currentVersion} to ${targetVersion}`);
      return result;
    }

    // Apply each migration in sequence
    for (const migration of migrations) {
      const migrationResult = applyMigration(currentSettings, migration, source);
      
      if (!migrationResult.success) {
        result.errors.push(migrationResult.error || 'Unknown migration error');
        return result;
      }
      
      currentSettings = migrationResult.settings;
      result.appliedMigrations.push(migration.version);
    }

    // Final validation
    const finalValidation = validateSettingsComprehensive(currentSettings, source);
    
    if (!finalValidation.valid) {
      result.errors.push(...finalValidation.errors.map(e => e.message));
      return result;
    }

    result.success = true;
    result.migratedSettings = finalValidation.settings;
    
    return result;

  } catch (error) {
    result.errors.push(`Migration process failed: ${(error as Error).message}`);
    return result;
  }
}

/**
 * Create a migration record for manual tracking
 */
export function createMigrationRecord(
  version: string,
  description: string,
  changes: string[] = []
): MigrationRecord {
  return {
    version,
    appliedAt: new Date().toISOString(),
    description,
    changes
  };
}

/**
 * Check if a specific migration has been applied
 */
export function isMigrationApplied(
  settings: VersionedClaudeSettings,
  migrationVersion: string
): boolean {
  if (!settings.meta?.migrations) {
    return false;
  }
  
  return settings.meta.migrations.some(
    migration => migration.version === migrationVersion
  );
}

/**
 * Get migration history for settings
 */
export function getMigrationHistory(settings: VersionedClaudeSettings): MigrationRecord[] {
  return settings.meta?.migrations || [];
}

/**
 * Rollback settings to a previous migration state (if down migration exists)
 */
export function rollbackMigration(
  settings: VersionedClaudeSettings,
  targetVersion: string
): { success: boolean; settings?: VersionedClaudeSettings; error?: string } {
  try {
    const currentVersion = settings.version || CURRENT_SCHEMA_VERSION;
    
    if (compareVersions(targetVersion, currentVersion) >= 0) {
      return {
        success: false,
        error: 'Target version must be lower than current version for rollback'
      };
    }

    // Find migrations that need to be rolled back
    const migrationsToRollback = migrationRegistry
      .getAllMigrations()
      .filter(migration => {
        return compareVersions(migration.version, targetVersion) > 0 &&
               compareVersions(migration.version, currentVersion) <= 0;
      })
      .reverse(); // Apply rollbacks in reverse order

    let currentSettings = { ...settings };

    // Apply each rollback migration
    for (const migration of migrationsToRollback) {
      if (!migration.down) {
        return {
          success: false,
          error: `No rollback available for migration ${migration.version}`
        };
      }

      try {
        currentSettings = migration.down(currentSettings);
        
        // Remove migration record
        if (currentSettings.meta?.migrations) {
          currentSettings.meta.migrations = currentSettings.meta.migrations
            .filter(record => record.version !== migration.version);
        }
      } catch (error) {
        return {
          success: false,
          error: `Rollback failed for migration ${migration.version}: ${(error as Error).message}`
        };
      }
    }

    // Update version and metadata
    currentSettings.version = targetVersion;
    if (currentSettings.meta) {
      currentSettings.meta.updatedAt = new Date().toISOString();
    }

    return { success: true, settings: currentSettings };

  } catch (error) {
    return {
      success: false,
      error: `Rollback process failed: ${(error as Error).message}`
    };
  }
}

/**
 * Utility to dry-run migrations without applying them
 */
export function dryRunMigrations(
  settings: any,
  targetVersion: string = CURRENT_SCHEMA_VERSION
): {
  migrations: Migration[];
  wouldSucceed: boolean;
  errors: string[];
} {
  const currentVersion = detectSettingsVersion(settings);
  const migrations = getMigrationPath(currentVersion, targetVersion);
  const errors: string[] = [];
  let wouldSucceed = true;

  // Check if all required migrations exist and are valid
  for (const migration of migrations) {
    if (!migration.up) {
      errors.push(`Migration ${migration.version} is missing up function`);
      wouldSucceed = false;
    }

    // Try to validate migration logic without applying it
    try {
      if (migration.validate) {
        // We can't fully validate without applying, but we can check the function exists
        if (typeof migration.validate !== 'function') {
          errors.push(`Migration ${migration.version} has invalid validate function`);
          wouldSucceed = false;
        }
      }
    } catch (error) {
      errors.push(`Migration ${migration.version} validation check failed: ${(error as Error).message}`);
      wouldSucceed = false;
    }
  }

  return { migrations, wouldSucceed, errors };
}