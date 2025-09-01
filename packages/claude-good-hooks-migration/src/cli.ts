#!/usr/bin/env node

import { Command } from 'commander';
import inquirer from 'inquirer';
import { MigrationManager } from './migration-manager.js';
import { GitHooksMigrator } from './migrators/git-hooks.js';
import { HuskyMigrator } from './migrators/husky.js';
import { PreCommitMigrator } from './migrators/pre-commit.js';
import { VSCodeTasksMigrator } from './migrators/vscode-tasks.js';

const program = new Command();

program
  .name('claude-hooks-migrate')
  .description('Migration tool for Claude Good Hooks')
  .version('1.0.0');

// Interactive migration wizard
program
  .command('wizard')
  .alias('w')
  .description('Interactive migration wizard')
  .action(async () => {
    console.log('🧙‍♂️ Claude Good Hooks Migration Wizard');
    console.log('=====================================\\n');

    const manager = new MigrationManager();
    await manager.runInteractiveWizard();
  });

// Migrate from specific system
program
  .command('migrate')
  .alias('m')
  .description('Migrate from a specific hook system')
  .option('--from <system>', 'Source hook system (git-hooks, husky, pre-commit, vscode-tasks)')
  .option('--to <system>', 'Target system (default: claude-good-hooks)')
  .option('--dry-run', 'Preview changes without applying them')
  .option('--backup', 'Create backup of original configuration')
  .option('--force', 'Force migration even if validation fails')
  .option('--config <path>', 'Path to custom migration configuration')
  .action(async (options) => {
    const manager = new MigrationManager();
    await manager.migrate({
      from: options.from,
      to: options.to || 'claude-good-hooks',
      dryRun: options.dryRun,
      backup: options.backup,
      force: options.force,
      configPath: options.config
    });
  });

// Analyze current setup
program
  .command('analyze')
  .alias('a')
  .description('Analyze current hook setup and suggest migration paths')
  .option('--output <format>', 'Output format (json, yaml, text)', 'text')
  .option('--save <file>', 'Save analysis to file')
  .action(async (options) => {
    const manager = new MigrationManager();
    const analysis = await manager.analyzeCurrentSetup();
    
    if (options.save) {
      await manager.saveAnalysis(analysis, options.save, options.output);
      console.log(`📊 Analysis saved to: ${options.save}`);
    } else {
      manager.displayAnalysis(analysis, options.output);
    }
  });

// Validate migrated configuration
program
  .command('validate')
  .alias('v')
  .description('Validate migrated hook configuration')
  .option('--config <path>', 'Path to configuration file to validate')
  .option('--strict', 'Enable strict validation mode')
  .action(async (options) => {
    const manager = new MigrationManager();
    const isValid = await manager.validateConfiguration(options.config, {
      strict: options.strict
    });
    
    if (isValid) {
      console.log('✅ Configuration is valid');
      process.exit(0);
    } else {
      console.log('❌ Configuration validation failed');
      process.exit(1);
    }
  });

// Test migrated hooks
program
  .command('test-hooks')
  .alias('t')
  .description('Test migrated hooks functionality')
  .option('--config <path>', 'Path to configuration file')
  .option('--hook <name>', 'Test specific hook only')
  .option('--verbose', 'Enable verbose output')
  .action(async (options) => {
    const manager = new MigrationManager();
    await manager.testHooks({
      configPath: options.config,
      hookName: options.hook,
      verbose: options.verbose
    });
  });

// Generate migration report
program
  .command('report')
  .alias('r')
  .description('Generate migration report')
  .option('--format <format>', 'Report format (html, pdf, json)', 'html')
  .option('--output <file>', 'Output file path')
  .option('--include-analysis', 'Include detailed analysis in report')
  .action(async (options) => {
    const manager = new MigrationManager();
    const reportPath = await manager.generateReport({
      format: options.format,
      outputPath: options.output,
      includeAnalysis: options.includeAnalysis
    });
    
    console.log(`📋 Migration report generated: ${reportPath}`);
  });

// Version upgrade
program
  .command('upgrade')
  .alias('u')
  .description('Upgrade between versions of Claude Good Hooks')
  .option('--from <version>', 'Source version')
  .option('--to <version>', 'Target version')
  .option('--auto-detect', 'Auto-detect current version')
  .option('--backup', 'Create backup before upgrade')
  .action(async (options) => {
    const manager = new MigrationManager();
    await manager.upgradeVersion({
      fromVersion: options.from,
      toVersion: options.to,
      autoDetect: options.autoDetect,
      backup: options.backup
    });
  });

// Rollback migration
program
  .command('rollback')
  .description('Rollback a migration')
  .option('--backup <path>', 'Path to backup to restore from')
  .option('--confirm', 'Skip confirmation prompt')
  .action(async (options) => {
    if (!options.confirm) {
      const { confirmed } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirmed',
        message: 'Are you sure you want to rollback the migration?',
        default: false
      }]);
      
      if (!confirmed) {
        console.log('Rollback cancelled');
        return;
      }
    }
    
    const manager = new MigrationManager();
    await manager.rollback(options.backup);
  });

// List available migrators
program
  .command('list-migrators')
  .alias('l')
  .description('List available migration paths')
  .action(() => {
    console.log('🔄 Available Migration Paths:\\n');
    
    const migrators = [
      { name: 'git-hooks', description: 'Traditional Git hooks (.git/hooks/)' },
      { name: 'husky', description: 'Husky Git hooks manager' },
      { name: 'pre-commit', description: 'Pre-commit framework (Python)' },
      { name: 'vscode-tasks', description: 'VS Code tasks and file watchers' },
      { name: 'github-actions', description: 'GitHub Actions workflows (local dev)' },
      { name: 'webpack-hooks', description: 'Webpack plugin hooks' },
      { name: 'vite-hooks', description: 'Vite plugin hooks' }
    ];
    
    migrators.forEach(migrator => {
      console.log(`  📦 ${migrator.name.padEnd(20)} - ${migrator.description}`);
    });
    
    console.log('\\n💡 Use "claude-hooks-migrate wizard" for guided migration');
  });

// Default command (interactive wizard)
program
  .action(async () => {
    const manager = new MigrationManager();
    await manager.runInteractiveWizard();
  });

// Error handling
program.exitOverride();

try {
  program.parse();
} catch (error: any) {
  if (error.code === 'commander.helpDisplayed') {
    process.exit(0);
  }
  
  console.error('❌ Migration tool error:', error.message);
  
  if (error.code === 'commander.unknownCommand') {
    console.log('\\n💡 Use "claude-hooks-migrate --help" for available commands');
  }
  
  process.exit(1);
}

export default program;