import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { HookPlugin } from '@sammons/claude-good-hooks-types';
import { detectPackageManager } from './detect-package-manager.js';
import { PackageManagerHelper } from './package-manager-helper.js';
import { ProcessService } from '../services/process.service.js';

export async function isModuleInstalled(moduleName: string, global: boolean = false): Promise<boolean> {
  try {
    if (global) {
      const packageManager = detectPackageManager();
      const processService = new ProcessService();
      const helper = new PackageManagerHelper(packageManager, processService);
      const globalPath = await helper.getGlobalRoot();
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
      const packageManager = detectPackageManager();
      const processService = new ProcessService();
      const helper = new PackageManagerHelper(packageManager, processService);
      const globalPath = await helper.getGlobalRoot();
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

export async function getInstalledHookModules(global: boolean = false): Promise<string[]> {
  try {
    const packageManager = detectPackageManager();
    const processService = new ProcessService();
    const helper = new PackageManagerHelper(packageManager, processService);
    const data = await helper.listModules({ depth: 0, global });

    const dependencies = data.dependencies || {};
    return Object.keys(dependencies).filter(
      name => name.includes('claude') && name.includes('hook')
    );
  } catch {
    return [];
  }
}

