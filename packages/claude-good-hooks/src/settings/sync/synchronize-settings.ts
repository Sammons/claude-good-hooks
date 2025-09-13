/**
 * Synchronize settings and metadata files to resolve divergence
 * This method ensures both files are in sync and removes duplicates
 *
 * IMPORTANT LIMITATION: This method assumes that for any given event type (e.g., PreToolUse),
 * either ALL hooks are managed by claude-good-hooks OR none are. It does NOT support
 * mixing managed and unmanaged hooks within the same event type.
 *
 * If you have both managed and unmanaged hooks in the same event type, the sync
 * will replace ALL hooks in that event type with only the managed ones.
 *
 * To preserve unmanaged hooks, they should be in different event types from managed ones.
 */

import { readSettingsAndMetadata } from '../readers/read-settings-and-metadata.js';
import { writeSettingsAndMetadata } from '../writers/write-settings-and-metadata.js';
import type { FileSystemProvider } from '../interfaces/file-system-provider.js';

export type SettingsScope = 'global' | 'project' | 'local';

// CleanHookConfiguration is just HookConfiguration without our metadata
type CleanHookConfiguration = any;

export interface SyncResult {
  duplicatesRemoved: number;
  orphansFixed: number;
  errors: string[];
  warnings: string[];
}

/**
 * Synchronize settings and metadata files to resolve divergence
 */
export async function synchronizeSettings(
  scope: SettingsScope,
  fileSystem: FileSystemProvider
): Promise<SyncResult> {
  const pair = await readSettingsAndMetadata(scope, fileSystem);
  let duplicatesRemoved = 0;
  let orphansFixed = 0;
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!pair.metadata) {
    return {
      duplicatesRemoved: 0,
      orphansFixed: 0,
      errors: ['No metadata file exists'],
      warnings: [],
    };
  }

  if (!pair.settings) {
    pair.settings = { hooks: {} };
  }
  if (!pair.settings.hooks) {
    pair.settings.hooks = {};
  }

  // First, process hooks that have metadata (claude-good-hooks managed)
  const processedEventNames = new Set<string>();

  for (const [eventName, eventMetadata] of Object.entries(pair.metadata.hooks)) {
    if (!eventMetadata?.claudegoodhooks) continue;

    processedEventNames.add(eventName);
    const metadataArray = eventMetadata.claudegoodhooks;

    // Remove duplicates in metadata
    const seen = new Map<string, number>();
    const uniqueMetadata: typeof metadataArray = [];

    for (let i = 0; i < metadataArray.length; i++) {
      const meta = metadataArray[i];
      if (!meta) continue;
      const key = meta.identifier.name;

      if (seen.has(key)) {
        duplicatesRemoved++;
        // Keep the newer one (compare lastModified)
        const existingIndex = seen.get(key)!;
        const existing = uniqueMetadata[existingIndex];
        if (existing && meta.lastModified > existing.lastModified) {
          uniqueMetadata[existingIndex] = meta;
        }
      } else {
        seen.set(key, uniqueMetadata.length);
        uniqueMetadata.push(meta);
      }
    }

    // Update metadata array
    eventMetadata.claudegoodhooks = uniqueMetadata;

    // Reconstruct managed hooks from metadata
    const managedHooks: CleanHookConfiguration[] = [];

    for (const meta of uniqueMetadata) {
      if (meta.customConfig?.hooks) {
        // Use stored config if available
        managedHooks.push({
          matcher: meta.customConfig.matcher as string | undefined,
          hooks: meta.customConfig.hooks as any,
          enabled: meta.enabled,
        });
      } else {
        // Create minimal config as we lost the original
        managedHooks.push({
          hooks: [],
          enabled: meta.enabled,
        });
        orphansFixed++;
        errors.push(`Reconstructed minimal config for ${meta.identifier.name}`);
      }
    }

    // Check if there are existing hooks in settings for this event
    const existingHooks = pair.settings.hooks[eventName as keyof typeof pair.settings.hooks];
    if (
      existingHooks &&
      Array.isArray(existingHooks) &&
      existingHooks.length > managedHooks.length
    ) {
      warnings.push(
        `WARNING: Event type '${eventName}' has ${existingHooks.length} hooks in settings but only ${managedHooks.length} managed hooks. ` +
          `Sync will replace ALL hooks in this event. Non-managed hooks will be lost!`
      );
    }

    // Update settings with managed hooks
    // IMPORTANT: This replaces ALL hooks for this event with managed ones
    // This is intentional as we track managed hooks by event type
    pair.settings.hooks[eventName as keyof typeof pair.settings.hooks] = managedHooks as any;
  }

  // CRITICAL: Preserve any event types that exist in settings but NOT in metadata
  // These are completely unmanaged hooks that we should never touch
  if (pair.settings.hooks) {
    for (const [eventName, hooks] of Object.entries(pair.settings.hooks)) {
      if (!processedEventNames.has(eventName) && Array.isArray(hooks) && hooks.length > 0) {
        // This event type has hooks but no metadata - it's completely unmanaged
        // Leave it untouched
        warnings.push(`Preserved ${hooks.length} unmanaged hook(s) in ${eventName}`);
      }
    }
  }

  // Clean up empty arrays
  for (const [eventName, configs] of Object.entries(pair.settings.hooks)) {
    if (Array.isArray(configs) && configs.length === 0) {
      delete pair.settings.hooks[eventName as keyof typeof pair.settings.hooks];
    }
  }

  // Write synchronized files
  await writeSettingsAndMetadata(scope, pair.settings, pair.metadata, fileSystem);

  return { duplicatesRemoved, orphansFixed, errors, warnings };
}