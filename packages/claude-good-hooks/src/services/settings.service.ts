import type { ClaudeSettings, HookConfiguration } from '../types';
import { SettingsHelper as CoreSettingsHelper } from '../settings/index.js';
import type { SettingsScope } from '../settings/index.js';
import { FileSystemService } from './file-system.service.js';

// Re-export the SettingsScope type for backwards compatibility
export type { SettingsScope };

/**
 * Adapter that wraps the FileSystemService to match the duck-typed interface
 * expected by the core SettingsService from the settings package.
 */
class FileSystemAdapter {
  constructor(private fs: FileSystemService) {}

  async readFile(path: string, encoding?: string): Promise<string> {
    return await this.fs.readFileAsync(path, (encoding as any) || 'utf-8');
  }

  async writeFile(path: string, content: string, encoding?: string): Promise<void> {
    await this.fs.writeFileAsync(path, content, encoding as any);
  }

  async exists(path: string): Promise<boolean> {
    return await this.fs.existsAsync(path);
  }

  async mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
    await this.fs.mkdirAsync(path, options);
  }

  dirname(path: string): string {
    return this.fs.dirname(path);
  }

  join(...paths: string[]): string {
    return this.fs.join(...paths);
  }

  homedir(): string {
    return this.fs.homedir();
  }

  cwd(): string {
    return this.fs.cwd();
  }
}

/**
 * Thin wrapper around the core SettingsHelper that provides backwards compatibility
 * for existing CLI code while delegating all operations to the settings package.
 */
export class SettingsService {
  private coreSettingsHelper: CoreSettingsHelper;

  constructor() {
    const fileSystem = new FileSystemService();
    const adapter = new FileSystemAdapter(fileSystem);
    this.coreSettingsHelper = new CoreSettingsHelper(adapter);
  }

  getSettingsPath(scope: SettingsScope): string {
    return this.coreSettingsHelper.getSettingsPath(scope);
  }

  async readSettings(scope: SettingsScope): Promise<ClaudeSettings> {
    return await this.coreSettingsHelper.readSettings(scope);
  }

  async writeSettings(scope: SettingsScope, settings: ClaudeSettings): Promise<void> {
    return await this.coreSettingsHelper.writeSettings(scope, settings);
  }

  async addHookToSettings(
    scope: SettingsScope,
    eventName: keyof Required<ClaudeSettings>['hooks'],
    hookConfig: HookConfiguration
  ): Promise<void> {
    return await this.coreSettingsHelper.addHookToSettings(scope, eventName, hookConfig);
  }

  async removeHookFromSettings(
    scope: SettingsScope,
    eventName: keyof Required<ClaudeSettings>['hooks'],
    matcher?: string
  ): Promise<void> {
    return await this.coreSettingsHelper.removeHookFromSettings(scope, eventName, matcher);
  }

  async importSettings(scope: SettingsScope, externalSettings: ClaudeSettings): Promise<void> {
    return await this.coreSettingsHelper.importSettings(scope, externalSettings);
  }

  async exportSettings(scope: SettingsScope): Promise<ClaudeSettings> {
    return await this.coreSettingsHelper.exportSettings(scope);
  }
}
