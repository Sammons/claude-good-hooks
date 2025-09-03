import { homedir } from 'os';
import { join } from 'path';
import type { HookConfiguration } from '@sammons/claude-good-hooks-types';
import type { VersionedClaudeSettings } from '@sammons/claude-good-hooks-types';
import { 
  validateSettingsComprehensive,
  convertLegacySettings 
} from '@sammons/claude-good-hooks-types';
import { 
  atomicReadFile,
  atomicWriteSettings,
  atomicUpdateSettings,
  verifyFileIntegrity,
  cleanupBackups
} from '@sammons/claude-good-hooks-types';
import { 
  migrateSettings,
  needsMigration
} from '@sammons/claude-good-hooks-types';
import { 
  createVersionedSettings,
  trackSettingsChange,
  getVersionInfo
} from '@sammons/claude-good-hooks-types';

export function getSettingsPath(scope: 'global' | 'project' | 'local'): string {
  switch (scope) {
    case 'global':
      return join(homedir(), '.claude', 'settings.json');
    case 'project':
      return join(process.cwd(), '.claude', 'settings.json');
    case 'local':
      return join(process.cwd(), '.claude', 'settings.local.json');
  }
}

export function readSettings(scope: 'global' | 'project' | 'local'): VersionedClaudeSettings {
  const path = getSettingsPath(scope);
  
  // Use atomic read operation
  const readResult = atomicReadFile(path, { defaultValue: '{}' });
  
  if (!readResult.success) {
    console.error(`Error reading ${scope} settings:`, readResult.error);
    return createVersionedSettings(scope);
  }
  
  try {
    const parsed = JSON.parse(readResult.content || '{}');
    
    // Check if settings need migration
    if (needsMigration(parsed)) {
      console.log(`Migrating ${scope} settings to current version...`);
      const migrationResult = migrateSettings(parsed, undefined, scope);
      
      if (migrationResult.success && migrationResult.migratedSettings) {
        // Save migrated settings
        writeSettings(scope, migrationResult.migratedSettings);
        console.log(`Successfully migrated ${scope} settings. Applied migrations: ${migrationResult.appliedMigrations.join(', ')}`);
        return migrationResult.migratedSettings;
      } else {
        console.error(`Failed to migrate ${scope} settings:`, migrationResult.errors);
        // Fall back to converting legacy settings
        return convertLegacySettings(parsed, scope);
      }
    }
    
    // Validate existing settings
    const validation = validateSettingsComprehensive(parsed, scope);
    
    if (!validation.valid) {
      console.warn(`Invalid ${scope} settings detected:`, validation.errors.map(e => e.message));
      // Try to fix by converting to versioned format
      return convertLegacySettings(parsed, scope);
    }
    
    return validation.settings!;
    
  } catch (error) {
    console.error(`Error parsing ${scope} settings:`, error);
    return createVersionedSettings(scope);
  }
}

export function writeSettings(
  scope: 'global' | 'project' | 'local',
  settings: VersionedClaudeSettings
): boolean {
  const path = getSettingsPath(scope);
  
  // Use atomic write operation with validation
  const writeResult = atomicWriteSettings(path, settings, {
    backup: true,
    validateBeforeWrite: true,
    createDirectories: true
  });
  
  if (!writeResult.success) {
    console.error(`Failed to write ${scope} settings:`, writeResult.error?.message);
    if (writeResult.validationErrors) {
      console.error('Validation errors:', writeResult.validationErrors.map(e => e.message));
    }
    return false;
  }
  
  // Clean up old backups
  cleanupBackups(path, 5);
  
  if (writeResult.backupPath) {
    console.log(`Settings backed up to: ${writeResult.backupPath}`);
  }
  
  return true;
}

export function addHookToSettings(
  scope: 'global' | 'project' | 'local',
  eventName: keyof VersionedClaudeSettings['hooks'],
  hookConfig: HookConfiguration
): boolean {
  const path = getSettingsPath(scope);
  
  const updateResult = atomicUpdateSettings(path, (settings) => {
    if (!settings.hooks) {
      settings.hooks = {};
    }
    
    if (!settings.hooks[eventName]) {
      (settings.hooks as any)[eventName] = [];
    }
    
    (settings.hooks as any)[eventName].push(hookConfig);
    
    // Track the change
    return trackSettingsChange(
      settings,
      'update',
      `Added hook configuration to ${eventName}`,
      [eventName]
    );
  }, {
    backup: true,
    validateBeforeWrite: true
  });
  
  if (!updateResult.success) {
    console.error(`Failed to add hook to ${scope} settings:`, updateResult.error?.message);
    return false;
  }
  
  console.log(`Successfully added hook to ${eventName} in ${scope} settings`);
  return true;
}

export function removeHookFromSettings(
  scope: 'global' | 'project' | 'local',
  eventName: keyof VersionedClaudeSettings['hooks'],
  matcher?: string
): boolean {
  const path = getSettingsPath(scope);
  
  const updateResult = atomicUpdateSettings(path, (settings) => {
    if (!settings.hooks || !settings.hooks[eventName]) {
      return settings; // Nothing to remove
    }
    
    const originalLength = (settings.hooks as any)[eventName].length;
    
    if (matcher) {
      (settings.hooks as any)[eventName] = (settings.hooks as any)[eventName].filter(
        (config: any) => config.matcher !== matcher
      );
    } else {
      (settings.hooks as any)[eventName] = (settings.hooks as any)[eventName].filter(
        (config: any) => config.matcher !== undefined
      );
    }
    
    const removedCount = originalLength - (settings.hooks as any)[eventName].length;
    
    if (removedCount > 0) {
      // Track the change
      return trackSettingsChange(
        settings,
        'update',
        `Removed ${removedCount} hook configuration(s) from ${eventName}${matcher ? ` (matcher: ${matcher})` : ''}`,
        [eventName]
      );
    }
    
    return settings;
  }, {
    backup: true,
    validateBeforeWrite: true
  });
  
  if (!updateResult.success) {
    console.error(`Failed to remove hook from ${scope} settings:`, updateResult.error?.message);
    return false;
  }
  
  console.log(`Successfully processed hook removal from ${eventName} in ${scope} settings`);
  return true;
}

