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

  /**
   * Check if the identifier is a file path
   * Supports: .js, .mjs, .cjs, absolute paths (/), relative paths (./ or ../)
   */
  private isFilePath(identifier: string): boolean {
    // Check for file extensions
    if (identifier.endsWith('.js') || identifier.endsWith('.mjs') || identifier.endsWith('.cjs')) {
      return true;
    }
    // Check for absolute paths
    if (identifier.startsWith('/')) {
      return true;
    }
    // Check for relative paths
    if (identifier.startsWith('./') || identifier.startsWith('../')) {
      return true;
    }
    return false;
  }

  /**
   * Parse module name and export path from a hook identifier
   * Examples:
   * - "@sammons/dirty-good-claude-hook" -> { moduleName: "@sammons/dirty-good-claude-hook", exportPath: undefined, isFile: false }
   * - "@sammons/code-outline/code-outline" -> { moduleName: "@sammons/code-outline", exportPath: "code-outline", isFile: false }
   * - "./my-hook.js" -> { moduleName: "./my-hook.js", exportPath: undefined, isFile: true }
   * - "/absolute/path/hook.mjs" -> { moduleName: "/absolute/path/hook.mjs", exportPath: undefined, isFile: true }
   */
  private parseHookIdentifier(hookIdentifier: string): {
    moduleName: string;
    exportPath?: string;
    isFile?: boolean;
  } {
    // Check if it's a file path first - but we need to handle suffixes too
    // For file paths like ./test-hook.js/plugin-name, we need to extract the file and the plugin name
    if (this.isFilePath(hookIdentifier)) {
      // Look for a file extension followed by a slash to detect a suffix
      const fileExtensions = ['.js', '.mjs', '.cjs'];
      for (const ext of fileExtensions) {
        const extIndex = hookIdentifier.indexOf(ext + '/');
        if (extIndex !== -1) {
          const endOfExt = extIndex + ext.length;
          return {
            moduleName: hookIdentifier.substring(0, endOfExt),
            exportPath: hookIdentifier.substring(endOfExt + 1), // Skip the slash
            isFile: true,
          };
        }
      }

      // No suffix found, just a file path
      return {
        moduleName: hookIdentifier,
        isFile: true,
      };
    }

    // For scoped packages like @sammons/package-name/export-path
    const scopedMatch = hookIdentifier.match(/^(@[^/]+\/[^/]+)\/(.+)$/);
    if (scopedMatch) {
      return {
        moduleName: scopedMatch[1],
        exportPath: scopedMatch[2],
        isFile: false,
      };
    }

    // For non-scoped packages like package-name/export-path
    const nonScopedMatch = hookIdentifier.match(/^([^@][^/]+)\/(.+)$/);
    if (nonScopedMatch) {
      return {
        moduleName: nonScopedMatch[1],
        exportPath: nonScopedMatch[2],
        isFile: false,
      };
    }

    // No suffix, use default export
    return { moduleName: hookIdentifier, isFile: false };
  }

  async isModuleInstalled(hookIdentifier: string, global: boolean = false): Promise<boolean> {
    try {
      const { moduleName, isFile } = this.parseHookIdentifier(hookIdentifier);

      // If it's a file path, check if the file exists
      if (isFile) {
        // Resolve relative paths from current working directory
        const resolvedPath = this.fileSystem.resolveFromCwd(moduleName);
        return this.fileSystem.exists(resolvedPath);
      }

      // For npm packages, check in node_modules
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

  async loadHookPlugin(
    hookIdentifier: string,
    global: boolean = false
  ): Promise<HookPlugin | null> {
    try {
      const { moduleName, exportPath, isFile } = this.parseHookIdentifier(hookIdentifier);
      let modulePath: string;

      if (isFile) {
        // For file paths, resolve relative paths from current working directory
        modulePath = this.fileSystem.resolveFromCwd(moduleName);

        // Convert to file:// URL for proper ESM import
        modulePath = `file://${modulePath}`;
      } else {
        // For npm packages
        if (global) {
          const globalPath = await this.packageManagerHelper.getGlobalRoot();
          modulePath = this.fileSystem.join(globalPath, moduleName);
        } else {
          modulePath = moduleName;
        }
      }

      const module = await import(modulePath);

      // If an export path is specified, try to access that specific export
      if (exportPath) {
        // Check for named export matching the export path
        if (module[exportPath]) {
          return module[exportPath];
        }
        // Also check if there's a HookPlugin property within the specified export
        if (module[exportPath + 'HookPlugin']) {
          return module[exportPath + 'HookPlugin'];
        }
        console.error(`Export '${exportPath}' not found in module ${moduleName}`);
        return null;
      }

      // Default behavior: look for HookPlugin or default export
      // Handle CommonJS double-default issue when dynamically importing
      let plugin = module.HookPlugin || module.default || null;

      // If we got a default that itself has a default (CommonJS interop issue), unwrap it
      if (plugin && typeof plugin === 'object' && 'default' in plugin && !plugin.makeHook) {
        plugin = plugin.default;
      }

      return plugin;
    } catch (error: unknown) {
      console.error(`Failed to load hook plugin from ${hookIdentifier}:`, String(error));
      return null;
    }
  }

  async getInstalledHookModules(global: boolean = false): Promise<string[]> {
    try {
      const data = await this.packageManagerHelper.listModules({
        depth: 0,
        global,
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
        packageJsonPath = this.fileSystem.join(
          this.fileSystem.cwd(),
          'node_modules',
          moduleName,
          'package.json'
        );
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
   * Example: "./my-hook.js/my-hook" -> "./my-hook.js"
   * Example: "./packages/code-outline/dist/index.mjs/code-outline" -> "./packages/code-outline/dist/index.mjs"
   */
  extractModuleNameFromHookName(hookName: string): string {
    // Special handling for file paths with hook name suffix
    // We need to find the last slash and check if what comes before it is a file path

    // Check each possible split point from the end
    let lastIndex = hookName.lastIndexOf('/');
    while (lastIndex !== -1) {
      const possiblePath = hookName.substring(0, lastIndex);
      const _remainder = hookName.substring(lastIndex + 1);

      // Check if this looks like a file path (has extension or starts with ./ or ../ or /)
      if (
        possiblePath.endsWith('.js') ||
        possiblePath.endsWith('.mjs') ||
        possiblePath.endsWith('.cjs')
      ) {
        return possiblePath;
      }

      // Try the next split point
      lastIndex = possiblePath.lastIndexOf('/');
    }

    // If no file extension found in any split, use the standard parsing logic
    const { moduleName } = this.parseHookIdentifier(hookName);
    return moduleName;
  }

  /**
   * Check if a plugin is exported from a module
   * Returns true if the module has a HookPlugin export, false otherwise
   */
  async isPluginExported(hookName: string, global: boolean = false): Promise<boolean> {
    try {
      // Parse the hook name to get module and exportPath
      const { moduleName, exportPath, isFile } = this.parseHookIdentifier(hookName);

      let modulePath: string;
      if (isFile) {
        // For file paths, resolve from current working directory
        modulePath = this.fileSystem.resolveFromCwd(moduleName);

        // Convert to file:// URL for ESM imports
        if (modulePath.endsWith('.mjs')) {
          modulePath = `file://${modulePath}`;
        }
      } else if (global) {
        const globalPath = await this.packageManagerHelper.getGlobalRoot();
        modulePath = this.fileSystem.join(globalPath, moduleName);
      } else {
        modulePath = moduleName;
      }

      const module = await import(modulePath);

      // Handle CommonJS interop - the actual plugin might be at module.default.default
      const getPlugin = (mod: any) => {
        if (mod.HookPlugin) return mod.HookPlugin;
        if (mod.default) {
          // Check if it's a CommonJS module with nested default
          if (
            mod.default.default &&
            typeof mod.default.default === 'object' &&
            'name' in mod.default.default
          ) {
            return mod.default.default;
          }
          return mod.default;
        }
        return null;
      };

      // For file paths with an exportPath, the exportPath is the plugin name, not an export name
      // The file should have a default export with that plugin name
      if (exportPath && isFile) {
        const plugin = getPlugin(module);
        return !!(plugin && plugin.name === exportPath);
      }

      // For npm packages with exportPath, check for that specific export
      if (exportPath) {
        // Check both direct export and nested default
        if (module[exportPath]) return true;
        if (module.default && module.default[exportPath]) return true;
        return false;
      }

      // Otherwise check for default exports
      return !!getPlugin(module);
    } catch {
      return false;
    }
  }
}
