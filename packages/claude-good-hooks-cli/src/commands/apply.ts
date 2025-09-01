import chalk from 'chalk';
import { loadHookPlugin } from '../utils/modules.js';
import { addHookToSettings } from '../utils/settings.js';
import { typedEntries } from '../utils/keys.js';
import type { HookPlugin, ClaudeSettings } from '@sammons/claude-good-hooks-types';

// Type for command-line options
interface ApplyCommandOptions {
  global?: boolean;
  local?: boolean;
  help?: boolean;
  parent?: {
    json?: boolean;
  };
}

// Type for parsed hook arguments based on plugin customArgs definition
type HookArgValue = string | number | boolean;
type ParsedHookArgs = Record<string, HookArgValue>;

export async function applyCommand(hookName: string, args: string[], options: ApplyCommandOptions): Promise<void> {
  const { global, local, help } = options;
  const isJson = options.parent?.json;

  let scope: 'global' | 'project' | 'local' = 'project';
  if (local) scope = 'local';
  if (global) scope = 'global'; // Global takes precedence over local

  const plugin = await loadHookPlugin(hookName, !!global);

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
    showHookHelp(plugin, hookName, isJson || false);
    return;
  }

  const parsedArgs = parseHookArgs(args, plugin);

  if (!plugin) {
    return; // Defensive check - should not reach here in normal operation
  }

  const hookConfiguration = plugin.makeHook(parsedArgs);

  for (const [eventName, configs] of typedEntries(hookConfiguration)) {
    if (configs && configs.length > 0) {
      for (const config of configs) {
        // eventName is guaranteed to be a key of the hook configuration object
        // which matches the structure of ClaudeSettings['hooks']
        addHookToSettings(scope, eventName as keyof ClaudeSettings['hooks'], config);
      }
    }
  }

  if (isJson) {
    console.log(
      JSON.stringify({
        success: true,
        hook: hookName,
        scope,
        args: parsedArgs,
      })
    );
  } else {
    console.log(chalk.green(`✓ Applied hook '${hookName}' to ${scope} settings`));
    if (Object.keys(parsedArgs).length > 0) {
      console.log(chalk.dim(`  With arguments: ${JSON.stringify(parsedArgs)}`));
    }
  }
}

function showHookHelp(plugin: HookPlugin, hookName: string, isJson: boolean): void {
  if (!plugin) {
    const message = `Hook '${hookName}' not found.`;
    if (isJson) {
      console.log(JSON.stringify({ success: false, error: message }));
    } else {
      console.error(message);
    }
    return;
  }

  if (isJson) {
    console.log(
      JSON.stringify({
        name: plugin.name,
        description: plugin.description,
        version: plugin.version,
        customArgs: plugin.customArgs || {},
        usage: `claude-good-hooks apply ${hookName} [options]`,
      })
    );
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
  console.log(
    `  claude-good-hooks apply --${plugin.name === 'dirty' ? 'project' : 'global'} ${hookName}`
  );

  if (plugin.customArgs && Object.keys(plugin.customArgs).length > 0) {
    const exampleArgs = Object.keys(plugin.customArgs)
      .slice(0, 2)
      .map(arg => `--${arg}`)
      .join(' ');
    console.log(`  claude-good-hooks apply --project ${hookName} ${exampleArgs}`);
  }
}

function parseHookArgs(args: string[], plugin: HookPlugin): ParsedHookArgs {
  const parsed: ParsedHookArgs = {};

  if (!plugin || !plugin.customArgs) {
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