/**
 * Validate settings file integrity
 */
export function validateSettingsFile(scope: 'global' | 'project' | 'local'): {
  valid: boolean;
  errors: string[];
  warnings: string[];
  versionInfo?: ReturnType<typeof getVersionInfo>;
} {
  const path = getSettingsPath(scope);
  const result: { valid: boolean; errors: string[]; warnings: string[]; versionInfo?: ReturnType<typeof getVersionInfo> } = { valid: true, errors: [], warnings: [] };
  
  // Check file integrity
  const integrityCheck = verifyFileIntegrity(path);
  
  if (!integrityCheck.valid) {
    result.valid = false;
    result.errors.push(`File integrity check failed: ${integrityCheck.error?.message}`);
    return result;
  }
  
  if (!integrityCheck.settings) {
    result.valid = false;
    result.errors.push('Settings could not be parsed');
    return result;
  }
  
  // Check version compatibility
  const versionInfo = getVersionInfo(integrityCheck.settings);
  result.versionInfo = versionInfo;
  
  if (!versionInfo.isSupported) {
    result.errors.push(`Settings version ${versionInfo.current} is not supported`);
    result.valid = false;
  }
  
  if (versionInfo.needsUpdate) {
    result.warnings.push(`Settings version ${versionInfo.current} should be updated to ${versionInfo.latest}`);
  }
  
  return result;
}

/**
 * Repair corrupted settings file
 */
export function repairSettings(scope: 'global' | 'project' | 'local'): {
  success: boolean;
  message: string;
  backupPath?: string;
} {
  const path = getSettingsPath(scope);
  
  try {
    // Try to read existing settings
    const readResult = atomicReadFile(path);
    
    if (readResult.success && readResult.content) {
      try {
        const parsed = JSON.parse(readResult.content);
        
        // Try to migrate/convert to valid format
        const migrationResult = migrateSettings(parsed, undefined, scope);
        
        if (migrationResult.success && migrationResult.migratedSettings) {
          const writeResult = atomicWriteSettings(path, migrationResult.migratedSettings, {
            backup: true,
            validateBeforeWrite: true
          });
          
          if (writeResult.success) {
            return {
              success: true,
              message: `Successfully repaired ${scope} settings. Applied migrations: ${migrationResult.appliedMigrations.join(', ')}`,
              backupPath: writeResult.backupPath
            };
          }
        }
      } catch (parseError) {
        // File exists but is not valid JSON
      }
    }
    
    // Create new settings file
    const newSettings = createVersionedSettings(scope);
    const writeResult = atomicWriteSettings(path, newSettings, {
      backup: existsSync(path),
      validateBeforeWrite: true
    });
    
    if (writeResult.success) {
      return {
        success: true,
        message: `Created new ${scope} settings file`,
        backupPath: writeResult.backupPath
      };
    } else {
      return {
        success: false,
        message: `Failed to create new settings file: ${writeResult.error?.message}`
      };
    }
    
  } catch (error) {
    return {
      success: false,
      message: `Settings repair failed: ${(error as Error).message}`
    };
  }
}

/**
 * Get settings diagnostics information
 */
export function getSettingsDiagnostics(scope: 'global' | 'project' | 'local'): {
  path: string;
  exists: boolean;
  readable: boolean;
  valid: boolean;
  version?: string;
  size?: number;
  lastModified?: Date;
  backupCount?: number;
  issues: string[];
  recommendations: string[];
} {
  const path = getSettingsPath(scope);
  const diagnostics = {
    path,
    exists: existsSync(path),
    readable: false,
    valid: false,
    version: undefined as string | undefined,
    size: undefined as number | undefined,
    lastModified: undefined as Date | undefined,
    backupCount: undefined as number | undefined,
    issues: [] as string[],
    recommendations: [] as string[]
  };
  
  if (!diagnostics.exists) {
    diagnostics.issues.push('Settings file does not exist');
    diagnostics.recommendations.push('Create settings file with createVersionedSettings()');
    return diagnostics;
  }
  
  try {
    // Check file stats
    const stats = require('fs').statSync(path);
    diagnostics.size = stats.size;
    diagnostics.lastModified = stats.mtime;
    
    // Check readability
    const readResult = atomicReadFile(path);
    diagnostics.readable = readResult.success;
    
    if (!diagnostics.readable) {
      diagnostics.issues.push(`File is not readable: ${readResult.error?.message}`);
      return diagnostics;
    }
    
    // Validate content
    const validation = validateSettingsFile(scope);
    diagnostics.valid = validation.valid;
    diagnostics.version = validation.versionInfo?.current;
    
    diagnostics.issues.push(...validation.errors);
    if (validation.warnings.length > 0) {
      diagnostics.recommendations.push(...validation.warnings);
    }
    
    // Count backups
    const dir = dirname(path);
    const baseName = require('path').basename(path);
    try {
      const files = require('fs').readdirSync(dir);
      diagnostics.backupCount = files.filter((f: string) => f.startsWith(`${baseName}.backup.`)).length;
    } catch {
      // Ignore backup count errors
    }
    
  } catch (error) {
    diagnostics.issues.push(`Diagnostics failed: ${(error as Error).message}`);
  }
  
  return diagnostics;
}
