import chalk from 'chalk';
import { loadHookPlugin } from '../utils/modules.js';
import { addHookToSettings } from '../utils/settings.js';
import type { HookPlugin } from '@sammons/claude-good-hooks-types';

export async function applyCommand(hookName: string, args: string[], options: any): Promise<void> {
  const { global, project, local, help } = options;
  const isJson = options.parent?.json;
  
  let scope: 'global' | 'project' | 'local' = 'project';
  if (global) scope = 'global';
  if (local) scope = 'local';
  
  const plugin = await loadHookPlugin(hookName, global);
  
  if (!plugin) {
    const message = `Hook '${hookName}' not found. Make sure it's installed.`;
    if (isJson) {
      console.log(JSON.stringify({ success: false, error: message }));
    } else {
      console.error(chalk.red(message));
    }
    process.exit(1);
  }
  
  if (help) {
    showHookHelp(plugin, hookName, isJson);
    return;
  }
  
  const parsedArgs = parseHookArgs(args, plugin);
  
  let hookConfigs;
  if (plugin.applyHook) {
    hookConfigs = plugin.applyHook(parsedArgs);
  } else {
    hookConfigs = Object.values(plugin.hooks).flat();
  }
  
  for (const [eventName, configs] of Object.entries(plugin.hooks)) {
    if (configs && configs.length > 0) {
      for (const config of configs) {
        addHookToSettings(scope, eventName as any, config);
      }
    }
  }
  
  if (isJson) {
    console.log(JSON.stringify({ 
      success: true, 
      hook: hookName, 
      scope,
      args: parsedArgs 
    }));
  } else {
    console.log(chalk.green(`✓ Applied hook '${hookName}' to ${scope} settings`));
    if (Object.keys(parsedArgs).length > 0) {
      console.log(chalk.dim(`  With arguments: ${JSON.stringify(parsedArgs)}`));
    }
  }
}

function showHookHelp(plugin: HookPlugin, hookName: string, isJson: boolean): void {
  if (isJson) {
    console.log(JSON.stringify({
      name: plugin.name,
      description: plugin.description,
      version: plugin.version,
      customArgs: plugin.customArgs || {},
      usage: `claude-good-hooks apply ${hookName} [options]`
    }));
    return;
  }
  
  console.log(chalk.bold(`\n${plugin.name} v${plugin.version}`));
  console.log(plugin.description);
  console.log();
  
  if (plugin.customArgs && Object.keys(plugin.customArgs).length > 0) {
    console.log(chalk.bold('Options:'));
    for (const [argName, argDef] of Object.entries(plugin.customArgs)) {
      const required = argDef.required ? ' (required)' : '';
      const defaultVal = argDef.default !== undefined ? ` [default: ${argDef.default}]` : '';
      console.log(`  --${argName}  ${argDef.description}${required}${defaultVal}`);
    }
    console.log();
  }
  
  console.log(chalk.bold('Usage:'));
  console.log(`  claude-good-hooks apply --${plugin.name === 'dirty' ? 'project' : 'global'} ${hookName}`);
  
  if (plugin.customArgs && Object.keys(plugin.customArgs).length > 0) {
    const exampleArgs = Object.keys(plugin.customArgs).slice(0, 2).map(arg => `--${arg}`).join(' ');
    console.log(`  claude-good-hooks apply --project ${hookName} ${exampleArgs}`);
  }
}

function parseHookArgs(args: string[], plugin: HookPlugin): Record<string, any> {
  const parsed: Record<string, any> = {};
  
  if (!plugin.customArgs) {
    return parsed;
  }
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
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
              parsed[argName] = parseFloat(nextArg);
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
      parsed[argName] = argDef.default;
    }
  }
  
  return parsed;
}