/**
 * Extract clean settings and metadata from legacy format
 */

import type {
  ClaudeSettings,
  ClaudeGoodHooksMetadata,
  HookConfiguration,
} from '../../types/index.js';
import { createMetadataTemplate } from '../utils/metadata-template.js';
import { extractCleanConfigAndMetadata } from '../metadata/extract-clean-config-and-metadata.js';

export type SettingsScope = 'global' | 'project' | 'local';

// CleanHookConfiguration is just HookConfiguration without our metadata
type CleanHookConfiguration = HookConfiguration;

export interface ExtractLegacyResult {
  cleanSettings: ClaudeSettings;
  extractedMetadata: ClaudeGoodHooksMetadata;
  issues: string[];
  warnings: string[];
}

/**
 * Extract clean settings and metadata from legacy format
 */
export function extractFromLegacy(parsed: any, scope: SettingsScope): ExtractLegacyResult {
  const issues: string[] = [];
  const warnings: string[] = [];

  // Create clean settings
  const cleanSettings: ClaudeSettings = {};
  const extractedMetadata = createMetadataTemplate(scope);

  // Copy meta information if it exists
  if (parsed.meta) {
    extractedMetadata.meta.createdAt = parsed.meta.createdAt || extractedMetadata.meta.createdAt;
    extractedMetadata.meta.migrations = parsed.meta.migrations || [];
  }

  if (parsed.hooks) {
    cleanSettings.hooks = {};

    for (const [eventName, configurations] of Object.entries(parsed.hooks)) {
      if (!Array.isArray(configurations)) {
        warnings.push(`Skipping non-array event configuration: ${eventName}`);
        continue;
      }

      const cleanConfigs: CleanHookConfiguration[] = [];
      const metadataArray: any[] = [];

      for (const config of configurations) {
        if (!config || typeof config !== 'object') {
          warnings.push(`Skipping invalid hook configuration in ${eventName}`);
          continue;
        }

        const { cleanConfig, metadata } = extractCleanConfigAndMetadata(
          config as HookConfiguration
        );
        cleanConfigs.push(cleanConfig);

        if (metadata) {
          metadataArray.push(metadata);
        }
      }

      if (cleanConfigs.length > 0) {
        const hookKey = eventName as keyof NonNullable<ClaudeSettings['hooks']>;
        if (!cleanSettings.hooks) cleanSettings.hooks = {};
        (cleanSettings.hooks as any)[hookKey] = cleanConfigs;
      }

      if (metadataArray.length > 0) {
        extractedMetadata.hooks[eventName] = { claudegoodhooks: metadataArray };
      }
    }
  }

  return { cleanSettings, extractedMetadata, issues, warnings };
}
