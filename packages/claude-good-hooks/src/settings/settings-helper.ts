import type {
  ClaudeSettings,
  HookConfiguration,
  VersionedClaudeSettings,
} from '../types/index.js';
import { ensureVersionedSettings } from './settings-utils/migrations.js';

export type SettingsScope = 'global' | 'project' | 'local';

/**
 * Duck-typed interface for file system operations.
 * This allows the settings service to work with any implementation
 * that provides these methods, without coupling to a specific file system service.
 */
interface FileSystemProvider {
  /** Read a file as a string */
  readFile(path: string, encoding?: string): Promise<string>;
  /** Write content to a file */
  writeFile(path: string, content: string, encoding?: string): Promise<void>;
  /** Check if a path exists */
  exists(path: string): Promise<boolean>;
  /** Create directory with optional recursive option */
  mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  /** Get directory name of a path */
  dirname(path: string): string;
  /** Join path segments */
  join(...paths: string[]): string;
  /** Get user home directory */
  homedir(): string;
  /** Get current working directory */
  cwd(): string;
}

/**
 * Settings helper that manages Claude Code settings files across different scopes.
 * Uses duck-typed file system provider to avoid direct dependencies on specific implementations.
 */
export class SettingsHelper {
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
   * Read settings from the specified scope
   * Automatically converts legacy settings to current format
   */
  async readSettings(scope: SettingsScope): Promise<ClaudeSettings> {
    const path = this.getSettingsPath(scope);

    // Use the filesystem provider with atomicReadFile pattern
    const readResult = await this.atomicReadFileWithFileSystem(path);

    if (!readResult.success) {
      console.error(`Error reading ${scope} settings:`, readResult.error?.message);
      return {};
    }

    try {
      const parsed = JSON.parse(readResult.content || '{}');

      // Convert legacy settings if needed
      const versionedSettings = ensureVersionedSettings(parsed, scope);

      // If conversion happened, save the converted settings
      if (parsed !== versionedSettings && Object.keys(parsed).length > 0) {
        await this.writeVersionedSettings(scope, versionedSettings);
      }

      return versionedSettings;
    } catch (error: unknown) {
      console.error(`Error parsing ${scope} settings:`, String(error));
      return {};
    }
  }

  /**
   * Helper method to use atomicReadFile with our FileSystemProvider
   */
  private async atomicReadFileWithFileSystem(
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
   * Write settings to the specified scope
   * Ensures settings are in current versioned format
   */
  async writeSettings(scope: SettingsScope, settings: ClaudeSettings): Promise<void> {
    // Ensure settings are in versioned format before writing
    const versionedSettings = ensureVersionedSettings(settings, scope);
    await this.writeVersionedSettings(scope, versionedSettings);
  }

  /**
   * Write versioned settings to the specified scope
   */
  private async writeVersionedSettings(
    scope: SettingsScope,
    settings: VersionedClaudeSettings
  ): Promise<void> {
    const path = this.getSettingsPath(scope);

    // Ensure directory exists
    const dir = this.fileSystem.dirname(path);
    if (!(await this.fileSystem.exists(dir))) {
      await this.fileSystem.mkdir(dir, { recursive: true });
    }

    // Use atomic write pattern with our file system provider
    const content = JSON.stringify(settings, null, 2);
    await this.atomicWriteFileWithFileSystem(path, content);
  }

  /**
   * Helper method to use atomicWriteFile pattern with our FileSystemProvider
   */
  private async atomicWriteFileWithFileSystem(filePath: string, content: string): Promise<void> {
    try {
      // For backwards compatibility, we'll do basic atomic write
      // without the full validation that requires VersionedClaudeSettings
      await this.fileSystem.writeFile(filePath, content);
    } catch (error) {
      throw new Error(`Failed to write settings: ${(error as Error).message}`);
    }
  }

  /**
   * Add a hook configuration to the settings for a specific event and scope
   */
  async addHookToSettings(
    scope: SettingsScope,
    eventName: keyof Required<ClaudeSettings>['hooks'],
    hookConfig: HookConfiguration
  ): Promise<void> {
    const settings = await this.readSettings(scope);

    if (!settings.hooks) {
      settings.hooks = {};
    }

    if (!settings.hooks[eventName]) {
      settings.hooks[eventName] = [];
    }

    // If hookConfig has claudegoodhooks.name, deduplicate by removing existing hooks with the same name
    // Also check for old format (top-level name) for backwards compatibility
    const hookName = hookConfig.claudegoodhooks?.name || (hookConfig as any).name;
    if (hookName) {
      // For file-based hooks, extract just the plugin name for comparison
      // E.g., "./test-hook.js/my-hook" -> "my-hook"
      // E.g., "@sammons/hook/my-hook" -> "@sammons/hook/my-hook" (unchanged for npm packages)
      const getComparableName = (name: string): string => {
        // Check if this looks like a file path with a plugin name
        const lastSlash = name.lastIndexOf('/');
        if (lastSlash !== -1) {
          const pathPart = name.substring(0, lastSlash);
          const pluginPart = name.substring(lastSlash + 1);

          // If the path part looks like a file (has extension or starts with ./ or ../ or /)
          if (
            pathPart.endsWith('.js') ||
            pathPart.endsWith('.mjs') ||
            pathPart.endsWith('.cjs') ||
            pathPart.startsWith('./') ||
            pathPart.startsWith('../') ||
            pathPart.startsWith('/')
          ) {
            // For file-based hooks, use just the plugin name for deduplication
            return pluginPart;
          }
        }
        // For npm packages, use the full name
        return name;
      };

      const comparableName = getComparableName(hookName);

      settings.hooks[eventName] = settings.hooks[eventName]!.filter(
        (existingConfig: HookConfiguration) => {
          const existingName = existingConfig.claudegoodhooks?.name || (existingConfig as any).name;
          if (!existingName) return true; // Keep configs without names

          const existingComparableName = getComparableName(existingName);
          return existingComparableName !== comparableName;
        }
      );
    }

    settings.hooks[eventName]!.push(hookConfig);
    await this.writeSettings(scope, settings);
  }

  /**
   * Remove a hook configuration from the settings for a specific event and scope
   */
  async removeHookFromSettings(
    scope: SettingsScope,
    eventName: keyof Required<ClaudeSettings>['hooks'],
    matcher?: string
  ): Promise<void> {
    const settings = await this.readSettings(scope);

    if (!settings.hooks || !settings.hooks[eventName]) {
      return;
    }

    if (matcher) {
      settings.hooks[eventName] = settings.hooks[eventName]!.filter(
        (config: HookConfiguration) => config.matcher !== matcher
      );
    } else {
      settings.hooks[eventName] = settings.hooks[eventName]!.filter(
        (config: HookConfiguration) => config.matcher !== undefined
      );
    }

    await this.writeSettings(scope, settings);
  }

  /**
   * Import settings from an external source
   */
  async importSettings(scope: SettingsScope, externalSettings: ClaudeSettings): Promise<void> {
    const currentSettings = await this.readSettings(scope);

    // Merge the external settings with current settings
    const mergedSettings: ClaudeSettings = {
      ...currentSettings,
      hooks: {
        ...currentSettings.hooks,
        ...externalSettings.hooks,
      },
    };

    await this.writeSettings(scope, mergedSettings);
  }

  /**
   * Export settings from a specific scope
   */
  async exportSettings(scope: SettingsScope): Promise<ClaudeSettings> {
    return await this.readSettings(scope);
  }
}
