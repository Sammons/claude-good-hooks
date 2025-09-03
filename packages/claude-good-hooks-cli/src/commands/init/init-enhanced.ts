import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import { output, initializeOutput } from '../../utils/output.js';
import { withSpinner, withProgressBar } from '../../utils/progress.js';
import { createError, EnhancedError } from '../../utils/errors.js';
import { prompts, choiceHelpers, isInteractive, promptOrDefault } from '../../utils/prompts-simple.js';
import { withCancelableSpinner, makeCancelable } from '../../utils/cancelable.js';
import { writeSettings, getSettingsPath } from '../../utils/settings.js';
import { detectProject, getProjectTypeName, getFeatureDescription } from '../../utils/project-detector.js';
import { generateStarterHooks, getAvailableTemplates } from '../../utils/hook-templates.js';
import type { ClaudeSettings } from '@sammons/claude-good-hooks-types';

interface InitOptions {
  force?: boolean;
  scope?: 'project' | 'global';
  template?: string;
  yes?: boolean;
  parent?: Record<string, unknown>;
}

/**
 * Enhanced initialization command with progress indicators, interactive prompts,
 * and comprehensive error handling
 */
export async function initCommandEnhanced(options: InitOptions = {}): Promise<void> {
  // Initialize output system
  initializeOutput(options);
  
  output.info('🚀 Claude Good Hooks Initialization');
  
  try {
    // Step 1: Determine configuration scope
    const scope = await determineScope(options);
    output.debug(`Using configuration scope: ${scope}`);
    
    // Step 2: Validate and prepare file system
    const { settingsPath, settingsDir } = await prepareFileSystem(scope, options.force);
    
    // Step 3: Detect project and gather configuration
    const settings = await gatherConfiguration(options, scope);
    
    // Step 4: Write configuration with progress indication
    await writeConfigurationWithProgress(settings, settingsPath, settingsDir);
    
    // Step 5: Show completion summary
    showCompletionSummary(settingsPath, scope, settings);
    
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new EnhancedError('Initialization failed', { cause: error as Error });
  }
}

/**
 * Determine configuration scope interactively or from options
 */
async function determineScope(options: InitOptions): Promise<'project' | 'global'> {
  if (options.scope) {
    return options.scope;
  }
  
  if (!isInteractive() || options.yes) {
    return 'project'; // Default to project scope
  }
  
  return await prompts.select(
    'Choose configuration scope:',
    choiceHelpers.scope().map(choice => ({
      ...choice,
      value: choice.value as 'project' | 'global'
    })),
    'project'
  ) as 'project' | 'global';
}

/**
 * Validate paths and prepare file system
 */
async function prepareFileSystem(
  scope: 'project' | 'global',
  force?: boolean
): Promise<{ settingsPath: string; settingsDir: string }> {
  return withSpinner(async () => {
    const settingsPath = getSettingsPath(scope);
    const settingsDir = join(settingsPath, '..');
    
    // Check if configuration already exists
    if (existsSync(settingsPath) && !force) {
      throw createError.fileAlreadyExists(settingsPath)
        .addSuggestion({
          title: 'Use force flag',
          description: 'Overwrite the existing configuration file',
          command: 'claude-good-hooks init --force'
        })
        .addSuggestion({
          title: 'Choose different scope',
          description: 'Initialize in a different scope (global/project)',
          command: 'claude-good-hooks init --scope global'
        });
    }
    
    // Create .claude directory if it doesn't exist
    if (!existsSync(settingsDir)) {
      mkdirSync(settingsDir, { recursive: true });
      output.debug(`Created directory: ${settingsDir}`);
    }
    
    return { settingsPath, settingsDir };
  }, 'Preparing file system...');
}

/**
 * Gather configuration through project detection and user input
 */
async function gatherConfiguration(
  options: InitOptions,
  scope: 'project' | 'global'
): Promise<ClaudeSettings> {
  return withProgressBar(async (progress) => {
    progress.update(1, 'Detecting project type...');
    
    // Detect project information
    const projectInfo = await makeCancelable(async () => {
      // Simulate some async work for demonstration
      await new Promise(resolve => setTimeout(resolve, 500));
      return detectProject();
    }).promise;
    
    progress.update(2, `Detected ${getProjectTypeName(projectInfo.type)} project`);
    
    let settings: ClaudeSettings = { hooks: {} };
    
    if (options.yes || !isInteractive()) {
      // Non-interactive mode - use auto-detected settings
      progress.update(3, 'Generating default configuration...');
      settings = generateStarterHooks(projectInfo);
      
      output.success(`Auto-configured hooks for ${getProjectTypeName(projectInfo.type)}`);
      
      if (projectInfo.features.length > 0) {
        output.info('Detected features:');
        output.list(projectInfo.features.map(f => 
          `${f}: ${getFeatureDescription(f)}`
        ));
      }
    } else {
      // Interactive mode
      progress.update(3, 'Gathering user preferences...');
      settings = await gatherInteractiveConfiguration(projectInfo, options);
    }
    
    progress.update(4, 'Configuration ready');
    
    return settings;
  }, 4, 'Gathering configuration...');
}

