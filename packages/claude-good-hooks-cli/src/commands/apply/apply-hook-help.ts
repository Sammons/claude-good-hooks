import chalk from 'chalk';
import type { HookService } from '../../services/hook.service.js';
import type { ShowHookHelpParams } from './apply-types.js';

export async function showHookHelp(
  hookService: HookService,
  params: ShowHookHelpParams
): Promise<void> {
  const { hookName, global, isJson } = params;
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
  
  const isValidArgDef = (argDef: unknown): argDef is {required?: boolean; default?: unknown; description: string;} => {
    return typeof argDef === 'object' && argDef != null && 'description' in argDef
  } 
  
  if (helpInfo.customArgs && Object.keys(helpInfo.customArgs).length > 0) {
    console.log(chalk.bold('Options:'));
    for (const [argName, argDef] of Object.entries(helpInfo.customArgs)) {
      if (!isValidArgDef (argDef))  {
        console.warn(`Skipping invalid argDef for argument ${argName}`)
        continue;
      }
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