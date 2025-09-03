import chalk from 'chalk';
import { HookService } from '../../services/hook.service.js';
import type { HelpInfo } from '../command-registry.js';

interface ListHooksOptions {
  installed?: boolean;
  global?: boolean;
  json?: boolean;
  parent?: {
    json?: boolean;
  };
}

export class ListHooksCommand {
  name = 'list-hooks';
  description = 'List available and installed hooks';

  private hookService: HookService;

  constructor(hookService?: HookService) {
    this.hookService = hookService || new HookService();
  }

  /**
   * Check if this command handles the given input
   */
  match(command: string): boolean {
    return command === 'list-hooks';
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
          name: 'global',
          description: 'List global hooks (default: project)',
          type: 'boolean'
        },
        {
          name: 'json',
          description: 'Output in JSON format',
          type: 'boolean'
        }
      ],
      examples: [
        'claude-good-hooks list-hooks',
        'claude-good-hooks list-hooks --installed',
        'claude-good-hooks list-hooks --global --json'
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
    let hooks;
    if (installed) {
      hooks = await this.hookService.listInstalledHooks(scope);
    } else {
      hooks = await this.hookService.listAvailableHooks(global);
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