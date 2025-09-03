import chalk from 'chalk';
import { HookService } from '../../services/hook.service.js';
import { HelpInfo } from '../command-registry.js';

interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

interface ListHooksOptions {
  installed?: boolean;
  global?: boolean;
  json?: boolean;
  parent?: {
    json?: boolean;
  };
}

/**
 * ListHooks command - list available or installed hooks
 */
export class ListHooksCommand {
  name = 'list-hooks';
  description = 'List available hooks';

  constructor() {}

  /**
   * Check if this command handles the given input
   */
  match(command: string): boolean {
    return command === 'list-hooks' || command === 'list';
  }

  /**
   * Validate command arguments
   */
  validate(args: string[], options: any): boolean | ValidationResult {
    return true;
  }

  /**
   * Get help information for this command
   */
  getHelp(): HelpInfo {
    return {
      name: this.name,
      description: this.description,
      usage: 'claude-good-hooks list-hooks [options]',
      options: [
        {
          name: 'installed',
          description: 'Show only installed hooks',
          type: 'boolean'
        },
        {
          name: 'project',
          description: 'Show project-level hooks (default)',
          type: 'boolean'
        },
        {
          name: 'global',
          description: 'Show global hooks',
          type: 'boolean'
        }
      ],
      examples: [
        'claude-good-hooks list-hooks',
        'claude-good-hooks list-hooks --installed',
        'claude-good-hooks list-hooks --global'
      ]
    };
  }

  /**
   * Execute the list-hooks command
   */
  async execute(args: string[], options: ListHooksOptions): Promise<void> {
    const { installed, global } = options;
    const json = options.json || options.parent?.json;
    const scope = global ? 'global' : 'project';
    const hookService = new HookService();

    let hooks;
    if (installed) {
      hooks = await hookService.listInstalledHooks(scope);
    } else {
      hooks = await hookService.listAvailableHooks(global);
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
        console.log('');
      }
    }
  }
}