/**
 * Gather configuration interactively
 */
async function gatherInteractiveConfiguration(
  projectInfo: ReturnType<typeof detectProject>,
  options: InitOptions
): Promise<ClaudeSettings> {
  output.info(`\nDetected ${chalk.cyan(getProjectTypeName(projectInfo.type))} project`);
  
  if (projectInfo.features.length > 0) {
    output.info('Available features:');
    output.list(projectInfo.features.map(f => 
      `${f}: ${getFeatureDescription(f)}`
    ));
  }
  
  // Ask about template preference
  const templates = getAvailableTemplates();
  let template = options.template;
  
  if (!template && templates.length > 0) {
    const choices = [
      { name: 'Auto-detect (recommended)', value: 'auto', description: 'Use project detection' },
      ...templates.map(t => ({
        name: t.name,
        value: t.id,
        description: t.description
      }))
    ];
    
    template = await prompts.select('Choose template:', choices, 'auto') as string;
  }
  
  // Ask about specific features to enable
  const enabledFeatures = await promptOrDefault(
    () => prompts.multiSelect(
      'Select features to enable hooks for:',
      projectInfo.features.map(feature => ({
        name: feature,
        value: feature,
        description: getFeatureDescription(feature)
      }))
    ) as Promise<string[]>,
    projectInfo.features,
    'Using all detected features in non-interactive mode'
  );
  
  // Generate settings based on selections
  const settings = generateStarterHooks({
    ...projectInfo,
    features: enabledFeatures
  }, template);
  
  // Ask for confirmation
  output.info('\nGenerated configuration preview:');
  output.json(settings, { pretty: true });
  
  const confirmed = await prompts.confirm('Create this configuration?', true);
  if (!confirmed) {
    throw createError.validationFailed('Configuration creation canceled by user');
  }
  
  return settings;
}

/**
 * Write configuration with progress indication and error handling
 */
async function writeConfigurationWithProgress(
  settings: ClaudeSettings,
  settingsPath: string,
  settingsDir: string
): Promise<void> {
  await withCancelableSpinner(
    async (signal) => {
      // Check for cancellation
      if (signal.aborted) {
        throw new Error('Operation was canceled');
      }
      
      // Write the settings file
      await writeSettings(settings, settingsPath);
      
      // Simulate some additional setup time for demonstration
      await new Promise(resolve => setTimeout(resolve, 300));
      
      if (signal.aborted) {
        throw new Error('Operation was canceled');
      }
    },
    'Writing configuration...',
    {
      successMessage: `Configuration written to ${settingsPath}`,
      errorMessage: 'Failed to write configuration'
    }
  ).promise;
}

/**
 * Show completion summary with helpful next steps
 */
function showCompletionSummary(
  settingsPath: string,
  scope: 'project' | 'global',
  settings: ClaudeSettings
): void {
  output.success('\n✅ Initialization completed!');
  
  output.info('Configuration details:');
  output.table([
    { Property: 'Scope', Value: scope },
    { Property: 'Path', Value: settingsPath },
    { Property: 'Hooks configured', Value: Object.keys(settings.hooks || {}).length }
  ]);
  
  output.info('\nNext steps:');
  output.list([
    'Validate your configuration: claude-good-hooks validate',
    'List available hooks: claude-good-hooks list-hooks',
    'Apply a hook: claude-good-hooks apply <hook-name>',
    'Check system status: claude-good-hooks doctor'
  ]);
  
  if (scope === 'project') {
    output.warn('Note: Project configuration will be committed to version control.');
    output.info('Use --scope local if you want local-only settings.');
  }
}

// Extend the error types for this command
declare module '../utils/errors.js' {
  namespace createError {
    function fileAlreadyExists(path: string): EnhancedError;
  }
}

// Implement the missing error creator
const originalCreateError = createError;
Object.assign(createError, {
  fileAlreadyExists: (path: string) => new EnhancedError(
    `Configuration file already exists: ${path}`,
    {
      code: 2004, // FILE_ALREADY_EXISTS
      context: { path },
      suggestions: [
        {
          title: 'Use force flag',
          description: 'Overwrite the existing configuration',
          command: 'claude-good-hooks init --force'
        },
        {
          title: 'Choose different location',
          description: 'Initialize in a different scope',
          command: 'claude-good-hooks init --scope global'
        }
      ]
    }
  )
});