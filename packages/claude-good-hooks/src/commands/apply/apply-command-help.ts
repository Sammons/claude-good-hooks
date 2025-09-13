import chalk from 'chalk';
import type { HelpInfo } from '../command-registry.js';

export function showApplyHelp(isJson?: boolean): void {
  if (isJson) {
    const helpData = getApplyHelpInfo();
    console.log(JSON.stringify(helpData));
    return;
  }

  console.log(chalk.bold('\nApply Command'));
  console.log('Apply a hook to the configuration (globally, per-project, or locally)');
  console.log('');

  console.log(chalk.bold('Usage:'));
  console.log('  claude-good-hooks apply [options] [<hook-name>] [args...]');
  console.log('');

  console.log(chalk.bold('Options:'));
  console.log('  --global      Apply globally (~/.claude/settings.json)');
  console.log('  --project     Apply to project (./.claude/settings.json) [default]');
  console.log('  --local       Apply locally (./.claude/settings.local.json)');
  console.log('  --regenerate  Regenerate existing hooks to latest version');
  console.log('  --help        Show help for the apply command or specific hook');
  console.log('  --json        Output in JSON format');
  console.log('');

  console.log(chalk.bold('Examples:'));
  console.log('  # Apply default hook from package');
  console.log('  claude-good-hooks apply @sammons/git-dirty-hook');
  console.log('  claude-good-hooks apply --global @sammons/git-dirty-hook');
  console.log('  claude-good-hooks apply --local @sammons/git-dirty-hook --staged');
  console.log('  ');
  console.log('  # Apply specific hook variant via deep import');
  console.log('  claude-good-hooks apply @sammons/code-outline-hook/minimal');
  console.log('  claude-good-hooks apply @sammons/code-outline-hook/detailed');
  console.log('  ');
  console.log('  # Apply hook from local file');
  console.log('  claude-good-hooks apply --project ./my-hook.js');
  console.log('  claude-good-hooks apply --project ../shared/company-hook.mjs');
  console.log('  ');
  console.log('  # Get help for a specific hook');
  console.log('  claude-good-hooks apply @sammons/git-dirty-hook --help');
  console.log('  ');
  console.log('  # Regenerate hooks');
  console.log('  claude-good-hooks apply --regenerate');
  console.log('  claude-good-hooks apply --regenerate @sammons/git-dirty-hook');
  console.log('');

  console.log(chalk.bold('Help:'));
  console.log('  apply --help              Show this help message');
  console.log('  apply <hook-name> --help  Show help for a specific hook');
}

export function getApplyHelpInfo(): HelpInfo {
  return {
    name: 'apply',
    description: 'Apply a hook to the configuration',
    usage: 'claude-good-hooks apply [options] [<hook-name>] [args...]',
    options: [
      {
        name: 'global',
        description: 'Apply globally',
        type: 'boolean',
      },
      {
        name: 'project',
        description: 'Apply to project (default)',
        type: 'boolean',
      },
      {
        name: 'local',
        description: 'Apply locally (settings.local.json)',
        type: 'boolean',
      },
      {
        name: 'help',
        description: 'Show hook-specific help',
        type: 'boolean',
      },
      {
        name: 'regenerate',
        description: 'Regenerate existing hooks to latest version',
        type: 'boolean',
      },
    ],
    arguments: [
      {
        name: 'hook-name',
        description:
          'Name or path of the hook to apply (e.g., @org/package or @org/package/variant)',
        required: false,
      },
      {
        name: 'args',
        description: 'Hook-specific arguments',
        required: false,
        variadic: true,
      },
    ],
    examples: [
      'claude-good-hooks apply @sammons/git-dirty-hook',
      'claude-good-hooks apply --global @sammons/git-dirty-hook',
      'claude-good-hooks apply @sammons/code-outline-hook/minimal',
      'claude-good-hooks apply @sammons/git-dirty-hook --staged --filenames',
      'claude-good-hooks apply --regenerate',
      'claude-good-hooks apply --regenerate @sammons/git-dirty-hook',
    ],
  };
}
