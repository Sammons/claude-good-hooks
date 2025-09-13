import chalk from 'chalk';
import { SettingsService } from '../../services/settings.service.js';
import { ModuleService } from '../../services/module.service.js';
import type { HelpInfo } from '../command-registry.js';

interface RemoveOptions {
  global?: boolean;
  project?: boolean;
  local?: boolean;
  json?: boolean;
  all?: boolean;
  parent?: {
    json?: boolean;
  };
}

/**
 * Remove command - remove hooks from configuration
 */
export class RemoveCommand {
  name = 'remove';
  description = 'Remove a hook from the configuration';

  private settingsService: SettingsService;
  private moduleService: ModuleService;

  constructor(settingsService?: SettingsService, moduleService?: ModuleService) {
    this.settingsService = settingsService || new SettingsService();
    this.moduleService = moduleService || new ModuleService();
  }

  /**
   * Check if this command handles the given input
   */
  match(command: string): boolean {
    return command === 'remove' || command === 'rm';
  }

  /**
   * Validate command arguments
   */
  validate(args: string[], _options: any): boolean | { valid: boolean; error?: string } {
    if (args.length === 0) {
      return {
        valid: false,
        error: 'Hook name is required. Usage: claude-good-hooks remove <hook-name>',
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
      usage: 'claude-good-hooks remove [options] <hook-name>',
      options: [
        {
          name: 'global',
          description: 'Remove from global settings',
          type: 'boolean',
        },
        {
          name: 'project',
          description: 'Remove from project settings (default)',
          type: 'boolean',
        },
        {
          name: 'local',
          description: 'Remove from local settings',
          type: 'boolean',
        },
        {
          name: 'all',
          description: 'Remove all instances of this hook',
          type: 'boolean',
        },
        {
          name: 'json',
          description: 'Output result in JSON format',
          type: 'boolean',
        },
      ],
      examples: [
        'claude-good-hooks remove @sammons/git-dirty-hook',
        'claude-good-hooks remove --global @sammons/git-dirty-hook',
        'claude-good-hooks remove ./test-hook.js',
        'claude-good-hooks remove --all @sammons/git-dirty-hook',
      ],
    };
  }

  /**
   * Execute the remove command
   */
  async execute(args: string[], options: RemoveOptions): Promise<void> {
    const hookName = args[0];
    const json = options.json || options.parent?.json;

    // Determine scope
    let scope: 'global' | 'project' | 'local';
    if (options.global) {
      scope = 'global';
    } else if (options.local) {
      scope = 'local';
    } else {
      scope = 'project';
    }

    try {
      // Load current settings to find the hook
      const settings = await this.settingsService.readSettings(scope);

      if (!settings.hooks) {
        if (json) {
          console.log(
            JSON.stringify({
              success: false,
              error: 'No hooks configured',
              scope,
            })
          );
        } else {
          console.log(chalk.yellow(`No hooks configured in ${scope} settings`));
        }
        return;
      }

      // Find all instances of this hook
      const removedHooks: Array<{ event: string; matcher?: string }> = [];
      let foundCount = 0;

      for (const [eventName, matchers] of Object.entries(settings.hooks)) {
        if (!Array.isArray(matchers)) continue;

        for (let i = matchers.length - 1; i >= 0; i--) {
          const matcher = matchers[i];

          // Check if this matcher contains our hook
          const claudeGoodHooks = matcher.claudegoodhooks || (matcher as any).claudeGoodHooks;
          if (claudeGoodHooks?.name === hookName) {
            foundCount++;

            if (options.all || foundCount === 1) {
              // Remove this matcher
              matchers.splice(i, 1);
              removedHooks.push({
                event: eventName,
                matcher: matcher.matcher,
              });
            }
          }
        }

        // Remove empty event arrays
        if (matchers.length === 0) {
          delete settings.hooks[eventName as keyof typeof settings.hooks];
        }
      }

      if (foundCount === 0) {
        if (json) {
          console.log(
            JSON.stringify({
              success: false,
              error: `Hook '${hookName}' not found in ${scope} settings`,
              scope,
            })
          );
        } else {
          console.log(chalk.yellow(`Hook '${hookName}' not found in ${scope} settings`));
        }
        return;
      }

      if (removedHooks.length === 0) {
        if (json) {
          console.log(
            JSON.stringify({
              success: false,
              error: `Found ${foundCount} instance(s) of '${hookName}' but none were removed. Use --all to remove all instances.`,
              scope,
              foundCount,
            })
          );
        } else {
          console.log(
            chalk.yellow(`Found ${foundCount} instance(s) of '${hookName}' but none were removed.`)
          );
          console.log(chalk.dim('Use --all flag to remove all instances.'));
        }
        return;
      }

      // Save the updated settings
      await this.settingsService.writeSettings(scope, settings);

      if (json) {
        console.log(
          JSON.stringify({
            success: true,
            removed: removedHooks,
            scope,
            message: `Removed ${removedHooks.length} instance(s) of '${hookName}'`,
          })
        );
      } else {
        console.log(
          chalk.green(
            `✓ Removed ${removedHooks.length} instance(s) of '${hookName}' from ${scope} settings`
          )
        );

        if (removedHooks.length > 0) {
          console.log(chalk.dim('\nRemoved from:'));
          for (const hook of removedHooks) {
            const eventInfo = hook.matcher
              ? `${hook.event} (matcher: ${hook.matcher})`
              : hook.event;
            console.log(chalk.dim(`  - ${eventInfo}`));
          }
        }

        if (foundCount > removedHooks.length) {
          console.log(
            chalk.dim(
              `\n${foundCount - removedHooks.length} instance(s) remaining. Use --all to remove all.`
            )
          );
        }
      }
    } catch (error) {
      if (json) {
        console.log(
          JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error),
            scope,
          })
        );
      } else {
        console.error(
          chalk.red('Error removing hook:'),
          error instanceof Error ? error.message : String(error)
        );
      }
      process.exit(1);
    }
  }
}
