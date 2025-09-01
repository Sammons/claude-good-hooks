import chalk from 'chalk';
import type { Container } from '../container/index.js';
import type { SettingsScope } from '../services/index.js';

// Type for command-line options
interface ApplyCommandOptions {
  global?: boolean;
  local?: boolean;
  help?: boolean;
  parent?: {
    json?: boolean;
  };
}

export async function applyCommand(
  container: Container,
  hookName: string,
  args: string[],
  options: ApplyCommandOptions
): Promise<void> {
  const { global, local, help } = options;
  const isJson = options.parent?.json;
  const console = container.consoleService;
  const hookService = container.hookService;
  const processService = container.processService;

  let scope: SettingsScope = 'project';
  if (local) scope = 'local';
  if (global) scope = 'global'; // Global takes precedence over local

  if (help) {
    await showHookHelp(container, hookName, scope === 'global', isJson || false);
    return;
  }

  const result = await hookService.applyHook(hookName, args, scope);

  if (!result.success) {
    if (isJson) {
      console.log(JSON.stringify({ success: false, error: result.error }));
    } else {
      console.error(chalk.red(result.error || 'Unknown error'));
    }
    processService.exit(1);
    return;
  }

  if (isJson) {
    console.log(JSON.stringify(result));
  } else {
    console.log(chalk.green(`✓ Applied hook '${result.hook}' to ${result.scope} settings`));
    if (result.args && Object.keys(result.args).length > 0) {
      console.log(chalk.dim(`  With arguments: ${JSON.stringify(result.args)}`));
    }
  }
}

async function showHookHelp(
  container: Container,
  hookName: string,
  global: boolean,
  isJson: boolean
): Promise<void> {
  const console = container.consoleService;
  const hookService = container.hookService;
  
  const helpInfo = await hookService.getHookHelp(hookName, global);

  if (!helpInfo) {
    const message = `Hook '${hookName}' not found.`;
    if (isJson) {
      console.log(JSON.stringify({ success: false, error: message }));
    } else {
      console.error(message);
    }
    return;
  }

  if (isJson) {
    console.log(JSON.stringify(helpInfo));
    return;
  }

  console.log(chalk.bold(`\n${helpInfo.name} v${helpInfo.version}`));
  console.log(helpInfo.description);
  console.log('');

  if (helpInfo.customArgs && Object.keys(helpInfo.customArgs).length > 0) {
    console.log(chalk.bold('Options:'));
    for (const [argName, argDef] of Object.entries(helpInfo.customArgs)) {
      const required = argDef.required ? ' (required)' : '';
      const defaultVal = argDef.default !== undefined ? ` [default: ${argDef.default}]` : '';
      console.log(`  --${argName}  ${argDef.description}${required}${defaultVal}`);
    }
    console.log('');
  }

  console.log(chalk.bold('Usage:'));
  console.log(
    `  claude-good-hooks apply --${helpInfo.name === 'dirty' ? 'project' : 'global'} ${hookName}`
  );

  if (helpInfo.customArgs && Object.keys(helpInfo.customArgs).length > 0) {
    const exampleArgs = Object.keys(helpInfo.customArgs)
      .slice(0, 2)
      .map(arg => `--${arg}`)
      .join(' ');
    console.log(`  claude-good-hooks apply --project ${hookName} ${exampleArgs}`);
  }
}