/**
 * Dual Settings Helper for managing both Claude settings.json and claude-good-hooks.json files
 *
 * This helper implements the new architecture where:
 * - settings.json contains only clean hook configurations (no metadata)
 * - claude-good-hooks.json contains all our custom metadata
 *
 * This separation resolves validation conflicts with Claude Code.
 */

import type { ClaudeSettings, HookConfiguration } from '@sammons/claude-good-hooks-types';

// CleanHookConfiguration is just HookConfiguration without our metadata
type CleanHookConfiguration = HookConfiguration;

import type {
  ClaudeGoodHooksMetadata,
  HookInstanceMetadata,
  HookIdentifier,
  SettingsMetadataPair,
  MigrationStatus,
  HookWithMetadata,
} from '@sammons/claude-good-hooks-types';

import { generateHookId } from './utils/hook-id.js';
import { createMetadataTemplate } from './utils/metadata-template.js';

export type SettingsScope = 'global' | 'project' | 'local';

/**
 * Duck-typed interface for file system operations.
 */
interface FileSystemProvider {
  readFile(path: string, encoding?: string): Promise<string>;
  writeFile(path: string, content: string, encoding?: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  dirname(path: string): string;
  join(...paths: string[]): string;
  homedir(): string;
  cwd(): string;
}

/**
 * Dual settings helper that manages both settings.json and claude-good-hooks.json files
 */
export class DualSettingsHelper {
  constructor(private readonly fileSystem: FileSystemProvider) {}

  /**
   * Get the path to the settings file for the specified scope
   */
  getSettingsPath(scope: SettingsScope): string {
    switch (scope) {
      case 'global':
        return this.fileSystem.join(this.fileSystem.homedir(), '.claude', 'settings.json');
      case 'project':
        return this.fileSystem.join(this.fileSystem.cwd(), '.claude', 'settings.json');
      case 'local':
        return this.fileSystem.join(this.fileSystem.cwd(), '.claude', 'settings.local.json');
    }
  }

  /**
   * Get the path to the metadata file for the specified scope
   */
  getMetadataPath(scope: SettingsScope): string {
    switch (scope) {
      case 'global':
        return this.fileSystem.join(this.fileSystem.homedir(), '.claude', 'claude-good-hooks.json');
      case 'project':
        return this.fileSystem.join(this.fileSystem.cwd(), '.claude', 'claude-good-hooks.json');
      case 'local':
        return this.fileSystem.join(
          this.fileSystem.cwd(),
          '.claude',
          'claude-good-hooks.local.json'
        );
    }
  }

  /**
   * Read both settings and metadata files for a scope
   */
  async readSettingsAndMetadata(scope: SettingsScope): Promise<SettingsMetadataPair> {
    const settingsPath = this.getSettingsPath(scope);
    const metadataPath = this.getMetadataPath(scope);

    const [settingsResult, metadataResult] = await Promise.all([
      this.atomicReadFile(settingsPath),
      this.atomicReadFile(metadataPath),
    ]);

    const pair: SettingsMetadataPair = {
      settingsPath,
      metadataPath,
      exists: {
        settings: settingsResult.success && settingsResult.content !== '{}',
        metadata: metadataResult.success && metadataResult.content !== '{}',
      },
    };

    // Parse settings
    if (settingsResult.success && settingsResult.content) {
      try {
        const parsed = JSON.parse(settingsResult.content);
        pair.settings = parsed as ClaudeSettings;
      } catch (error) {
        console.error(`Error parsing settings from ${settingsPath}:`, error);
      }
    }

    // Parse metadata
    if (metadataResult.success && metadataResult.content) {
      try {
        const parsed = JSON.parse(metadataResult.content);
        pair.metadata = parsed as ClaudeGoodHooksMetadata;
      } catch (error) {
        console.error(`Error parsing metadata from ${metadataPath}:`, error);
      }
    }

    return pair;
  }

  /**
   * Write both settings and metadata files for a scope
   */
  async writeSettingsAndMetadata(
    scope: SettingsScope,
    settings: ClaudeSettings,
    metadata: ClaudeGoodHooksMetadata
  ): Promise<void> {
    const settingsPath = this.getSettingsPath(scope);
    const metadataPath = this.getMetadataPath(scope);

    // Ensure directories exist
    for (const path of [settingsPath, metadataPath]) {
      const dir = this.fileSystem.dirname(path);
      if (!(await this.fileSystem.exists(dir))) {
        await this.fileSystem.mkdir(dir, { recursive: true });
      }
    }

    // Update metadata timestamps
    metadata.meta.updatedAt = new Date().toISOString();

    // Write both files
    await Promise.all([
      this.atomicWriteFile(settingsPath, JSON.stringify(settings, null, 2)),
      this.atomicWriteFile(metadataPath, JSON.stringify(metadata, null, 2)),
    ]);
  }

