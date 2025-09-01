#!/usr/bin/env node

import { Command } from 'commander';
import open from 'open';
import { HookBuilderServer } from './server.js';
import { HookGenerator } from './generator.js';

const program = new Command();

program
  .name('claude-hooks-builder')
  .description('Interactive hook builder for Claude Good Hooks')
  .version('1.0.0');

// Start web interface
program
  .command('web')
  .alias('w')
  .description('Start web-based hook builder interface')
  .option('-p, --port <port>', 'Server port', '3000')
  .option('--no-open', 'Do not open browser automatically')
  .option('--host <host>', 'Server host', 'localhost')
  .action(async (options) => {
    const server = new HookBuilderServer({
      port: parseInt(options.port),
      host: options.host
    });

    try {
      const url = await server.start();
      console.log(`🚀 Hook Builder started at: ${url}`);
      
      if (options.open !== false) {
        console.log('Opening browser...');
        await open(url);
      }
      
      console.log('Press Ctrl+C to stop the server');
      
      // Handle graceful shutdown
      process.on('SIGINT', async () => {
        console.log('\\nShutting down Hook Builder...');
        await server.stop();
        process.exit(0);
      });
      
    } catch (error) {
      console.error('❌ Failed to start Hook Builder:', error);
      process.exit(1);
    }
  });

// Generate hook from template
program
  .command('generate')
  .alias('g')
  .description('Generate hook from template or configuration')
  .option('-t, --template <name>', 'Hook template name')
  .option('-c, --config <path>', 'Configuration file path')
  .option('-o, --output <path>', 'Output directory', './generated-hooks')
  .option('--name <name>', 'Hook name')
  .option('--interactive', 'Interactive hook generation')
  .action(async (options) => {
    const generator = new HookGenerator();
    
    if (options.interactive) {
      await generator.interactiveGeneration();
    } else if (options.template) {
      await generator.generateFromTemplate({
        templateName: options.template,
        outputPath: options.output,
        hookName: options.name
      });
    } else if (options.config) {
      await generator.generateFromConfig({
        configPath: options.config,
        outputPath: options.output
      });
    } else {
      console.error('❌ Please specify --template, --config, or --interactive');
      process.exit(1);
    }
  });

// List available templates
program
  .command('list-templates')
  .alias('lt')
  .description('List available hook templates')
  .option('--category <category>', 'Filter by category')
  .action(async (options) => {
    const generator = new HookGenerator();
    const templates = await generator.listTemplates(options.category);
    
    console.log('📋 Available Hook Templates:\\n');
    
    const categories = templates.reduce((acc, template) => {
      const category = template.category || 'Other';
      if (!acc[category]) acc[category] = [];
      acc[category].push(template);
      return acc;
    }, {} as Record<string, any[]>);
    
    for (const [category, categoryTemplates] of Object.entries(categories)) {
      console.log(`\\n🏷️  ${category}:`);
      categoryTemplates.forEach(template => {
        console.log(`  📦 ${template.name.padEnd(20)} - ${template.description}`);
        if (template.tags?.length) {
          console.log(`     Tags: ${template.tags.join(', ')}`);
        }
      });
    }
    
    console.log('\\n💡 Use "claude-hooks-builder generate --template <name>" to create a hook');
  });

// Validate hook configuration
program
  .command('validate')
  .alias('v')
  .description('Validate hook configuration')
  .argument('<config-file>', 'Configuration file to validate')
  .option('--strict', 'Enable strict validation')
  .action(async (configFile, options) => {
    const generator = new HookGenerator();
    const isValid = await generator.validateConfiguration(configFile, {
      strict: options.strict
    });
    
    if (isValid) {
      console.log('✅ Configuration is valid');
    } else {
      console.log('❌ Configuration validation failed');
      process.exit(1);
    }
  });

// Preview hook output
program
  .command('preview')
  .alias('p')
  .description('Preview generated hook without creating files')
  .option('-t, --template <name>', 'Hook template name')
  .option('-c, --config <path>', 'Configuration file path')
  .option('--format <format>', 'Output format (typescript, javascript)', 'typescript')
  .action(async (options) => {
    const generator = new HookGenerator();
    
    if (options.template) {
      const preview = await generator.previewTemplate({
        templateName: options.template,
        format: options.format
      });
      console.log(preview);
    } else if (options.config) {
      const preview = await generator.previewFromConfig({
        configPath: options.config,
        format: options.format
      });
      console.log(preview);
    } else {
      console.error('❌ Please specify --template or --config');
      process.exit(1);
    }
  });

// Export configuration
program
  .command('export')
  .alias('e')
  .description('Export hook configuration in various formats')
  .argument('<config-file>', 'Source configuration file')
  .option('-f, --format <format>', 'Export format (json, yaml, typescript)', 'json')
  .option('-o, --output <file>', 'Output file path')
  .action(async (configFile, options) => {
    const generator = new HookGenerator();
    const exported = await generator.exportConfiguration({
      configPath: configFile,
      format: options.format,
      outputPath: options.output
    });
    
    if (options.output) {
      console.log(`✅ Configuration exported to: ${options.output}`);
    } else {
      console.log(exported);
    }
  });

// Create custom template
program
  .command('create-template')
  .alias('ct')
  .description('Create a custom hook template')
  .option('--name <name>', 'Template name', { required: true })
  .option('--description <desc>', 'Template description')
  .option('--category <category>', 'Template category')
  .option('--interactive', 'Interactive template creation')
  .action(async (options) => {
    const generator = new HookGenerator();
    
    if (options.interactive) {
      await generator.createTemplateInteractive();
    } else {
      await generator.createTemplate({
        name: options.name,
        description: options.description,
        category: options.category
      });
    }
  });

// Default command (start web interface)
program
  .action(async () => {
    console.log('🔧 Claude Good Hooks Builder');
    console.log('==============================\\n');
    console.log('Starting web interface...');
    
    const server = new HookBuilderServer({ port: 3000 });
    const url = await server.start();
    
    console.log(`\\n🚀 Hook Builder is running at: ${url}`);
    await open(url);
    
    process.on('SIGINT', async () => {
      console.log('\\nShutting down...');
      await server.stop();
      process.exit(0);
    });
  });

program.parse();