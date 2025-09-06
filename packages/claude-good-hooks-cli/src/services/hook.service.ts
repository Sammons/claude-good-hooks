import type { HookPlugin, HookMetadata, ClaudeSettings } from '@sammons/claude-good-hooks-types';
import { ModuleService } from './module.service.js';
import { SettingsService, type SettingsScope } from './settings.service.js';
import { typedEntries } from '../utils/keys.js';

// Type for parsed hook arguments based on plugin customArgs definition
type HookArgValue = string | number | boolean;
type ParsedHookArgs = Record<string, HookArgValue>;

export interface ApplyHookResult {
  success: boolean;
  hook?: string;
  scope?: SettingsScope;
  args?: ParsedHookArgs;
  error?: string;
}

export interface HookHelpInfo {
  name: string;
  description: string;
  version: string;
  customArgs?: Record<string, unknown>;
  usage: string;
}

export interface RegenerateHookResult {
  success: boolean;
  hookName: string;
  scope: SettingsScope;
  eventName: string;
  error?: string;
  updated?: boolean;
}

export interface RegenerateAllHooksResult {
  results: RegenerateHookResult[];
  totalProcessed: number;
  successCount: number;
  skippedCount: number;
  errorCount: number;
}

export class HookService {
  private moduleService = new ModuleService();
  private settingsService = new SettingsService();

  constructor() {}

  async applyHook(
    hookName: string,
    args: string[],
    scope: SettingsScope
  ): Promise<ApplyHookResult> {
    const plugin = await this.moduleService.loadHookPlugin(hookName, scope === 'global');

    if (!plugin) {
      return {
        success: false,
        error: `Hook '${hookName}' not found. Make sure it's installed.`,
      };
    }

    const parsedArgs = this.parseHookArgs(args, plugin);
    const settingsDirectoryPath = this.getSettingsDirectoryPath(scope);
    const hookConfiguration = plugin.makeHook(parsedArgs, { settingsDirectoryPath });

    for (const [eventName, configs] of typedEntries(hookConfiguration)) {
      if (configs && Array.isArray(configs) && configs.length > 0) {
        for (const config of configs) {
          // Add metadata to the claudegoodhooks property
          const enhancedConfig = {
            ...config,
            claudegoodhooks: {
              name: `${hookName}/${plugin.name}`,
              description: plugin.description,
              version: plugin.version,
              hookFactoryArguments: parsedArgs
            }
          };
          
          // eventName is guaranteed to be a key of the hook configuration object
          // which matches the structure of ClaudeSettings['hooks']
          this.settingsService.addHookToSettings(
            scope,
            eventName as keyof ClaudeSettings['hooks'],
            enhancedConfig
          );
        }
      }
    }

    return {
      success: true,
      hook: hookName,
      scope,
      args: parsedArgs,
    };
  }

  async getHookHelp(hookName: string, global: boolean): Promise<HookHelpInfo | null> {
    const plugin = await this.moduleService.loadHookPlugin(hookName, global);

    if (!plugin) {
      return null;
    }

    return {
      name: plugin.name,
      description: plugin.description,
      version: plugin.version,
      customArgs: plugin.customArgs || {},
      usage: `claude-good-hooks apply ${hookName} [options]`,
    };
  }

