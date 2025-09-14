/**
 * Utility for creating metadata file templates
 */

import type { ClaudeGoodHooksMetadata } from '../../types/index.js';
import type { SettingsScope } from '../dual-settings-helper.js';

/**
 * Create a new metadata file template for a given scope
 */
export function createMetadataTemplate(scope: SettingsScope): ClaudeGoodHooksMetadata {
  const now = new Date().toISOString();

  return {
    $schema:
      'https://github.com/sammons2/claude-good-hooks/schemas/claude-good-hooks-metadata.json',
    meta: {
      version: '1.0.0',
      createdAt: now,
      updatedAt: now,
      source: scope,
      generator: {
        name: '@sammons/claude-good-hooks',
        version: '1.0.0', // This should be dynamically set from package.json
      },
    },
    hooks: {},
  };
}

/**
 * Update the timestamps in metadata
 */
export function updateMetadataTimestamp(
  metadata: ClaudeGoodHooksMetadata
): ClaudeGoodHooksMetadata {
  return {
    ...metadata,
    meta: {
      ...metadata.meta,
      updatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Add migration record to metadata
 */
export function addMigrationRecord(
  metadata: ClaudeGoodHooksMetadata,
  fromVersion: string,
  description: string,
  changes?: string[]
): ClaudeGoodHooksMetadata {
  const migrationRecord = {
    version: fromVersion,
    appliedAt: new Date().toISOString(),
    description,
    changes,
  };

  return {
    ...metadata,
    meta: {
      ...metadata.meta,
      migrations: [...(metadata.meta.migrations || []), migrationRecord],
      updatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Validate metadata structure
 */
export function validateMetadata(metadata: unknown): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (typeof metadata !== 'object' || metadata === null) {
    errors.push('Metadata must be an object');
    return { valid: false, errors };
  }

  const meta = metadata as any;

  if (!meta.meta) {
    errors.push('Missing meta property');
  } else {
    if (!meta.meta.version) errors.push('Missing meta.version');
    if (!meta.meta.createdAt) errors.push('Missing meta.createdAt');
    if (!meta.meta.updatedAt) errors.push('Missing meta.updatedAt');
    if (!meta.meta.source) errors.push('Missing meta.source');
    if (!['global', 'project', 'local'].includes(meta.meta.source)) {
      errors.push('Invalid meta.source value');
    }
  }

  if (!meta.hooks || typeof meta.hooks !== 'object') {
    errors.push('Missing or invalid hooks property');
  }

  return { valid: errors.length === 0, errors };
}
