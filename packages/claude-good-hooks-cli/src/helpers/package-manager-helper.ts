import type { PackageManager } from '../utils/detect-package-manager.js';
import { ProcessService } from '../services/process.service.js';

export interface ListModulesOptions {
  depth?: number;
  global?: boolean;
}

export interface InstallOptions {
  global?: boolean;
  saveDev?: boolean;
}

export interface UninstallOptions {
  global?: boolean;
}

export interface ExecOptions {
  args?: string[];
}

export interface ModuleListResult {
  dependencies?: Record<string, { version: string; resolved?: string; }>;
  devDependencies?: Record<string, { version: string; resolved?: string; }>;
}

export interface InstallResult {
  success: boolean;
  output?: string;
  error?: string;
}

/**
 * Helper class to execute package manager commands for different package managers
 * Centralizes both command construction and execution logic
 */
export class PackageManagerHelper {
  constructor(
    private readonly packageManager: PackageManager,
    private readonly processService = new ProcessService()
  ) {}

  /**
   * Get global root directory command
   * @returns Command to get global node_modules path
   */
  globalRootCommand(): string {
    switch (this.packageManager) {
      case 'pnpm':
        return 'pnpm root -g';
      case 'yarn':
        return 'yarn global dir';
      case 'npm':
      default:
        return 'npm root -g';
    }
  }

  /**
   * Get global root directory path
   * @returns Path to global node_modules directory
   */
  async getGlobalRoot(): Promise<string> {
    try {
      const command = this.globalRootCommand();
      const result = await this.processService.exec(command);
      return result.stdout.trim();
    } catch (error) {
      throw new Error(`Failed to get global root directory: ${String(error)}`);
    }
  }

  /**
   * List installed modules command
   * @param options Options for listing modules
   * @returns Command to list modules
   */
  listModulesCommand(options: ListModulesOptions = {}): string {
    const { depth = 0, global = false } = options;
    
    switch (this.packageManager) {
      case 'pnpm':
        if (global) {
          return `pnpm ls -g --json --depth=${depth}`;
        } else {
          return `pnpm ls --json --depth=${depth}`;
        }
      case 'yarn':
        if (global) {
          // Yarn global list doesn't support depth and json the same way
          return 'yarn global list --depth=0';
        } else {
          return `yarn list --json --depth=${depth}`;
        }
      case 'npm':
      default:
        if (global) {
          return `npm ls -g --json --depth=${depth}`;
        } else {
          return `npm ls --json --depth=${depth}`;
        }
    }
  }

  /**
   * List installed modules
   * @param options Options for listing modules
   * @returns Parsed module list
   */
  async listModules(options: ListModulesOptions = {}): Promise<ModuleListResult> {
    try {
      const command = this.listModulesCommand(options);
      const result = await this.processService.exec(command);
      
      // Handle different package manager output formats
      if (this.packageManager === 'yarn' && options.global) {
        // Yarn global list has different format
        return { dependencies: {} };
      }
      
      return JSON.parse(result.stdout);
    } catch (error) {
      throw new Error(`Failed to list modules: ${String(error)}`);
    }
  }

  /**
   * Install package command
   * @param packageName Name of package to install (optional for installing from package.json)
   * @param options Install options
   * @returns Command to install package
   */
  installCommand(packageName?: string, options: InstallOptions = {}): string {
    const { global = false, saveDev = false } = options;
    
    switch (this.packageManager) {
      case 'pnpm':
        if (global) {
          return `pnpm add -g ${packageName || ''}`.trim();
        } else if (saveDev) {
          return `pnpm add -D ${packageName || ''}`.trim();
        } else {
          return `pnpm add ${packageName || ''}`.trim();
        }
      case 'yarn':
        if (global) {
          return `yarn global add ${packageName || ''}`.trim();
        } else if (saveDev) {
          return `yarn add --dev ${packageName || ''}`.trim();
        } else {
          return `yarn add ${packageName || ''}`.trim();
        }
      case 'npm':
      default:
        let command = 'npm install';
        if (global) command += ' -g';
        if (saveDev) command += ' --save-dev';
        if (packageName) command += ` ${packageName}`;
        return command;
    }
  }

  /**
   * Install package
   * @param packageName Name of package to install (optional for installing from package.json)
   * @param options Install options
   * @returns Installation result
   */
  async install(packageName?: string, options: InstallOptions = {}): Promise<InstallResult> {
    try {
      const command = this.installCommand(packageName, options);
      const result = await this.processService.exec(command);
      
      return {
        success: true,
        output: result.stdout + result.stderr
      };
    } catch (error) {
      return {
        success: false,
        error: String(error)
      };
    }
  }

