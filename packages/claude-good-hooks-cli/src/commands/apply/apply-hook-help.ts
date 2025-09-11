import chalk from 'chalk';
import { HookService } from '../../services/hook.service.js';
import type { ApplySubCommand } from './apply-types.js';
import type { ApplyOptions } from './apply-options.js';
import type { ValidationResult } from '../common-validation-types.js';

export interface ShowHookHelpParams {
  hookName: string;
  global: boolean;
  isJson: boolean;
}

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

  const isValidArgDef = (
    argDef: unknown
  ): argDef is { required?: boolean; default?: unknown; description: string } => {
    return typeof argDef === 'object' && argDef != null && 'description' in argDef;
  };

  if (helpInfo.customArgs && Object.keys(helpInfo.customArgs).length > 0) {
    console.log(chalk.bold('Options:'));
    for (const [argName, argDef] of Object.entries(helpInfo.customArgs)) {
      if (!isValidArgDef(argDef)) {
        console.warn(`Skipping invalid argDef for argument ${argName}`);
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

/**
 * Hook help sub-command implementation
 */
export class HookHelpCommand implements ApplySubCommand {
  private hookService: HookService;

  constructor(hookService: HookService) {
    this.hookService = hookService;
  }

  /**
   * Check if this sub-command handles the given arguments and options
   */
  match(args: string[], options: ApplyOptions): boolean {
    // Match when help flag is set and hook name is provided
    return Boolean(options.help) && args.length > 0;
  }

  /**
   * Validate the arguments and options for this sub-command
   */
  validate(args: string[], options: ApplyOptions): ValidationResult<ApplyOptions> {
    if (args.length === 0) {
      return {
        valid: false,
        errors: ['Hook name is required for hook-specific help'],
      };
    }

    return {
      valid: true,
      result: options,
    };
  }

  /**
   * Execute the hook help command
   */
  async execute(args: [string, ...string[]], options: ApplyOptions): Promise<void> {
    const hookName = args[0];
    const scope = this.getScope(options);
    const isJson = Boolean(options.parent?.json);

    await showHookHelp(this.hookService, {
      hookName,
      global: scope === 'global',
      isJson,
    });
  }

  /**
   * Determine scope from options
   */
  private getScope(options: ApplyOptions): 'global' | 'local' | 'project' {
    if (options.global) return 'global';
    if (options.local) return 'local';
    return 'project';
  }
}
