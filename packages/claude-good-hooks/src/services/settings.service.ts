/**
 * Refactored SettingsService using single-function files
 */

import type { ClaudeSettings, HookConfiguration } from '../types';
import { SettingsHelper as CoreSettingsHelper } from '../settings/index.js';
import type { SettingsScope } from '../settings/index.js';

// Import single-function modules
import { createFileSystemProvider } from './settings/create-file-system-provider.js';
import { readSettings } from './settings/read-settings.js';
import { writeSettings } from './settings/write-settings.js';
import { updateSettings } from './settings/update-settings.js';
import { deleteSettings } from './settings/delete-settings.js';
import { getSettingsPath } from './settings/get-settings-path.js';

// Re-export the SettingsScope type for backwards compatibility
export type { SettingsScope };

/**
 * Thin wrapper around the core SettingsHelper that provides backwards compatibility
 * for existing CLI code while delegating all operations to single-function modules.
 */
export class SettingsService {
  private coreSettingsHelper: CoreSettingsHelper;

  constructor() {
    const fileSystemProvider = createFileSystemProvider();
    this.coreSettingsHelper = new CoreSettingsHelper(fileSystemProvider);
  }

  getSettingsPath(scope: SettingsScope): string {
    return getSettingsPath(scope);
  }

  async readSettings(scope: SettingsScope): Promise<ClaudeSettings> {
    return readSettings(scope);
  }

  async writeSettings(scope: SettingsScope, settings: ClaudeSettings): Promise<void> {
    return writeSettings(scope, settings);
  }

  async updateSettings(
    scope: SettingsScope,
    updateFn: (settings: ClaudeSettings) => ClaudeSettings | Promise<ClaudeSettings>
  ): Promise<void> {
    return updateSettings(scope, updateFn);
  }

  async deleteSettings(scope: SettingsScope): Promise<void> {
    return deleteSettings(scope);
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