  /**
   * Uninstall package command
   * @param packageName Name of package to uninstall
   * @param options Uninstall options
   * @returns Command to uninstall package
   */
  uninstallCommand(packageName: string, options: UninstallOptions = {}): string {
    const { global = false } = options;
    
    switch (this.packageManager) {
      case 'pnpm':
        return global ? `pnpm remove -g ${packageName}` : `pnpm remove ${packageName}`;
      case 'yarn':
        return global ? `yarn global remove ${packageName}` : `yarn remove ${packageName}`;
      case 'npm':
      default:
        return global ? `npm uninstall -g ${packageName}` : `npm uninstall ${packageName}`;
    }
  }

  /**
   * Uninstall package
   * @param packageName Name of package to uninstall
   * @param options Uninstall options
   * @returns Uninstall result
   */
  async uninstall(packageName: string, options: UninstallOptions = {}): Promise<InstallResult> {
    try {
      const command = this.uninstallCommand(packageName, options);
      const result = await this.processService.exec(command);
      
      return {
        success: true,
        output: result.stdout + result.stderr
      };
    } catch (error) {
      return {
        success: false,
        error: String(error)
      };
    }
  }

  /**
   * Run script command
   * @param scriptName Name of script to run
   * @returns Command to run script
   */
  runScriptCommand(scriptName: string): string {
    switch (this.packageManager) {
      case 'pnpm':
        return `pnpm run ${scriptName}`;
      case 'yarn':
        return `yarn run ${scriptName}`;
      case 'npm':
      default:
        return `npm run ${scriptName}`;
    }
  }

  /**
   * Run script
   * @param scriptName Name of script to run
   * @returns Script execution result
   */
  async runScript(scriptName: string): Promise<InstallResult> {
    try {
      const command = this.runScriptCommand(scriptName);
      const result = await this.processService.exec(command);
      
      return {
        success: true,
        output: result.stdout + result.stderr
      };
    } catch (error) {
      return {
        success: false,
        error: String(error)
      };
    }
  }

  /**
   * Execute package command (npx equivalent)
   * @param packageName Name of package to execute
   * @param options Exec options
   * @returns Command to execute package
   */
  execCommand(packageName: string, options: ExecOptions = {}): string {
    const { args = [] } = options;
    const argsStr = args.length > 0 ? ` ${args.join(' ')}` : '';
    
    switch (this.packageManager) {
      case 'pnpm':
        return `pnpm exec ${packageName}${argsStr}`;
      case 'yarn':
        return `yarn exec ${packageName}${argsStr}`;
      case 'npm':
      default:
        return `npx ${packageName}${argsStr}`;
    }
  }

  /**
   * Execute package
   * @param packageName Name of package to execute
   * @param options Exec options
   * @returns Execution result
   */
  async exec(packageName: string, options: ExecOptions = {}): Promise<InstallResult> {
    try {
      const command = this.execCommand(packageName, options);
      const result = await this.processService.exec(command);
      
      return {
        success: true,
        output: result.stdout + result.stderr
      };
    } catch (error) {
      return {
        success: false,
        error: String(error)
      };
    }
  }

  /**
   * Check version command
   * @returns Command to check package manager version
   */
  versionCommand(): string {
    return `${this.packageManager} --version`;
  }

  /**
   * Get package manager version
   * @returns Package manager version
   */
  async getVersion(): Promise<string> {
    try {
      const command = this.versionCommand();
      const result = await this.processService.exec(command);
      return result.stdout.trim();
    } catch (error) {
      throw new Error(`Failed to get package manager version: ${String(error)}`);
    }
  }

  /**
   * Update package command
   * @param packageName Name of package to update
   * @param options Update options (same as install for most package managers)
   * @returns Command to update package
   */
  updateCommand(packageName: string, options: InstallOptions = {}): string {
    const { global = false } = options;
    
    switch (this.packageManager) {
      case 'pnpm':
        return global ? `pnpm update -g ${packageName}` : `pnpm update ${packageName}`;
      case 'yarn':
        return global ? `yarn global upgrade ${packageName}` : `yarn upgrade ${packageName}`;
      case 'npm':
      default:
        return global ? `npm update -g ${packageName}` : `npm update ${packageName}`;
    }
  }

  /**
   * Update package
   * @param packageName Name of package to update
   * @param options Update options
   * @returns Update result
   */
  async update(packageName: string, options: InstallOptions = {}): Promise<InstallResult> {
    try {
      const command = this.updateCommand(packageName, options);
      const result = await this.processService.exec(command);
      
      return {
        success: true,
        output: result.stdout + result.stderr
      };
    } catch (error) {
      return {
        success: false,
        error: String(error)
      };
    }
  }

  /**
   * Get package manager specific install instructions for documentation
   * @param packageName Name of package
   * @param global Whether to install globally
   * @returns Human-readable install instruction
   */
  getInstallInstructions(packageName: string, global: boolean = false): string {
    return this.installCommand(packageName, { global });
  }
}