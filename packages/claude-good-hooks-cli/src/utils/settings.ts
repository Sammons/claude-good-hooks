import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join, dirname } from 'path';
import type { ClaudeSettings, HookConfiguration } from '@sammons/claude-good-hooks-types';

export function getSettingsPath(scope: 'global' | 'project' | 'local'): string {
  switch (scope) {
    case 'global':
      return join(homedir(), '.claude', 'settings.json');
    case 'project':
      return join(process.cwd(), '.claude', 'settings.json');
    case 'local':
      return join(process.cwd(), '.claude', 'settings.local.json');
  }
}

export function readSettings(scope: 'global' | 'project' | 'local'): ClaudeSettings {
  const path = getSettingsPath(scope);
  if (!existsSync(path)) {
    return {};
  }
  try {
    const content = readFileSync(path, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error reading ${scope} settings:`, error);
    return {};
  }
}

export function writeSettings(scope: 'global' | 'project' | 'local', settings: ClaudeSettings): void {
  const path = getSettingsPath(scope);
  const dir = dirname(path);
  
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  
  writeFileSync(path, JSON.stringify(settings, null, 2));
}

export function addHookToSettings(
  scope: 'global' | 'project' | 'local',
  eventName: keyof ClaudeSettings['hooks'],
  hookConfig: HookConfiguration
): void {
  const settings = readSettings(scope);
  
  if (!settings.hooks) {
    settings.hooks = {};
  }
  
  if (!settings.hooks[eventName]) {
    settings.hooks[eventName] = [];
  }
  
  settings.hooks[eventName].push(hookConfig);
  writeSettings(scope, settings);
}

export function removeHookFromSettings(
  scope: 'global' | 'project' | 'local',
  eventName: keyof ClaudeSettings['hooks'],
  matcher?: string
): void {
  const settings = readSettings(scope);
  
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
  
  writeSettings(scope, settings);
}