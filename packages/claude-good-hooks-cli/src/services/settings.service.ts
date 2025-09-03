import type { ClaudeSettings, HookConfiguration } from '@sammons/claude-good-hooks-types';
import { FileSystemService } from './file-system.service.js';

export type SettingsScope = 'global' | 'project' | 'local';

export class SettingsService {
  private fileSystem = new FileSystemService();

  constructor() {}

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

  readSettings(scope: SettingsScope): ClaudeSettings {
    const path = this.getSettingsPath(scope);
    
    if (!this.fileSystem.exists(path)) {
      return {};
    }
    
    try {
      const content = this.fileSystem.readFile(path, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error(`Error reading ${scope} settings:`, error);
      return {};
    }
  }

  writeSettings(scope: SettingsScope, settings: ClaudeSettings): void {
    const path = this.getSettingsPath(scope);
    const dir = this.fileSystem.dirname(path);

    if (!this.fileSystem.exists(dir)) {
      this.fileSystem.mkdir(dir, { recursive: true });
    }

    this.fileSystem.writeFile(path, JSON.stringify(settings, null, 2));
  }

  addHookToSettings(
    scope: SettingsScope,
    eventName: keyof ClaudeSettings['hooks'],
    hookConfig: HookConfiguration
  ): void {
    const settings = this.readSettings(scope);

    if (!settings.hooks) {
      settings.hooks = {};
    }

    if (!settings.hooks[eventName]) {
      settings.hooks[eventName] = [];
    }

    settings.hooks[eventName].push(hookConfig);
    this.writeSettings(scope, settings);
  }

  removeHookFromSettings(
    scope: SettingsScope,
    eventName: keyof ClaudeSettings['hooks'],
    matcher?: string
  ): void {
    const settings = this.readSettings(scope);

    if (!settings.hooks || !settings.hooks[eventName]) {
      return;
    }

    if (matcher) {
      settings.hooks[eventName] = settings.hooks[eventName].filter(
        config => config.matcher !== matcher
      );
    } else {
      settings.hooks[eventName] = settings.hooks[eventName].filter(
        config => config.matcher !== undefined
      );
    }

    this.writeSettings(scope, settings);
  }
}