/**
 * Show preview of import changes with detailed hook-level deltas
 */

import chalk from 'chalk';
import type { ClaudeSettings } from '../../../types/index.js';
import { countHooks } from './count-hooks.js';
import { findHookConfig } from './find-hook-config.js';

export async function showImportPreview(
  finalSettings: ClaudeSettings,
  existingSettings: ClaudeSettings
): Promise<void> {
  const existingHookCount = countHooks(existingSettings);
  const finalHookCount = countHooks(finalSettings);

  console.log(chalk.gray(`   Current hooks: ${existingHookCount}`));
  console.log(chalk.gray(`   After import: ${finalHookCount}`));
  console.log(
    chalk.gray(
      `   Change: ${finalHookCount > existingHookCount ? '+' : ''}${finalHookCount - existingHookCount}`
    )
  );

  // Calculate detailed deltas
  console.log(chalk.blue('\n   Hook-level changes:'));

  // Track existing hooks for comparison
  const existingHooksMap = new Map<string, Set<string>>();
  if (existingSettings.hooks) {
    for (const [event, configs] of Object.entries(existingSettings.hooks)) {
      const hookNames = new Set<string>();
      for (const config of configs as any[]) {
        const hookName = config.claudegoodhooks?.name || config.matcher || 'unnamed';
        hookNames.add(hookName);
      }
      existingHooksMap.set(event, hookNames);
    }
  }

  // Track final hooks and show additions/removals
  const finalHooksMap = new Map<string, Set<string>>();
  const addedHooks: string[] = [];
  const removedHooks: string[] = [];
  const modifiedHooks: string[] = [];

  if (finalSettings.hooks) {
    for (const [event, configs] of Object.entries(finalSettings.hooks)) {
      const hookNames = new Set<string>();
      for (const config of configs as any[]) {
        const hookName = config.claudegoodhooks?.name || config.matcher || 'unnamed';
        hookNames.add(hookName);

        // Check if this is a new hook
        const existingInEvent = existingHooksMap.get(event);
        if (!existingInEvent || !existingInEvent.has(hookName)) {
          addedHooks.push(`${event}/${hookName}`);
        }
      }
      finalHooksMap.set(event, hookNames);
    }
  }

  // Check for removed hooks
  for (const [event, existingHooks] of existingHooksMap) {
    const finalHooks = finalHooksMap.get(event);
    for (const hookName of existingHooks) {
      if (!finalHooks || !finalHooks.has(hookName)) {
        removedHooks.push(`${event}/${hookName}`);
      } else if (finalHooks.has(hookName)) {
        // Check if the hook configuration has changed
        const existingConfig = findHookConfig(existingSettings, event, hookName);
        const finalConfig = findHookConfig(finalSettings, event, hookName);
        if (JSON.stringify(existingConfig) !== JSON.stringify(finalConfig)) {
          modifiedHooks.push(`${event}/${hookName}`);
        }
      }
    }
  }

  // Display the deltas
  if (addedHooks.length > 0) {
    console.log(chalk.green('\n   ➕ Added hooks:'));
    for (const hook of addedHooks) {
      console.log(chalk.green(`      • ${hook}`));
    }
  }

  if (modifiedHooks.length > 0) {
    console.log(chalk.yellow('\n   ✏️  Modified hooks:'));
    for (const hook of modifiedHooks) {
      console.log(chalk.yellow(`      • ${hook}`));
    }
  }

  if (removedHooks.length > 0) {
    console.log(chalk.red('\n   ➖ Removed hooks:'));
    for (const hook of removedHooks) {
      console.log(chalk.red(`      • ${hook}`));
    }
  }

  if (addedHooks.length === 0 && modifiedHooks.length === 0 && removedHooks.length === 0) {
    console.log(chalk.gray('   No changes detected'));
  }
}