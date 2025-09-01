import chalk from 'chalk';

export async function helpCommand(options: any): Promise<void> {
  const isJson = options.parent?.json;

  const helpText = `
${chalk.bold('claude-good-hooks')} - CLI for managing Claude Code hooks

${chalk.bold('USAGE')}
  claude-good-hooks <command> [options]

${chalk.bold('COMMANDS')}
  ${chalk.cyan('help')}                                    Show this help message
  ${chalk.cyan('list-hooks')} [options]                   List available hooks
    --installed                            Show only installed hooks
    --project                              Show project-level hooks (default)
    --global                               Show global hooks
    
  ${chalk.cyan('remote')} [options]                       Manage remote hook sources
    --add <module>                         Add a remote hook module
    --remove <module>                      Remove a remote hook module
    
  ${chalk.cyan('apply')} [options] <hook-name> [args...]  Apply a hook
    --global                               Apply globally
    --project                              Apply to project (default)
    --local                                Apply locally (settings.local.json)
    --help                                 Show hook-specific help
    
  ${chalk.cyan('update')}                                  Update claude-good-hooks CLI
  ${chalk.cyan('doctor')}                                  Check system configuration
  ${chalk.cyan('version')}                                 Show version information

${chalk.bold('GLOBAL OPTIONS')}
  --json                                   Output in JSON format

${chalk.bold('EXAMPLES')}
  ${chalk.dim('# List all available hooks')}
  claude-good-hooks list-hooks
  
  ${chalk.dim('# Install and apply the dirty hook')}
  npm install -g @sammons/dirty-good-claude-hook
  claude-good-hooks apply --global dirty
  
  ${chalk.dim('# Apply hook with custom arguments')}
  claude-good-hooks apply --project dirty --staged --filenames
  
  ${chalk.dim('# Check system configuration')}
  claude-good-hooks doctor
`;

  if (isJson) {
    console.log(
      JSON.stringify({
        commands: {
          help: 'Show help information',
          'list-hooks': 'List available hooks',
          remote: 'Manage remote hook sources',
          apply: 'Apply a hook',
          update: 'Update claude-good-hooks CLI',
          doctor: 'Check system configuration',
          version: 'Show version information',
        },
      })
    );
  } else {
    console.log(helpText);
  }
}
