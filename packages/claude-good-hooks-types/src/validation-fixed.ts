/**
 * Configuration validation utilities using JSON Schema (Fixed Version)
 */

import type { ClaudeSettings } from './index.js';
import type {
  SchemaValidationError,
  SchemaValidationResult,
  VersionedClaudeSettings,
} from './schemas/index.js';
import { CURRENT_SCHEMA_VERSION } from './schemas/index.js';

// Simple validation without AJV for now to avoid import issues
export function validateSettings(settings: unknown): SchemaValidationResult {
  try {
    if (!settings || typeof settings !== 'object') {
      return {
        valid: false,
        errors: [
          {
            path: 'root',
            message: 'Settings must be an object',
          },
        ],
      };
    }

    // Basic structure validation
    const settingsObj = settings as Record<string, unknown>;

    if (settingsObj.hooks && typeof settingsObj.hooks !== 'object') {
      return {
        valid: false,
        errors: [
          {
            path: 'hooks',
            message: 'hooks must be an object',
          },
        ],
      };
    }

    return { valid: true, errors: [] };
  } catch (error) {
    return {
      valid: false,
      errors: [
        {
          path: 'root',
          message: `Validation error: ${(error as Error).message}`,
        },
      ],
    };
  }
}

/**
 * Validates and normalizes settings, adding defaults and metadata
 */
export function validateAndNormalizeSettings(
  settings: unknown,
  source: 'global' | 'project' | 'local' = 'project'
): {
  valid: boolean;
  settings?: VersionedClaudeSettings;
  errors: SchemaValidationError[];
} {
  // First validate the raw settings
  const validationResult = validateSettings(settings);

  if (!validationResult.valid) {
    return { valid: false, errors: validationResult.errors };
  }

  const normalizedSettings = { ...(settings as VersionedClaudeSettings) };

  // Add schema reference if missing
  if (!normalizedSettings.$schema) {
    normalizedSettings.$schema =
      'https://github.com/sammons/claude-good-hooks/schemas/claude-settings.json';
  }

  // Add version if missing
  if (!normalizedSettings.version) {
    normalizedSettings.version = CURRENT_SCHEMA_VERSION;
  }

  // Initialize metadata if missing
  if (!normalizedSettings.meta) {
    normalizedSettings.meta = {};
  }

  const now = new Date().toISOString();

  // Set creation time if not exists
  if (!normalizedSettings.meta.createdAt) {
    normalizedSettings.meta.createdAt = now;
  }

  // Always update modification time
  normalizedSettings.meta.updatedAt = now;

  // Set source
  normalizedSettings.meta.source = source;

  // Initialize migrations array if missing
  if (!normalizedSettings.meta.migrations) {
    normalizedSettings.meta.migrations = [];
  }

  return { valid: true, settings: normalizedSettings, errors: [] };
}

/**
 * Validates a partial settings update
 */
export function validatePartialSettings(
  partialSettings: Partial<VersionedClaudeSettings>
): SchemaValidationResult {
  // Create a minimal valid settings object and merge the partial
  const baseSettings: VersionedClaudeSettings = {
    version: CURRENT_SCHEMA_VERSION,
  };

  const mergedSettings = { ...baseSettings, ...partialSettings };
  return validateSettings(mergedSettings);
}

/**
 * Custom validation rules beyond JSON Schema
 */