  parseHookArgs(args: string[], plugin: HookPlugin): ParsedHookArgs {
    const parsed: ParsedHookArgs = {};

    if (!plugin || !plugin.customArgs) {
      return parsed;
    }

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg == null) {
        throw new Error("Unexpectedly nullish arg, this is a bug")
      }
      if (arg.startsWith('--')) {
        const argName = arg.slice(2);
        const argDef = plugin.customArgs[argName];

        if (argDef) {
          if (argDef.type === 'boolean') {
            parsed[argName] = true;
          } else {
            const nextArg = args[i + 1];
            if (nextArg && !nextArg.startsWith('--')) {
              if (argDef.type === 'number') {
                const numValue = parseFloat(nextArg);
                if (!isNaN(numValue)) {
                  parsed[argName] = numValue;
                }
              } else {
                parsed[argName] = nextArg;
              }
              i++;
            }
          }
        }
      }
    }

    for (const [argName, argDef] of Object.entries(plugin.customArgs)) {
      if (!(argName in parsed) && argDef.default !== undefined) {
        // The default value from the plugin definition should match our expected types
        const defaultValue = argDef.default as HookArgValue;
        parsed[argName] = defaultValue;
      }
    }

    return parsed;
  }

  async listInstalledHooks(scope: SettingsScope): Promise<HookMetadata[]> {
    const hooks: HookMetadata[] = [];
    const isGlobal = scope === 'global';

    const installedModules = this.moduleService.getInstalledHookModules(isGlobal);

    for (const moduleName of installedModules) {
      const plugin = await this.moduleService.loadHookPlugin(moduleName, isGlobal);
      if (plugin) {
        hooks.push({
          name: plugin.name,
          description: plugin.description,
          version: plugin.version,
          source: isGlobal ? 'global' : 'local',
          packageName: moduleName,
          installed: true,
        });
      }
    }

    const settings = this.settingsService.readSettings(scope);
    if (settings.hooks) {
      for (const [eventName, configs] of typedEntries(settings.hooks)) {
        if (configs && Array.isArray(configs)) {
          for (const config of configs) {
            // Handle both new (claudegoodhooks) and old (top-level) formats for backwards compatibility
            const name = config.claudegoodhooks?.name || 
                        (config as any).name || 
                        `${eventName}${config.matcher ? `:${config.matcher}` : ''}`;
            const description = config.claudegoodhooks?.description || 
                               (config as any).description || 
                               `Configured ${eventName} hook`;
            const version = config.claudegoodhooks?.version || 'n/a';
            
            hooks.push({
              name,
              description,
              version,
              source: isGlobal ? 'global' : 'local',
              installed: true,
              hookConfiguration: config,
            });
          }
        }
      }
    }

    return hooks;
  }

  async listAvailableHooks(global: boolean): Promise<HookMetadata[]> {
    const hooks: HookMetadata[] = [];

    const remoteHooks = this.moduleService.getRemoteHooks();
    for (const moduleName of remoteHooks) {
      const plugin = await this.moduleService.loadHookPlugin(moduleName, false);
      if (plugin) {
        hooks.push({
          name: plugin.name,
          description: plugin.description,
          version: plugin.version,
          source: 'remote',
          packageName: moduleName,
          installed: this.moduleService.getInstalledHookModules(false).includes(moduleName),
        });
      }
    }

    const installedModules = this.moduleService.getInstalledHookModules(global);
    for (const moduleName of installedModules) {
      const plugin = await this.moduleService.loadHookPlugin(moduleName, global);
      if (plugin) {
        hooks.push({
          name: plugin.name,
          description: plugin.description,
          version: plugin.version,
          source: global ? 'global' : 'local',
          packageName: moduleName,
          installed: true,
        });
      }
    }

    return hooks;
  }

  async regenerateHooks(
    hookName?: string,
    scope?: SettingsScope
  ): Promise<RegenerateAllHooksResult> {
    const results: RegenerateHookResult[] = [];
    const scopesToProcess: SettingsScope[] = scope ? [scope] : ['global', 'project', 'local'];

    for (const currentScope of scopesToProcess) {
      const settings = this.settingsService.readSettings(currentScope);
      if (!settings.hooks) continue;

      for (const [eventName, configs] of typedEntries(settings.hooks)) {
        if (!configs || !Array.isArray(configs)) continue;

        for (const config of configs) {
          const claudeGoodHooks = config.claudegoodhooks;
          
          // Skip if no claudegoodhooks metadata or missing required fields
          if (!claudeGoodHooks || !claudeGoodHooks.name || !claudeGoodHooks.hookFactoryArguments) {
            continue;
          }

          // If specific hook requested, check if this matches
          if (hookName && claudeGoodHooks.name !== hookName) {
            continue;
          }

          const result = await this.regenerateSingleHook(
            claudeGoodHooks.name,
            claudeGoodHooks.hookFactoryArguments,
            currentScope,
            eventName as keyof ClaudeSettings['hooks']
          );

          results.push(result);
        }
      }
    }

    const successCount = results.filter(r => r.success).length;
    const skippedCount = results.filter(r => r.success && !r.updated).length;
    const errorCount = results.filter(r => !r.success).length;

    return {
      results,
      totalProcessed: results.length,
      successCount,
      skippedCount,
      errorCount
    };
  }

  private async regenerateSingleHook(
    hookName: string,
    savedArgs: Record<string, unknown>,
    scope: SettingsScope,
    eventName: keyof Required<ClaudeSettings>['hooks']
  ): Promise<RegenerateHookResult> {
    try {
      // Extract module name from the hook name
      const moduleName = this.moduleService.extractModuleNameFromHookName(hookName);
      const isGlobal = scope === 'global';

      // Check if the module is still installed
      if (!this.moduleService.isModuleInstalled(moduleName, isGlobal)) {
        return {
          success: false,
          hookName,
          scope,
          eventName,
          error: `Module ${moduleName} is not installed ${isGlobal ? 'globally' : 'locally'}`
        };
      }

      // Load the plugin
      const plugin = await this.moduleService.loadHookPlugin(moduleName, isGlobal);
      if (!plugin) {
        return {
          success: false,
          hookName,
          scope,
          eventName,
          error: `Failed to load plugin from module ${moduleName}`
        };
      }

      // Parse the saved arguments using the current plugin definition
      const parsedArgs = this.parseHookArgsFromSaved(savedArgs, plugin);
      const settingsDirectoryPath = this.getSettingsDirectoryPath(scope);
      
      // Generate the new hook configuration
      const hookConfiguration = plugin.makeHook(parsedArgs, { settingsDirectoryPath });

      // Check if this event type exists in the new configuration
      const newConfigs = hookConfiguration[eventName];
      if (!newConfigs || !Array.isArray(newConfigs) || newConfigs.length === 0) {
        return {
          success: false,
          hookName,
          scope,
          eventName,
          error: `Hook ${hookName} no longer provides configuration for event ${eventName}`
        };
      }

      // Add the updated hook configurations
      for (const newConfig of newConfigs) {
        const enhancedConfig = {
          ...newConfig,
          claudegoodhooks: {
            name: hookName,
            description: plugin.description,
            version: plugin.version,
            hookFactoryArguments: parsedArgs
          }
        };

        this.settingsService.addHookToSettings(scope, eventName, enhancedConfig);
      }

      return {
        success: true,
        hookName,
        scope,
        eventName,
        updated: true
      };
    } catch (error: unknown) {
      return {
        success: false,
        hookName,
        scope,
        eventName,
        error: `Unexpected error: ${String(error)}`
      };
    }
  }

  private parseHookArgsFromSaved(
    savedArgs: Record<string, unknown>,
    plugin: HookPlugin
  ): ParsedHookArgs {
    const parsed: ParsedHookArgs = {};

    // the plugin doesn't require any args
    if (!plugin.customArgs) {
      return parsed;
    }

    // Start with saved arguments
    for (const [argName, value] of Object.entries(savedArgs)) {
      if (argName in plugin.customArgs) {
        const argDef = plugin.customArgs[argName];
        if (!argDef) {
          throw new Error(`Unexpectedly missing argDef for ${argName} for plugin ${plugin.name}. This is a bug.`)
        }
        
        // Validate and convert the saved value based on current plugin definition
        if (argDef.type === 'boolean' && typeof value === 'boolean') {
          parsed[argName] = value;
        } else if (argDef.type === 'number' && typeof value === 'number') {
          parsed[argName] = value;
        } else if (argDef.type === 'string' && typeof value === 'string') {
          parsed[argName] = value;
        } else if (value !== null && value !== undefined) {
          // Try to convert the value to the expected type
          if (argDef.type === 'number') {
            const numValue = Number(value);
            if (!isNaN(numValue)) {
              parsed[argName] = numValue;
            }
          } else if (argDef.type === 'boolean') {
            parsed[argName] = Boolean(value);
          } else {
            parsed[argName] = String(value);
          }
        }
      }
    }

    // Add default values for any missing arguments
    for (const [argName, argDef] of Object.entries(plugin.customArgs)) {
      if (!(argName in parsed) && argDef.default !== undefined) {
        const defaultValue = argDef.default as HookArgValue;
        parsed[argName] = defaultValue;
      }
    }

    return parsed;
  }

  private getSettingsDirectoryPath(scope: SettingsScope): string {
    const settingsPath = this.settingsService.getSettingsPath(scope);
    // Get the directory containing the settings file (e.g., '/path/to/.claude')
    const settingsDir = settingsPath.substring(0, settingsPath.lastIndexOf('/'));
    return settingsDir;
  }
}