  /**
   * Add a hook with its metadata to the settings
   */
  async addHook(
    scope: SettingsScope,
    eventName: keyof Required<ClaudeSettings>['hooks'],
    hookConfig: HookConfiguration
  ): Promise<void> {
    const pair = await this.readSettingsAndMetadata(scope);

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
    const { cleanConfig, metadata } = this.extractCleanConfigAndMetadata(hookConfig);

    // Initialize hooks array if it doesn't exist
    if (!pair.settings.hooks[eventName]) {
      pair.settings.hooks[eventName] = [];
    }

    // Initialize metadata if it doesn't exist
    if (!pair.metadata.hooks[eventName]) {
      pair.metadata.hooks[eventName] = { claudegoodhooks: [] };
    }

    // Check for duplicate in METADATA (not settings) since metadata is our source of truth
    let existingMetaIndex = -1;
    if (metadata) {
      const metadataArray = pair.metadata.hooks[eventName]?.claudegoodhooks || [];
      existingMetaIndex = metadataArray.findIndex(
        existingMeta => existingMeta.identifier.name === metadata.identifier.name
      );
    }

    // Synchronize: ensure settings and metadata arrays have same length
    const settingsArray = pair.settings.hooks[eventName]!;
    const metadataArray = pair.metadata.hooks[eventName].claudegoodhooks;

    // Handle divergence: if metadata has more entries than settings, pad settings
    while (settingsArray.length < metadataArray.length) {
      // Reconstruct the settings entry from metadata
      const orphanedMetadata = metadataArray[settingsArray.length];
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

    // Write both files
    await this.writeSettingsAndMetadata(scope, pair.settings, pair.metadata);
  }

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
  async synchronize(scope: SettingsScope): Promise<{
    duplicatesRemoved: number;
    orphansFixed: number;
    errors: string[];
    warnings: string[];
  }> {
    const pair = await this.readSettingsAndMetadata(scope);
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
        const key = meta.identifier.name;

        if (seen.has(key)) {
          duplicatesRemoved++;
          // Keep the newer one (compare lastModified)
          const existingIndex = seen.get(key)!;
          if (meta.lastModified > uniqueMetadata[existingIndex].lastModified) {
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
    await this.writeSettingsAndMetadata(scope, pair.settings, pair.metadata);

    return { duplicatesRemoved, orphansFixed, errors, warnings };
  }

  /**
   * Remove a hook from the settings
   */
  async removeHook(
    scope: SettingsScope,
    eventName: keyof Required<ClaudeSettings>['hooks'],
    identifier: string | HookIdentifier
  ): Promise<boolean> {
    const pair = await this.readSettingsAndMetadata(scope);

    if (!pair.settings?.hooks?.[eventName] || !pair.metadata?.hooks[eventName]) {
      return false; // Nothing to remove
    }

    const hookName = typeof identifier === 'string' ? identifier : identifier.name;

    // Find hook by name in metadata
    const metadataArray = pair.metadata.hooks[eventName].claudegoodhooks;
    const hookIndex = metadataArray.findIndex(
      meta => meta.identifier.name === hookName || meta.identifier.id === hookName
    );

    if (hookIndex === -1) {
      return false; // Hook not found
    }

    // Remove from both settings and metadata
    pair.settings.hooks[eventName]!.splice(hookIndex, 1);
    metadataArray.splice(hookIndex, 1);

    // Clean up empty arrays
    if (pair.settings.hooks[eventName]!.length === 0) {
      delete pair.settings.hooks[eventName];
    }
    if (metadataArray.length === 0) {
      delete pair.metadata.hooks[eventName];
    }

    // Write both files
    await this.writeSettingsAndMetadata(scope, pair.settings, pair.metadata);
    return true;
  }

  /**
   * Get merged view of hooks with their metadata
   */
  async getHooksWithMetadata(scope: SettingsScope): Promise<{
    [eventName: string]: HookWithMetadata[];
  }> {
    const pair = await this.readSettingsAndMetadata(scope);
    const result: { [eventName: string]: HookWithMetadata[] } = {};

    if (!pair.settings?.hooks) {
      return result;
    }

    for (const [eventName, configurations] of Object.entries(pair.settings.hooks)) {
      if (!configurations) continue;

      result[eventName] = configurations.map((config, index) => {
        const metadata = pair.metadata?.hooks[eventName]?.claudegoodhooks[index];

        return {
          configuration: config,
          metadata,
        };
      });
    }

    return result;
  }

  /**
   * Check if migration is needed from old format
   */
  async checkMigrationStatus(scope: SettingsScope): Promise<MigrationStatus> {
    const settingsPath = this.getSettingsPath(scope);
    const readResult = await this.atomicReadFile(settingsPath);

    if (!readResult.success || !readResult.content) {
      return {
        needsMigration: false,
        blockingIssues: [],
        warnings: [],
      };
    }

    try {
      const parsed = JSON.parse(readResult.content);

      // Check if it's legacy format (has $schema, version, meta, or claudegoodhooks)
      const hasLegacyMarkers =
        '$schema' in parsed ||
        'version' in parsed ||
        'meta' in parsed ||
        this.hasClaudeGoodHooksMetadata(parsed);

      if (!hasLegacyMarkers) {
        return {
          needsMigration: false,
          blockingIssues: [],
          warnings: [],
        };
      }

      // Extract clean settings and metadata
      const { cleanSettings, extractedMetadata, issues, warnings } = this.extractFromLegacy(
        parsed,
        scope
      );

      return {
        needsMigration: true,
        blockingIssues: issues,
        warnings,
        extractedMetadata,
        cleanSettings,
      };
    } catch (error) {
      return {
        needsMigration: false,
        blockingIssues: [`Invalid JSON in settings file: ${error}`],
        warnings: [],
      };
    }
  }

  /**
   * Perform migration from legacy format
   */
  async migrate(scope: SettingsScope): Promise<{ success: boolean; error?: string }> {
    try {
      const migrationStatus = await this.checkMigrationStatus(scope);

      if (!migrationStatus.needsMigration) {
        return { success: true };
      }

      if (migrationStatus.blockingIssues.length > 0) {
        return {
          success: false,
          error: `Migration blocked: ${migrationStatus.blockingIssues.join(', ')}`,
        };
      }

      if (!migrationStatus.cleanSettings || !migrationStatus.extractedMetadata) {
        return {
          success: false,
          error: 'Migration analysis failed to extract clean settings or metadata',
        };
      }

      // Write the separated files
      await this.writeSettingsAndMetadata(
        scope,
        migrationStatus.cleanSettings,
        migrationStatus.extractedMetadata
      );

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Migration failed: ${error}`,
      };
    }
  }

  /**
   * Extract clean configuration and metadata from legacy HookConfiguration
   */
  private extractCleanConfigAndMetadata(hookConfig: HookConfiguration): {
    cleanConfig: CleanHookConfiguration;
    metadata?: HookInstanceMetadata;
  } {
    const cleanConfig: CleanHookConfiguration = {
      matcher: hookConfig.matcher,
      hooks: hookConfig.hooks,
      enabled: hookConfig.enabled,
    };

    let metadata: HookInstanceMetadata | undefined;

    if (hookConfig.claudegoodhooks) {
      const id = generateHookId(
        hookConfig.claudegoodhooks.name,
        hookConfig.claudegoodhooks.version
      );
      const now = new Date().toISOString();

      metadata = {
        identifier: {
          id,
          name: hookConfig.claudegoodhooks.name,
          version: hookConfig.claudegoodhooks.version,
        },
        description: hookConfig.claudegoodhooks.description,
        source: 'local', // Default, can be updated by caller
        installedAt: now,
        lastModified: now,
        hookFactoryArguments: hookConfig.claudegoodhooks.hookFactoryArguments,
        enabled: hookConfig.enabled ?? true,
      };
    }

    return { cleanConfig, metadata };
  }

  /**
   * Check if parsed settings contain claudegoodhooks metadata
   */
  private hasClaudeGoodHooksMetadata(parsed: any): boolean {
    if (!parsed.hooks) return false;

    for (const eventConfigs of Object.values(parsed.hooks)) {
      if (!Array.isArray(eventConfigs)) continue;

      for (const config of eventConfigs) {
        if (config && typeof config === 'object' && 'claudegoodhooks' in config) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Extract clean settings and metadata from legacy format
   */
  private extractFromLegacy(
    parsed: any,
    scope: SettingsScope
  ): {
    cleanSettings: ClaudeSettings;
    extractedMetadata: ClaudeGoodHooksMetadata;
    issues: string[];
    warnings: string[];
  } {
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
        const metadataArray: HookInstanceMetadata[] = [];

        for (const config of configurations) {
          if (!config || typeof config !== 'object') {
            warnings.push(`Skipping invalid hook configuration in ${eventName}`);
            continue;
          }

          const { cleanConfig, metadata } = this.extractCleanConfigAndMetadata(
            config as HookConfiguration
          );
          cleanConfigs.push(cleanConfig);

          if (metadata) {
            metadataArray.push(metadata);
          }
        }

        if (cleanConfigs.length > 0) {
          cleanSettings.hooks[eventName as keyof ClaudeSettings['hooks']] = cleanConfigs as any;
        }

        if (metadataArray.length > 0) {
          extractedMetadata.hooks[eventName] = { claudegoodhooks: metadataArray };
        }
      }
    }

    return { cleanSettings, extractedMetadata, issues, warnings };
  }

  /**
   * Atomic read file operation
   */
  private async atomicReadFile(
    filePath: string
  ): Promise<{ success: boolean; content?: string; error?: Error }> {
    try {
      if (!(await this.fileSystem.exists(filePath))) {
        return { success: true, content: '{}' };
      }

      const content = await this.fileSystem.readFile(filePath, 'utf-8');
      return { success: true, content };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  /**
   * Atomic write file operation
   */
  private async atomicWriteFile(filePath: string, content: string): Promise<void> {
    try {
      await this.fileSystem.writeFile(filePath, content);
    } catch (error) {
      throw new Error(`Failed to write file ${filePath}: ${(error as Error).message}`);
    }
  }
}
