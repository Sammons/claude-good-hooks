import chalk from 'chalk';
import { HookService } from '../../services/hook.service.js';
import type { HelpInfo } from '../command-registry.js';
import type { HookConfiguration } from '@sammons/claude-good-hooks-types';

interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

interface ListHooksOptions {
  installed?: boolean;
  global?: boolean;
  json?: boolean;
  help?: boolean;
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

  private hookService: HookService;

  constructor(hookService?: HookService) {
    this.hookService = hookService || new HookService();
  }

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
        'claude-good-hooks list-hooks --global'
      ]
    };
  }

  /**
   * Format hook configuration for display
   */
  private formatHookConfiguration(config: HookConfiguration): string[] {
    const lines: string[] = [];
    
    // Add description if it exists - check both new and old formats for backwards compatibility
    const description = config.claudegoodhooks?.description || (config as any).description;
    if (description) {
      lines.push(`  ${chalk.dim('Description:')} ${chalk.italic(description)}`);
    }
    
    if (config.matcher) {
      lines.push(`  ${chalk.dim('Matcher:')} ${chalk.cyan(config.matcher)}`);
    }
    
    if (config.hooks && config.hooks.length > 0) {
      config.hooks.forEach((hook, index) => {
        const prefix = config.hooks!.length > 1 ? `  ${chalk.dim(`[${index + 1}]`)} ` : '  ';
        lines.push(`${prefix}${chalk.dim('Type:')} ${chalk.green(hook.type)}`);
        lines.push(`${prefix}${chalk.dim('Command:')} ${chalk.yellow(hook.command)}`);
        if (hook.timeout) {
          lines.push(`${prefix}${chalk.dim('Timeout:')} ${chalk.magenta(hook.timeout + 's')}`);
        }
        if (config.hooks!.length > 1 && index < config.hooks!.length - 1) {
          lines.push(''); // Add spacing between multiple hooks
        }
      });
    }
    
    // Add warning for hooks without claudegoodhooks.name field (check old format too for backwards compatibility)
    const hookName = config.claudegoodhooks?.name || (config as any).name;
    if (!hookName) {
      lines.push(`  ${chalk.yellow('⚠')} ${chalk.dim('This hook is not managed, and cannot be modified through claude-good-hooks')}`);
    }
    
    return lines;
  }

  /**
   * Execute the list-hooks command
   */
  async execute(args: string[], options: ListHooksOptions): Promise<void> {
    const json = options.json || options.parent?.json;
    
    // Handle help flag
    if (options.help) {
      if (json) {
        const helpInfo = this.getHelp();
        console.log(JSON.stringify(helpInfo, null, 2));
      } else {
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
            console.log(`  ${example}`);
          }
          console.log('');
        }
      }
      return;
    }

    const { installed, global } = options;
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
        const version = hook.version === 'n/a' ? '' : ` v${hook.version}`;
        console.log(`${status} ${chalk.bold(hook.name)}${version}`);
        
        // Show hook configuration details if available
        if (hook.hookConfiguration) {
          const configLines = this.formatHookConfiguration(hook.hookConfiguration);
          if (configLines.length > 0) {
            configLines.forEach(line => console.log(line));
          } else {
            console.log(`  ${hook.description}`);
          }
        } else {
          console.log(`  ${hook.description}`);
        }
        
        if (hook.packageName) {
          console.log(`  ${chalk.dim('Package:')} ${chalk.dim(hook.packageName)}`);
        }
        console.log('');
      }
    }
  }
}