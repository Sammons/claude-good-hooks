# Configuration Validation and Management System

This document describes the comprehensive configuration validation and management system implemented for Claude Good Hooks.

## Overview

The system provides robust configuration validation and management with the following key features:

1. **JSON Schema Validation** - Comprehensive schema definitions for settings validation
2. **Atomic File Operations** - Safe file operations with rollback capabilities
3. **Migration System** - Automatic migration of legacy configurations
4. **Version Tracking** - Settings versioning and change tracking
5. **Error Handling** - Detailed error reporting and recovery mechanisms

## Core Components

### 1. JSON Schema Definition (`src/schemas/claude-settings.schema.json`)

Comprehensive JSON Schema that validates:
- Settings structure and format
- Hook configurations and commands
- Timeout values and constraints
- Matcher patterns for tool filtering
- Metadata and versioning information

Key features:
- Supports all Claude Code hook events
- Validates command safety and constraints
- Enforces timeout limits (max 1 hour)
- Provides clear error messages and examples

### 2. Validation Utilities (`src/validation.ts`)

Advanced validation system that includes:
- **Schema Validation**: JSON Schema-based validation using Ajv
- **Custom Rules**: Additional safety checks for dangerous commands
- **Normalization**: Automatic addition of defaults and metadata
- **Legacy Conversion**: Converts old settings format to new versioned format

Key functions:
- `validateSettings()` - Basic schema validation
- `validateAndNormalizeSettings()` - Validation with normalization
- `validateSettingsComprehensive()` - Full validation including custom rules
- `convertLegacySettings()` - Legacy format conversion

### 3. Atomic File Operations (`src/atomic-operations.ts`)

Safe file operations that prevent data corruption:
- **Atomic Writes**: Write to temporary file then atomically move
- **Backup Creation**: Automatic backup before modifications
- **Validation**: Pre-write validation to prevent invalid saves
- **Rollback**: Ability to restore from backups on failure

Key functions:
- `atomicWriteFile()` - Safe file writing with validation
- `atomicWriteSettings()` - JSON settings-specific atomic write
- `atomicUpdateSettings()` - Update settings with atomic operations
- `rollbackFromBackup()` - Restore from backup file

### 4. Migration System (`src/migrations.ts`)

Automatic migration of settings between versions:
- **Version Detection**: Automatically detect settings version
- **Migration Registry**: Extensible system for adding new migrations  
- **Sequential Migration**: Apply multiple migrations in order
- **Rollback Support**: Reverse migrations where possible

Key functions:
- `migrateSettings()` - Migrate settings to target version
- `detectSettingsVersion()` - Identify current settings version
- `needsMigration()` - Check if migration is required
- `dryRunMigrations()` - Test migrations without applying

### 5. Version Tracking (`src/version-tracking.ts`)

Comprehensive version management:
- **Semantic Versioning**: Full semver support with parsing
- **Change Tracking**: Track all modifications with metadata
- **Compatibility Checking**: Version compatibility validation
- **History Management**: Maintain migration and change history

Key functions:
- `createVersionedSettings()` - Create new versioned settings
- `getVersionInfo()` - Get version status and compatibility info
- `trackSettingsChange()` - Record settings changes
- `compareSettingsVersions()` - Compare different versions

## Updated Settings Utilities

The existing settings utilities have been completely rewritten to use the new validation system:

### Enhanced `readSettings()`
- Automatic migration of legacy settings
- Comprehensive validation on read
- Fallback to safe defaults on errors
- Returns `VersionedClaudeSettings` instead of `ClaudeSettings`

### Enhanced `writeSettings()`
- Atomic write operations with backups
- Pre-write validation
- Automatic cleanup of old backups
- Returns success/failure status

### Enhanced `addHookToSettings()` and `removeHookFromSettings()`
- Atomic update operations
- Change tracking and metadata updates
- Comprehensive error handling
- Validation before applying changes

