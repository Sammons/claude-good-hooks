import type { HookPlugin, HookMetadata, ClaudeSettings } from '@sammons/claude-good-hooks-types';
import { ModuleService } from './module.service.js';
import { SettingsService, SettingsScope } from './settings.service.js';
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
    const hookConfiguration = plugin.makeHook(parsedArgs);

    for (const [eventName, configs] of typedEntries(hookConfiguration)) {
      if (configs && Array.isArray(configs) && configs.length > 0) {
        for (const config of configs) {
          // eventName is guaranteed to be a key of the hook configuration object
          // which matches the structure of ClaudeSettings['hooks']
          this.settingsService.addHookToSettings(
            scope,
            eventName as keyof ClaudeSettings['hooks'],
            config
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
            hooks.push({
              name: `${eventName}${config.matcher ? `:${config.matcher}` : ''}`,
              description: `Configured ${eventName} hook`,
              version: 'n/a',
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
}
