import type { HookPlugin } from '@sammons/claude-good-hooks-types';
import { FileSystemService } from './file-system.service.js';
import { ProcessService } from './process.service.js';

export class ModuleService {
  private fileSystem = new FileSystemService();
  private process = new ProcessService();

  constructor() {}

  isModuleInstalled(moduleName: string, global: boolean = false): boolean {
    try {
      if (global) {
        const globalPath = this.process.execSync('npm root -g').trim();
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
        const globalPath = this.process.execSync('npm root -g').trim();
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
      const command = global ? 'npm ls -g --json --depth=0' : 'npm ls --json --depth=0';
      const output = this.process.execSync(command);
      const data = JSON.parse(output);

      const dependencies = data.dependencies || {};
      return Object.keys(dependencies).filter(
        name => name.includes('claude') && name.includes('hook')
      );
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
