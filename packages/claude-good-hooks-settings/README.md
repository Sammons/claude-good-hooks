# @sammons/claude-good-hooks-settings

> ⚠️ **DEPRECATED**: This package is deprecated and will be removed in a future version. 
> 
> The settings functionality has been integrated directly into the main CLI package `@sammons/claude-good-hooks`.
> Please update your imports to use the main package instead.
>
> ```typescript
> // OLD (deprecated)
> import { validateSettings } from '@sammons/claude-good-hooks-settings';
> 
> // NEW (use this instead)
> import { validateSettings } from '@sammons/claude-good-hooks';
> ```

Settings management utilities for Claude Good Hooks, including validation, atomic operations, migrations, and version tracking.

## Features

- **Schema Validation**: Validate Claude settings against JSON Schema with custom rules
- **Atomic Operations**: Safe file operations with backup and rollback capabilities
- **Migration System**: Automatic migration of settings between schema versions
- **Version Tracking**: Track settings changes and version history
- **Type Safety**: Full TypeScript support with runtime validation

## Installation

```bash
npm install @sammons/claude-good-hooks-settings
```

## Usage

### Validation

```typescript
import { validateSettings, validateSettingsComprehensive } from '@sammons/claude-good-hooks-settings';

const result = validateSettingsComprehensive(settingsData);
if (result.valid) {
  console.log('Settings are valid:', result.settings);
} else {
  console.error('Validation errors:', result.errors);
}
```

### Atomic File Operations

```typescript
import { atomicWriteSettings, atomicUpdateSettings } from '@sammons/claude-good-hooks-settings';

// Write settings safely with backup
const writeResult = atomicWriteSettings('/path/to/settings.json', settings);

// Update settings atomically
const updateResult = atomicUpdateSettings('/path/to/settings.json', (current) => {
  // Modify and return updated settings
  return { ...current, /* changes */ };
});
```

### Migrations

```typescript
import { migrateSettings, needsMigration } from '@sammons/claude-good-hooks-settings';

if (needsMigration(settings)) {
  const migrationResult = migrateSettings(settings);
  if (migrationResult.success) {
    console.log('Migration successful:', migrationResult.migratedSettings);
  }
}
```

### Version Tracking

```typescript
import { getVersionInfo, getVersionHistory } from '@sammons/claude-good-hooks-settings';

const versionInfo = getVersionInfo(settings);
const history = getVersionHistory(settings);
```

## License

MIT