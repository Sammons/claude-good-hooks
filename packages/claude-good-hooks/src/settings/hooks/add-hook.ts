/**
 * Add a hook with its metadata to the settings
 */

import type { ClaudeSettings, HookConfiguration } from '../../types/index.js';
import { readSettingsAndMetadata } from '../readers/read-settings-and-metadata.js';
import { writeSettingsAndMetadata } from '../writers/write-settings-and-metadata.js';
import type { FileSystemProvider } from '../interfaces/file-system-provider.js';
import { createMetadataTemplate } from '../utils/metadata-template.js';
import { extractCleanConfigAndMetadata } from '../metadata/extract-clean-config-and-metadata.js';

import type { SettingsScope } from '../settings-types.js';

// CleanHookConfiguration is just HookConfiguration without our metadata
type CleanHookConfiguration = HookConfiguration;

/**
 * Add a hook with its metadata to the settings
 */
export async function addHook(
  scope: SettingsScope,
  eventName: keyof Required<ClaudeSettings>['hooks'],
  hookConfig: HookConfiguration,
  fileSystem: FileSystemProvider
): Promise<void> {
  const pair = await readSettingsAndMetadata(scope, fileSystem);

  // Initialize settings and metadata if they don't exist
  if (!pair.settings) {
    pair.settings = { hooks: {} };
  }
  if (!pair.settings.hooks) {
    pair.settings.hooks = {};
  }
  if (!pair.metadata || Object.keys(pair.metadata).length === 0) {
    pair.metadata = createMetadataTemplate(scope);
  }

  // Extract clean configuration and metadata
  const { cleanConfig, metadata } = extractCleanConfigAndMetadata(hookConfig);

  // Initialize hooks array if it doesn't exist
  if (!pair.settings.hooks[eventName]) {
    pair.settings.hooks[eventName] = [];
  }

  // Initialize metadata if it doesn't exist
  if (!pair.metadata) {
    pair.metadata = createMetadataTemplate(scope);
  }
  // TypeScript needs non-null assertion here
  const pairMetadata = pair.metadata!;
  if (!pairMetadata.hooks) {
    pairMetadata.hooks = {};
  }
  if (!pairMetadata.hooks[eventName]) {
    pairMetadata.hooks[eventName] = { claudegoodhooks: [] };
  }

  // Check for duplicate in METADATA (not settings) since metadata is our source of truth
  let existingMetaIndex = -1;
  if (metadata) {
    const metadataArray = pairMetadata.hooks[eventName]?.claudegoodhooks || [];
    existingMetaIndex = metadataArray.findIndex(
      existingMeta => existingMeta.identifier.name === metadata.identifier.name
    );
  }

  // Synchronize: ensure settings and metadata arrays have same length
  const settingsArray = pair.settings.hooks[eventName]!;
  const metadataArray = pairMetadata.hooks[eventName]?.claudegoodhooks || [];

  // Handle divergence: if metadata has more entries than settings, pad settings
  while (settingsArray.length < metadataArray.length) {
    // Reconstruct the settings entry from metadata
    const orphanedMetadata = metadataArray[settingsArray.length];
    if (!orphanedMetadata) continue;
    const reconstructedConfig: CleanHookConfiguration = {
      matcher: orphanedMetadata.customConfig?.matcher as string | undefined,
      hooks: (orphanedMetadata.customConfig?.hooks as any) || [],
      enabled: orphanedMetadata.enabled,
    };
    settingsArray.push(reconstructedConfig);
  }

  // Handle divergence: if settings has more entries than metadata, remove extras
  while (settingsArray.length > metadataArray.length) {
    settingsArray.pop();
  }

  if (existingMetaIndex >= 0) {
    // Update existing hook at the metadata index
    settingsArray[existingMetaIndex] = cleanConfig;
    if (metadata) {
      metadataArray[existingMetaIndex] = metadata;
    }
  } else {
    // Add new hook to both arrays
    settingsArray.push(cleanConfig);

    if (metadata) {
      metadataArray.push(metadata);
    }
  }

  // Store the hook commands in customConfig for reconstruction
  if (metadata && cleanConfig) {
    metadata.customConfig = {
      matcher: cleanConfig.matcher,
      hooks: cleanConfig.hooks,
      ...metadata.customConfig,
    };
  }

  // Write both files (metadata is guaranteed to be defined at this point)
  if (pair.metadata) {
    await writeSettingsAndMetadata(scope, pair.settings, pair.metadata, fileSystem);
  }
}