### New Utility Functions
- `validateSettingsFile()` - Check file integrity
- `repairSettings()` - Repair corrupted settings files
- `getSettingsDiagnostics()` - Get detailed file diagnostics

## Installation and Usage

### Dependencies

The system requires these new dependencies:
- `ajv` ^8.17.1 - JSON Schema validation
- `ajv-formats` ^3.0.1 - Additional format validation

### Basic Usage

```typescript
import { 
  readSettings, 
  writeSettings, 
  validateSettingsFile 
} from '@sammons/claude-good-hooks-cli/utils/settings';

// Read settings (automatically migrates if needed)
const settings = readSettings('project');

// Validate settings file
const validation = validateSettingsFile('project');
if (!validation.valid) {
  console.error('Settings validation failed:', validation.errors);
}

// Write settings safely
const success = writeSettings('project', settings);
if (!success) {
  console.error('Failed to write settings');
}
```

### Advanced Usage

```typescript
import { 
  migrateSettings, 
  atomicUpdateSettings,
  getVersionInfo 
} from '@sammons/claude-good-hooks-types';

// Check version info
const versionInfo = getVersionInfo(settings);
if (versionInfo.needsUpdate) {
  console.log(`Settings need update from ${versionInfo.current} to ${versionInfo.latest}`);
}

// Safely update settings
const result = atomicUpdateSettings('/path/to/settings.json', (settings) => {
  // Make modifications
  settings.hooks.PostToolUse = [...];
  return settings;
});

if (!result.success) {
  console.error('Update failed:', result.error);
}
```

## Migration Path

### From Legacy Settings (v0.0.0)

Legacy settings without versioning are automatically detected and migrated:

1. **Detection**: Settings without `version` field are identified as legacy
2. **Conversion**: Hooks are preserved and wrapped in versioned structure
3. **Metadata**: Creation/update timestamps and migration history added
4. **Validation**: Full validation applied to ensure correctness

### Schema Evolution

Future schema changes can be handled by:

1. **Adding Migrations**: Register new migrations in `migrations.ts`
2. **Version Bumping**: Update `CURRENT_SCHEMA_VERSION` constant
3. **Testing**: Use dry-run migrations to test changes

## Error Handling

The system provides comprehensive error handling:

### Validation Errors
- Clear error messages with path information
- Specific validation failure reasons
- Suggestions for fixing issues

### File Operation Errors
- Automatic backup creation before risky operations
- Rollback capabilities on failure
- Detailed error reporting with context

### Migration Errors
- Validation of each migration step
- Ability to rollback failed migrations
- Detailed error logging with stack traces

## Security Features

### Command Validation
- Detection of potentially dangerous commands
- Configurable safety rules
- Warning system for risky operations

### File Safety
- Atomic operations prevent corruption
- Backup system prevents data loss
- Permission and path validation

## Testing

Comprehensive test suite covering:
- Schema validation edge cases
- Atomic operation failure scenarios
- Migration path testing
- Integration testing across components

Run tests with:
```bash
pnpm test
```

## Future Enhancements

Potential improvements for future versions:
1. **Remote Schema Updates**: Download updated schemas from CDN
2. **Configuration Templates**: Pre-built configurations for common workflows
3. **Interactive Migration**: User-guided migration for complex changes
4. **Configuration Linting**: Advanced static analysis of hook configurations
5. **Performance Monitoring**: Track configuration impact on hook execution

## Conclusion

This configuration validation and management system provides a robust foundation for handling Claude Good Hooks settings with:

- **Safety**: Atomic operations and backups prevent data loss
- **Reliability**: Comprehensive validation ensures configuration correctness
- **Flexibility**: Migration system handles schema evolution
- **Usability**: Clear error messages and automated repairs
- **Maintainability**: Well-structured, extensible codebase

The system is designed to be backwards-compatible while providing a clear upgrade path for future enhancements.