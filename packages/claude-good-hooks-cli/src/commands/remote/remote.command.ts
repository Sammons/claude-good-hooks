import chalk from 'chalk';
import { ModuleService } from '../../services/module.service.js';
import { ProcessService } from '../../services/process.service.js';
import { HelpInfo } from '../command-registry.js';

interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

interface RemoteOptions {
  add?: string;
  remove?: string;
  json?: boolean;
  parent?: {
    json?: boolean;
  };
}

/**
 * Remote command - manage remote hook sources
 */
export class RemoteCommand {
  name = 'remote';
  description = 'Manage remote hook sources';

  constructor() {}

  /**
   * Check if this command handles the given input
   */
  match(command: string): boolean {
    return command === 'remote';
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
      usage: 'claude-good-hooks remote [options]',
      options: [
        {
          name: 'add',
          description: 'Add a remote hook module',
          type: 'string'
        },
        {
          name: 'remove',
          description: 'Remove a remote hook module',
          type: 'string'
        }
      ],
      examples: [
        'claude-good-hooks remote',
        'claude-good-hooks remote --add @sammons/dirty-good-claude-hook',
        'claude-good-hooks remote --remove @sammons/dirty-good-claude-hook'
      ]
    };
  }

  /**
   * Execute the remote command
   */
  async execute(args: string[], options: RemoteOptions): Promise<void> {
    const { add, remove, json } = options;
    const isJson = options.parent?.json || json;
    const moduleService = new ModuleService();
    const processService = new ProcessService();

    if (add) {
      const installed = moduleService.isModuleInstalled(add, false) || moduleService.isModuleInstalled(add, true);

      if (!installed) {
        const message = `Module ${add} is not installed. Please install it first using:\n  npm install ${add}\n  or\n  npm install -g ${add}`;

        if (isJson) {
          console.log(JSON.stringify({ success: false, error: message }));
        } else {
          console.error(chalk.red(message));
        }
        processService.exit(1);
        return;
      }

      moduleService.addRemoteHook(add);

      if (isJson) {
        console.log(JSON.stringify({ success: true, action: 'added', module: add }));
      } else {
        console.log(chalk.green(`✓ Added remote hook: ${add}`));
      }
    } else if (remove) {
      moduleService.removeRemoteHook(remove);

      if (isJson) {
        console.log(JSON.stringify({ success: true, action: 'removed', module: remove }));
      } else {
        console.log(chalk.green(`✓ Removed remote hook: ${remove}`));
      }
    } else {
      const remotes = moduleService.getRemoteHooks();

      if (isJson) {
        console.log(JSON.stringify({ remotes }));
      } else {
        if (remotes.length === 0) {
          console.log(chalk.yellow('No remote hooks configured'));
        } else {
          console.log(chalk.bold('\nConfigured Remote Hooks:\n'));
          remotes.forEach(remote => {
            const installed = moduleService.isModuleInstalled(remote, false) || moduleService.isModuleInstalled(remote, true);
            const status = installed ? chalk.green('✓') : chalk.red('✗');
            console.log(`${status} ${remote}`);
          });
        }
      }
    }
  }
}