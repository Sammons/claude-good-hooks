import type { HookPlugin } from '@sammons/claude-good-hooks-types';
import { FileSystemService } from './file-system.service.js';
import { ProcessService } from './process.service.js';

export class ModuleService {
  private fileSystem = new FileSystemService();
  private process = new ProcessService();

  constructor() {}

  /**
   * Detect the package manager being used
   */
  private detectPackageManager(): 'pnpm' | 'npm' | 'yarn' {
    let currentDir = this.fileSystem.cwd();
    
    // Check current directory and up to 3 parent directories for package manager files
    for (let i = 0; i < 4; i++) {
      if (this.fileSystem.exists(this.fileSystem.join(currentDir, 'pnpm-lock.yaml')) ||
          this.fileSystem.exists(this.fileSystem.join(currentDir, 'pnpm-workspace.yaml'))) {
        return 'pnpm';
      }
      
      if (this.fileSystem.exists(this.fileSystem.join(currentDir, 'yarn.lock'))) {
        return 'yarn';
      }
      
      const parentDir = this.fileSystem.dirname(currentDir);
      if (parentDir === currentDir) break; // reached root
      currentDir = parentDir;
    }
    
    return 'npm';
  }

  isModuleInstalled(moduleName: string, global: boolean = false): boolean {
    try {
      if (global) {
        const packageManager = this.detectPackageManager();
        const command = packageManager === 'pnpm' ? 'pnpm root -g' : 'npm root -g';
        const globalPath = this.process.execSync(command).trim();
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
        const packageManager = this.detectPackageManager();
        const command = packageManager === 'pnpm' ? 'pnpm root -g' : 'npm root -g';
        const globalPath = this.process.execSync(command).trim();
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

  getInstalledHookModules(global: boolean = false): string[] {
    try {
      const packageManager = this.detectPackageManager();
      let command: string;
      
      if (global) {
        command = packageManager === 'pnpm' ? 'pnpm ls -g --json --depth=0' : 'npm ls -g --json --depth=0';
      } else {
        // For pnpm workspaces, use pnpm ls which handles symlinks better
        if (packageManager === 'pnpm') {
          command = 'pnpm ls --json --depth=0';
        } else {
          command = 'npm ls --json --depth=0';
        }
      }
      
      const output = this.process.execSync(command);
      const data = JSON.parse(output);

      const dependencies = data.dependencies || {};
      return Object.keys(dependencies).filter(
        name => name.includes('claude') && name.includes('hook')
      );
    } catch (error: unknown) {
      // In pnpm workspaces, if listing fails due to validation errors,
      // fall back to checking node_modules directly
      const packageManager = this.detectPackageManager();
      if (!global && packageManager === 'pnpm') {
        return this.getInstalledModulesFromFileSystem();
      }
      return [];
    }
  }

  /**
   * Fallback method to check installed modules by scanning node_modules
   */
  private getInstalledModulesFromFileSystem(): string[] {
    try {
      const nodeModulesPath = this.fileSystem.join(this.fileSystem.cwd(), 'node_modules');
      if (!this.fileSystem.exists(nodeModulesPath)) {
        return [];
      }
      
      const items = this.fileSystem.readdir(nodeModulesPath);
      const hookModules: string[] = [];
      
      for (const item of items) {
        // Handle scoped packages
        if (item.startsWith('@')) {
          const scopePath = this.fileSystem.join(nodeModulesPath, item);
          try {
            const scopedItems = this.fileSystem.readdir(scopePath);
            for (const scopedItem of scopedItems) {
              const fullName = `${item}/${scopedItem}`;
              if (fullName.includes('claude') && fullName.includes('hook')) {
                hookModules.push(fullName);
              }
            }
          } catch {
            // Skip if can't read scoped directory
          }
        } else if (item.includes('claude') && item.includes('hook')) {
          hookModules.push(item);
        }
      }
      
      return hookModules;
    } catch {
      return [];
    }
  }

  getRemoteHooks(): string[] {
    try {
      const configPath = this.fileSystem.join(this.fileSystem.cwd(), '.claude-good-hooks.json');
      if (!this.fileSystem.exists(configPath)) {
        return [];
      }
      const config = JSON.parse(this.fileSystem.readFile(configPath, 'utf-8'));
      return config.remotes || [];
    } catch {
      return [];
    }
  }

  addRemoteHook(moduleName: string): void {
    const configPath = this.fileSystem.join(this.fileSystem.cwd(), '.claude-good-hooks.json');
    let config: { remotes?: string[] } = {};

    if (this.fileSystem.exists(configPath)) {
      config = JSON.parse(this.fileSystem.readFile(configPath, 'utf-8'));
    }

    if (!config.remotes) {
      config.remotes = [];
    }

    if (!config.remotes.includes(moduleName)) {
      config.remotes.push(moduleName);
      this.fileSystem.writeFile(configPath, JSON.stringify(config, null, 2));
    }
  }

  removeRemoteHook(moduleName: string): void {
    const configPath = this.fileSystem.join(this.fileSystem.cwd(), '.claude-good-hooks.json');

    if (!this.fileSystem.exists(configPath)) {
      return;
    }

    const config = JSON.parse(this.fileSystem.readFile(configPath, 'utf-8'));

    if (config.remotes) {
      config.remotes = config.remotes.filter((name: string) => name !== moduleName);
      this.fileSystem.writeFile(configPath, JSON.stringify(config, null, 2));
    }
  }
}
