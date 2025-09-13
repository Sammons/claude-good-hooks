import type { ClaudeSettings, HookConfiguration } from '../types';
import { SettingsHelper as CoreSettingsHelper } from '../settings/index.js';
import type { SettingsScope } from '../settings/index.js';
import { readFile, writeFile, access, mkdir, constants } from 'fs/promises';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { cwd } from 'process';

// Re-export the SettingsScope type for backwards compatibility
export type { SettingsScope };

/**
 * File system provider that implements the duck-typed interface
 * expected by the core SettingsService from the settings package.
 */
const fileSystemProvider = {
  async readFile(path: string, encoding?: string): Promise<string> {
    const buffer = await readFile(path, (encoding as BufferEncoding) || 'utf-8');
    return buffer.toString();
  },

  async writeFile(path: string, content: string, encoding?: string): Promise<void> {
    await writeFile(path, content, encoding as any);
  },

  async exists(path: string): Promise<boolean> {
    try {
      await access(path, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  },

  async mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
    await mkdir(path, options);
  },

  dirname(path: string): string {
    return dirname(path);
  },

  join(...paths: string[]): string {
    return join(...paths);
  },

  homedir(): string {
    return homedir();
  },

  cwd(): string {
    return cwd();
  }
};

/**
 * Thin wrapper around the core SettingsHelper that provides backwards compatibility
 * for existing CLI code while delegating all operations to the settings package.
 */
export class SettingsService {
  private coreSettingsHelper: CoreSettingsHelper;

  constructor() {
    this.coreSettingsHelper = new CoreSettingsHelper(fileSystemProvider);
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
