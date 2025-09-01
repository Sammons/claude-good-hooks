import chalk from 'chalk';
import { readSettings } from '../utils/settings.js';
import { getInstalledHookModules, getRemoteHooks, loadHookPlugin } from '../utils/modules.js';
import type { HookMetadata } from '@sammons/claude-good-hooks-types';

export async function listHooks(options: any): Promise<void> {
  const { installed, global, project, json } = options;
  const scope = global ? 'global' : 'project';
  
  const hooks: HookMetadata[] = [];
  
  if (installed) {
    const installedModules = getInstalledHookModules(global);
    
    for (const moduleName of installedModules) {
      const plugin = await loadHookPlugin(moduleName, global);
      if (plugin) {
        hooks.push({
          name: plugin.name,
          description: plugin.description,
          version: plugin.version,
          source: global ? 'global' : 'local',
          packageName: moduleName,
          installed: true
        });
      }
    }
    
    const settings = readSettings(scope);
    if (settings.hooks) {
      for (const [eventName, configs] of Object.entries(settings.hooks)) {
        for (const config of configs || []) {
          hooks.push({
            name: `${eventName}${config.matcher ? `:${config.matcher}` : ''}`,
            description: `Configured ${eventName} hook`,
            version: 'n/a',
            source: global ? 'global' : 'local',
            installed: true
          });
        }
      }
    }
  } else {
    const remoteHooks = getRemoteHooks();
    for (const moduleName of remoteHooks) {
      const plugin = await loadHookPlugin(moduleName, false);
      if (plugin) {
        hooks.push({
          name: plugin.name,
          description: plugin.description,
          version: plugin.version,
          source: 'remote',
          packageName: moduleName,
          installed: getInstalledHookModules(false).includes(moduleName)
        });
      }
    }
    
    const installedModules = getInstalledHookModules(global);
    for (const moduleName of installedModules) {
      const plugin = await loadHookPlugin(moduleName, global);
      if (plugin) {
        hooks.push({
          name: plugin.name,
          description: plugin.description,
          version: plugin.version,
          source: global ? 'global' : 'local',
          packageName: moduleName,
          installed: true
        });
      }
    }
  }
  
  if (json) {
    console.log(JSON.stringify(hooks, null, 2));
  } else {
    if (hooks.length === 0) {
      console.log(chalk.yellow('No hooks found'));
      return;
    }
    
    console.log(chalk.bold(`\nAvailable Hooks (${scope}):\n`));
    
    for (const hook of hooks) {
      const status = hook.installed ? chalk.green('✓') : chalk.red('✗');
      console.log(`${status} ${chalk.bold(hook.name)} v${hook.version}`);
      console.log(`  ${hook.description}`);
      if (hook.packageName) {
        console.log(`  Package: ${chalk.dim(hook.packageName)}`);
      }
      console.log();
    }
  }
}