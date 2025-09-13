/**
 * Handle existing settings during import
 */

import chalk from 'chalk';
import type { ClaudeSettings } from '../../../types/index.js';
import type { ImportOptions } from '../import-options.js';
import { selectiveReplaceSettings } from '../mergers/selective-replace-settings.js';

export async function handleExistingSettings(
  existingSettings: ClaudeSettings,
  targetSettings: ClaudeSettings,
  merge: boolean,
  _force: boolean,
  _options: ImportOptions
): Promise<ClaudeSettings> {
  if (!existingSettings.hooks || Object.keys(existingSettings.hooks).length === 0) {
    return targetSettings;
  }

  console.log(chalk.yellow('⚠️  Existing hooks configuration found'));

  // All operations now use selective replacement to preserve unmanaged hooks
  console.log(
    chalk.blue('🎯 Safe import mode: only claude-good-hooks managed hooks will be affected')
  );
  console.log(chalk.gray('   • Unmanaged hooks will be preserved'));
  console.log(chalk.gray('   • Third-party hooks will be preserved'));

  const finalSettings = selectiveReplaceSettings(existingSettings, targetSettings);

  if (merge) {
    console.log(chalk.green('✅ claude-good-hooks merged with existing configuration'));
  } else {
    console.log(
      chalk.green('✅ claude-good-hooks managed hooks updated, unmanaged hooks preserved')
    );
  }

  return finalSettings;
}