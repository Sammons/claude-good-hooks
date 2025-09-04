import chalk from 'chalk';
import { HookService } from '../../services/hook.service.js';
import type { HelpInfo } from '../command-registry.js';
import type { HookConfiguration, HookCommand } from '@sammons/claude-good-hooks-types';

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
   * Format hook configuration for display
   */
  private formatHookConfiguration(config: HookConfiguration): string[] {
    const lines: string[] = [];
    
    if (config.matcher) {
      lines.push(`  Matcher: ${chalk.cyan(config.matcher)}`);
    }
    
    if (config.hooks && config.hooks.length > 0) {
      if (config.hooks.length === 1) {
        const hook = config.hooks[0];
        lines.push(`  Type: ${chalk.green(hook.type)}`);
        lines.push(`  Command: ${chalk.yellow(hook.command)}`);
        if (hook.timeout) {
          lines.push(`  Timeout: ${chalk.magenta(hook.timeout + 's')}`);
        }
      } else {
        lines.push(`  Commands: ${chalk.green(config.hooks.length + ' hooks')}`);
        config.hooks.forEach((hook, index) => {
          lines.push(`    ${index + 1}. Type: ${chalk.green(hook.type)}`);
          lines.push(`       Command: ${chalk.yellow(hook.command)}`);
          if (hook.timeout) {
            lines.push(`       Timeout: ${chalk.magenta(hook.timeout + 's')}`);
          }
        });
      }
    }
    
    return lines;
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
        const version = hook.version === 'n/a' ? '' : ` v${hook.version}`;
        console.log(`${status} ${chalk.bold(hook.name)}${version}`);
        
        // Debug: check if hookConfiguration exists
        // console.log('DEBUG: hookConfiguration:', JSON.stringify(hook.hookConfiguration, null, 2));
        
        // Show hook configuration details if available
        if (hook.hookConfiguration) {
          const configLines = this.formatHookConfiguration(hook.hookConfiguration);
          if (configLines.length > 0) {
            configLines.forEach(line => console.log(line));
          } else {
            // Fallback to description if no config details
            console.log(`  ${hook.description}`);
          }
        } else {
          // Show description for plugins without configuration
          console.log(`  ${hook.description}`);
        }
        
        if (hook.packageName) {
          console.log(`  Package: ${chalk.dim(hook.packageName)}`);
        }
        console.log('');
      }
    }
  }
}