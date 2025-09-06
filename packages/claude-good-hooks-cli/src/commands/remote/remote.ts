import chalk from 'chalk';
import { ModuleService } from '../../services/module.service.js';
import { ProcessService } from '../../services/process.service.js';
import type { HelpInfo } from '../command-registry.js';

interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

interface RemoteOptions {
  add?: string;
  remove?: string;
  json?: boolean;
  help?: boolean;
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
  validate(_args: string[], _options: any): boolean | ValidationResult {
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
        },
        {
          name: 'help',
          description: 'Show help for this command',
          type: 'boolean'
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
  async execute(_args: string[], options: RemoteOptions): Promise<void> {
    const { add, remove, json, help } = options;
    const isJson = options.parent?.json || json;

    // Handle help flag first
    if (help) {
      if (isJson) {
        console.log(JSON.stringify(this.getHelp()));
      } else {
        this.showRemoteHelp();
      }
      return;
    }

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

  /**
   * Show formatted help for the remote command
   */
  private showRemoteHelp(): void {
    const helpInfo = this.getHelp();
    
    console.log(chalk.bold(helpInfo.name) + ' - ' + helpInfo.description + '\n');
    
    console.log(chalk.bold('USAGE'));
    console.log('  ' + helpInfo.usage + '\n');
    
    if (helpInfo.options && helpInfo.options.length > 0) {
      console.log(chalk.bold('OPTIONS'));
      for (const option of helpInfo.options) {
        const optionName = `--${option.name}`;
        const typeInfo = option.type === 'string' ? ' <value>' : '';
        const padding = ' '.repeat(Math.max(0, 20 - optionName.length - typeInfo.length));
        console.log(`  ${optionName}${typeInfo}${padding}${option.description}`);
      }
      console.log('');
    }
    
    if (helpInfo.examples && helpInfo.examples.length > 0) {
      console.log(chalk.bold('EXAMPLES'));
      for (const example of helpInfo.examples) {
        console.log(`  ${chalk.dim('# ' + example)}`);
        console.log(`  ${example}\n`);
      }
    }
  }
}