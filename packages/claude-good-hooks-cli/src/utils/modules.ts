import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import type { HookPlugin } from '@sammons/claude-good-hooks-types';

export function isModuleInstalled(moduleName: string, global: boolean = false): boolean {
  try {
    if (global) {
      const globalPath = execSync('npm root -g', { encoding: 'utf-8' }).trim();
      return existsSync(join(globalPath, moduleName));
    } else {
      const localPath = join(process.cwd(), 'node_modules', moduleName);
      return existsSync(localPath);
    }
  } catch {
    return false;
  }
}

export async function loadHookPlugin(
  moduleName: string,
  global: boolean = false
): Promise<HookPlugin | null> {
  try {
    let modulePath: string;

    if (global) {
      const globalPath = execSync('npm root -g', { encoding: 'utf-8' }).trim();
      modulePath = join(globalPath, moduleName);
    } else {
      modulePath = moduleName;
    }

    const module = await import(modulePath);
    return module.HookPlugin || module.default || null;
  } catch (error) {
    console.error(`Failed to load hook plugin from ${moduleName}:`, error);
    return null;
  }
}

export function getInstalledHookModules(global: boolean = false): string[] {
  try {
    const command = global ? 'npm ls -g --json --depth=0' : 'npm ls --json --depth=0';
    const output = execSync(command, { encoding: 'utf-8' });
    const data = JSON.parse(output);

    const dependencies = data.dependencies || {};
    return Object.keys(dependencies).filter(
      name => name.includes('claude') && name.includes('hook')
    );
  } catch {
    return [];
  }
}

export function getRemoteHooks(): string[] {
  try {
    const configPath = join(process.cwd(), '.claude-good-hooks.json');
    if (!existsSync(configPath)) {
      return [];
    }
    const config = JSON.parse(readFileSync(configPath, 'utf-8'));
    return config.remotes || [];
  } catch {
    return [];
  }
}

export function addRemoteHook(moduleName: string): void {
  const configPath = join(process.cwd(), '.claude-good-hooks.json');
  let config: Record<string, any> = {};

  if (existsSync(configPath)) {
    config = JSON.parse(readFileSync(configPath, 'utf-8'));
  }

  if (!config.remotes) {
    config.remotes = [];
  }

  if (!config.remotes.includes(moduleName)) {
    config.remotes.push(moduleName);
    writeFileSync(configPath, JSON.stringify(config, null, 2));
  }
}

export function removeRemoteHook(moduleName: string): void {
  const configPath = join(process.cwd(), '.claude-good-hooks.json');

  if (!existsSync(configPath)) {
    return;
  }

  const config = JSON.parse(readFileSync(configPath, 'utf-8'));

  if (config.remotes) {
    config.remotes = config.remotes.filter((name: string) => name !== moduleName);
    writeFileSync(configPath, JSON.stringify(config, null, 2));
  }
}
