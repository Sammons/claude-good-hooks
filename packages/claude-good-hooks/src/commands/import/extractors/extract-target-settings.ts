/**
 * Extract target settings from imported configuration
 */

import chalk from 'chalk';
import type { ClaudeSettings } from '../../../types/index.js';
import type { SettingsScope } from '../../../services/settings.service.js';
import type { ImportedConfiguration } from '../loaders/load-configuration.js';

export function extractTargetSettings(
  configData: ImportedConfiguration,
  scope: SettingsScope,
  _source: string
): ClaudeSettings {
  if (typeof configData.settings === 'object' && 'hooks' in configData.settings) {
    // Single settings object
    console.log(chalk.blue('📦 Single configuration detected'));
    return configData.settings as ClaudeSettings;
  } else {
    // Multiple scopes - select the appropriate one or prompt
    const multiScopeSettings = configData.settings as Record<string, ClaudeSettings>;
    const availableScopes = Object.keys(multiScopeSettings);

    console.log(
      chalk.blue(`📦 Multi-scope configuration detected (${availableScopes.join(', ')})`)
    );

    if (availableScopes.includes(scope)) {
      console.log(chalk.green(`✅ Using ${scope} configuration`));
      return multiScopeSettings[scope]!;
    } else if (availableScopes.length === 1) {
      console.log(
        chalk.blue(`📋 Using ${availableScopes[0]} configuration (only available scope)`)
      );
      return multiScopeSettings[availableScopes[0]!]!;
    } else {
      console.error(chalk.red(`❌ Scope '${scope}' not found in configuration`));
      console.error(chalk.yellow(`Available scopes: ${availableScopes.join(', ')}`));
      process.exit(1);
      // TypeScript requires a return, but this will never be reached
      return {} as ClaudeSettings;
    }
  }
}