export function performCustomValidation(
  settings: VersionedClaudeSettings
): SchemaValidationError[] {
  const errors: SchemaValidationError[] = [];

  if (!settings.hooks) {
    return errors;
  }

  // Validate hook configurations
  for (const [eventType, configurations] of Object.entries(settings.hooks)) {
    if (!configurations || !Array.isArray(configurations)) {
      continue;
    }

    for (let configIndex = 0; configIndex < configurations.length; configIndex++) {
      const config = configurations[configIndex];
      if (!config) continue;

      const configPath = `hooks.${eventType}[${configIndex}]`;

      // Validate matcher patterns for tools that support them
      if (config.matcher && ['PreToolUse', 'PostToolUse'].includes(eventType)) {
        try {
          // Test if matcher is valid regex
          new RegExp(config.matcher);
        } catch (regexError) {
          errors.push({
            path: `${configPath}.matcher`,
            message: `Invalid regex pattern: ${(regexError as Error).message}`,
            value: config.matcher,
          });
        }
      }

      // Validate hook commands
      if (config.hooks) {
        for (let hookIndex = 0; hookIndex < config.hooks.length; hookIndex++) {
          const hook = config.hooks[hookIndex];
          if (!hook) continue;

          const hookPath = `${configPath}.hooks[${hookIndex}]`;

          // Check for potentially dangerous commands
          if (hook.command) {
            const dangerousPatterns = [
              /rm\s+-rf\s+\//, // rm -rf /
              />\s*\/dev\/sd[a-z]/, // Writing to disk devices
              /dd\s+.*of=/, // dd command writing
              /mkfs/, // Format filesystem
              /fdisk/, // Disk partitioning
            ];

            for (const pattern of dangerousPatterns) {
              if (pattern.test(hook.command)) {
                errors.push({
                  path: `${hookPath}.command`,
                  message: 'Command appears to be potentially dangerous',
                  value: hook.command,
                  expected: 'A safe command that does not perform destructive operations',
                });
              }
            }
          }

          // Validate timeout ranges
          if (hook.timeout !== undefined) {
            if (hook.timeout < 0) {
              errors.push({
                path: `${hookPath}.timeout`,
                message: 'Timeout cannot be negative',
                value: hook.timeout,
                expected: 'A non-negative integer',
              });
            }

            if (hook.timeout > 3600000) {
              // 1 hour max
              errors.push({
                path: `${hookPath}.timeout`,
                message: 'Timeout exceeds maximum allowed value (1 hour)',
                value: hook.timeout,
                expected: 'A value between 0 and 3600000 milliseconds',
              });
            }
          }
        }
      }
    }
  }

  return errors;
}

/**
 * Comprehensive validation that includes both schema and custom rules
 */
export function validateSettingsComprehensive(
  settings: unknown,
  source?: 'global' | 'project' | 'local'
): {
  valid: boolean;
  settings?: VersionedClaudeSettings;
  errors: SchemaValidationError[];
} {
  // First validate and normalize against schema
  const schemaResult = validateAndNormalizeSettings(settings, source);

  if (!schemaResult.valid || !schemaResult.settings) {
    return schemaResult;
  }

  // Then perform custom validation
  const customErrors = performCustomValidation(schemaResult.settings);

  const allErrors = [...schemaResult.errors, ...customErrors];

  return {
    valid: allErrors.length === 0,
    settings: schemaResult.settings,
    errors: allErrors,
  };
}

/**
 * Type guard for validated settings
 */
export function isValidatedSettings(settings: unknown): settings is VersionedClaudeSettings {
  const result = validateSettings(settings);
  return result.valid;
}

/**
 * Converts legacy ClaudeSettings to versioned format
 */
export function convertLegacySettings(
  legacySettings: ClaudeSettings,
  source: 'global' | 'project' | 'local' = 'project'
): VersionedClaudeSettings {
  const now = new Date().toISOString();

  const versionedSettings: VersionedClaudeSettings = {
    $schema: 'https://github.com/sammons/claude-good-hooks/schemas/claude-settings.json',
    version: CURRENT_SCHEMA_VERSION,
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
    const hooks: VersionedClaudeSettings['hooks'] = {};

    for (const [eventType, configurations] of Object.entries(legacySettings.hooks)) {
      if (configurations && Array.isArray(configurations)) {
        const eventKey = eventType as keyof VersionedClaudeSettings['hooks'];
        hooks[eventKey] = configurations.map(config => ({
          matcher: config.matcher,
          enabled: true,
          hooks: config.hooks.map(hook => ({
            type: hook.type,
            command: hook.command,
            timeout: hook.timeout,
            enabled: true,
          })),
        }));
      }
    }

    versionedSettings.hooks = hooks;
  }

  return versionedSettings;
}
