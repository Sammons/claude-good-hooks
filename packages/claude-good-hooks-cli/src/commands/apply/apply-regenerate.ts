import chalk from 'chalk';
import type { HookService } from '../../services/hook.service.js';
import type { ProcessService } from '../../services/process.service.js';
import type { HandleRegenerateParams } from './apply-types.js';

export async function handleRegenerate(
  hookService: HookService,
  processService: ProcessService,
  params: HandleRegenerateParams
): Promise<void> {
  const { hookName, scope, isJson } = params;
  
  try {
    const result = await hookService.regenerateHooks(hookName, scope);

    if (isJson) {
      console.log(JSON.stringify(result));
      return;
    }

    // Show results
    if (result.totalProcessed === 0) {
      if (hookName) {
        console.log(chalk.yellow(`No hooks found matching '${hookName}'${scope ? ` in ${scope} scope` : ''}`));
      } else {
        console.log(chalk.yellow('No regenerable hooks found in any settings'));
      }
      return;
    }

    console.log(chalk.bold(`\n🔄 Regenerate Results:`));
    console.log(`Total processed: ${result.totalProcessed}`);
    console.log(`✓ Successful: ${chalk.green(result.successCount.toString())}`);
    console.log(`⚠ Skipped: ${chalk.yellow(result.skippedCount.toString())}`);
    console.log(`✗ Errors: ${chalk.red(result.errorCount.toString())}`);

    // Show detailed results
    for (const hookResult of result.results) {
      const scopeLabel = hookResult.scope === 'global' ? 'global' : 
                        hookResult.scope === 'local' ? 'local' : 'project';
      const prefix = hookResult.success ? 
        (hookResult.updated ? chalk.green('✓') : chalk.yellow('⚠')) : 
        chalk.red('✗');
      
      console.log(`${prefix} ${hookResult.hookName} (${scopeLabel}/${hookResult.eventName})`);
      
      if (hookResult.error) {
        console.log(`  ${chalk.dim(hookResult.error)}`);
      }
    }

    if (result.errorCount > 0) {
      processService.exit(1);
    }
  } catch (error: unknown) {
    if (isJson) {
      console.log(JSON.stringify({ 
        success: false, 
        error: `Failed to regenerate hooks: ${String(error)}` 
      }));
    } else {
      console.error(chalk.red(`Failed to regenerate hooks: ${String(error)}`));
    }
    processService.exit(1);
  }
}