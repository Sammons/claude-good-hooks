import chalk from 'chalk';
import { HookService } from '../../services/hook.service.js';
import { ProcessService } from '../../services/process.service.js';
import type { SettingsScope } from '../../services/settings.service.js';
import type { HelpInfo } from '../command-registry.js';

interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

interface ApplyOptions {
  global?: boolean;
  local?: boolean;
  help?: boolean;
  parent?: {
    json?: boolean;
  };
}

/**
 * Apply command - apply a hook to the configuration
 */
export class ApplyCommand {
  name = 'apply';
  description = 'Apply a hook to the configuration';
  
  private hookService: HookService;
  private processService: ProcessService;

  constructor(
    hookService?: HookService,
    processService?: ProcessService
  ) {
    this.hookService = hookService || new HookService();
    this.processService = processService || new ProcessService();
  }

  /**
   * Check if this command handles the given input
   */
  match(command: string): boolean {
    return command === 'apply';
  }

  /**
   * Validate command arguments
   */
  validate(args: string[], options: any): boolean | ValidationResult {
    if (args.length === 0 && !options.help) {
      return {
        valid: false,
        errors: ['Hook name is required']
      };
    }
    return true;
  }

  /**
   * Get help information for this command
   */
  getHelp(): HelpInfo {
    return {
      name: this.name,
      description: this.description,
      usage: 'claude-good-hooks apply [options] <hook-name> [args...]',
      options: [
        {
          name: 'global',
          description: 'Apply globally',
          type: 'boolean'
        },
        {
          name: 'project',
          description: 'Apply to project (default)',
          type: 'boolean'
        },
        {
          name: 'local',
          description: 'Apply locally (settings.local.json)',
          type: 'boolean'
        },
        {
          name: 'help',
          description: 'Show hook-specific help',
          type: 'boolean'
        }
      ],
      arguments: [
        {
          name: 'hook-name',
          description: 'Name of the hook to apply',
          required: true
        },
        {
          name: 'args',
          description: 'Hook-specific arguments',
          required: false,
          variadic: true
        }
      ],
      examples: [
        'claude-good-hooks apply dirty',
        'claude-good-hooks apply --global dirty',
        'claude-good-hooks apply --help dirty',
        'claude-good-hooks apply dirty --staged --filenames'
      ]
    };
  }

  /**
   * Execute the apply command
   */
  async execute(args: string[], options: ApplyOptions): Promise<void> {
    const { global, local, help } = options;
    const isJson = options.parent?.json;

    if (args.length === 0) {
      if (isJson) {
        console.log(JSON.stringify({ success: false, error: 'Hook name is required' }));
      } else {
        console.error(chalk.red('Hook name is required'));
      }
      this.processService.exit(1);
      return;
    }

    const hookName = args[0];
    if (!hookName) {
      if (isJson) {
        console.log(JSON.stringify({ success: false, error: 'Hook name is required' }));
      } else {
        console.error(chalk.red('Hook name is required'));
      }
      this.processService.exit(1);
      return;
    }
    
    const hookArgs = args.slice(1);

    let scope: SettingsScope = 'project';
    if (local) scope = 'local';
    if (global) scope = 'global'; // Global takes precedence over local

    if (help) {
      await this.showHookHelp({
        hookName,
        global: scope === 'global',
        isJson: Boolean(isJson)
      });
      return;
    }

    const result = await this.hookService.applyHook(hookName, hookArgs, scope);

    if (!result.success) {
      if (isJson) {
        console.log(JSON.stringify({ success: false, error: result.error }));
      } else {
        console.error(chalk.red(result.error || 'Unknown error'));
      }
      this.processService.exit(1);
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

  private async showHookHelp(params: {
    hookName: string;
    global: boolean;
    isJson: boolean;
  }): Promise<void> {
    const { hookName, global, isJson } = params;
    const helpInfo = await this.hookService.getHookHelp(hookName, global);

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
}