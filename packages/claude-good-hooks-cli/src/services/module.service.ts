import type { HookPlugin } from '@sammons/claude-good-hooks-types';
import { FileSystemService } from './file-system.service.js';
import { ProcessService } from './process.service.js';
import { detectPackageManager } from '../utils/detect-package-manager.js';
import { PackageManagerHelper } from '../helpers/package-manager-helper.js';

export class ModuleService {
  private fileSystem = new FileSystemService();
  private process = new ProcessService();
  private packageManagerHelper: PackageManagerHelper;

  constructor() {
    const packageManager = detectPackageManager();
    this.packageManagerHelper = new PackageManagerHelper(packageManager, this.process);
  }


  async isModuleInstalled(moduleName: string, global: boolean = false): Promise<boolean> {
    try {
      if (global) {
        const globalPath = await this.packageManagerHelper.getGlobalRoot();
        return this.fileSystem.exists(this.fileSystem.join(globalPath, moduleName));
      } else {
        const localPath = this.fileSystem.join(this.fileSystem.cwd(), 'node_modules', moduleName);
        return this.fileSystem.exists(localPath);
      }
    } catch {
      return false;
    }
  }

  async loadHookPlugin(moduleName: string, global: boolean = false): Promise<HookPlugin | null> {
    try {
      let modulePath: string;

      if (global) {
        const globalPath = await this.packageManagerHelper.getGlobalRoot();
        modulePath = this.fileSystem.join(globalPath, moduleName);
      } else {
        modulePath = moduleName;
      }

      const module = await import(modulePath);
      return module.HookPlugin || module.default || null;
    } catch (error: unknown) {
      console.error(`Failed to load hook plugin from ${moduleName}:`, String(error));
      return null;
    }
  }

  async getInstalledHookModules(global: boolean = false): Promise<string[]> {
    try {
      const data = await this.packageManagerHelper.listModules({ 
        depth: 0, 
        global 
      });

      const dependencies = data.dependencies || {};
      return Object.keys(dependencies).filter(
        name => name.includes('claude') && name.includes('hook')
      );
    } catch (error: unknown) {
      throw new Error(`Failed to get installed hook modules (global: ${global}): ${String(error)}`);
    }
  }



  /**
   * Get the installed version of a module
   */
  async getModuleVersion(moduleName: string, global: boolean = false): Promise<string | null> {
    try {
      let packageJsonPath: string;

      if (global) {
        const globalPath = await this.packageManagerHelper.getGlobalRoot();
        packageJsonPath = this.fileSystem.join(globalPath, moduleName, 'package.json');
      } else {
        packageJsonPath = this.fileSystem.join(this.fileSystem.cwd(), 'node_modules', moduleName, 'package.json');
      }

      if (!this.fileSystem.exists(packageJsonPath)) {
        return null;
      }

      const packageJson = JSON.parse(this.fileSystem.readFile(packageJsonPath, 'utf-8'));
      return packageJson.version || null;
    } catch {
      return null;
    }
  }

  /**
   * Extract module name from claudegoodhooks.name
   * Example: "@sammons/dirty-good-claude-hook/dirty" -> "@sammons/dirty-good-claude-hook"
   */
  extractModuleNameFromHookName(hookName: string): string {
    const lastSlashIndex = hookName.lastIndexOf('/');
    if (lastSlashIndex === -1) {
      // No slash found, return the whole name
      return hookName;
    }
    return hookName.substring(0, lastSlashIndex);
  }

  /**
   * Check if a plugin is exported from a module
   * Returns true if the module has a HookPlugin export, false otherwise
   */
  async isPluginExported(moduleName: string, global: boolean = false): Promise<boolean> {
    try {
      let modulePath: string;

      if (global) {
        const globalPath = await this.packageManagerHelper.getGlobalRoot();
        modulePath = this.fileSystem.join(globalPath, moduleName);
      } else {
        modulePath = moduleName;
      }

      const module = await import(modulePath);
      return !!(module.HookPlugin || module.default);
    } catch {
      return false;
    }
  }
}
