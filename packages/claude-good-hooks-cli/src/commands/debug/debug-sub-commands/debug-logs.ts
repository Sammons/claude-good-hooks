/**
 * Debug logs display sub-command implementation
 */

import { readFileSync, existsSync } from 'fs';
import type { DebugSubCommand, DebugOptions } from '../debug-types.js';
import { DebugConfigurations } from './debugging-utils/debug-configs.js';
import type { ConsoleService } from '../../../services/console.service.js';
import type { ProcessService } from '../../../services/process.service.js';

export class DebugLogsCommand implements DebugSubCommand {
  constructor(
    private readonly consoleService: ConsoleService,
    private readonly processService: ProcessService
  ) {}
  match(subcommand: string): boolean {
    return subcommand === 'logs';
  }

  async execute(_args: string[], options: DebugOptions): Promise<void> {
    const logFile = options.output || DebugConfigurations.findLatestLogFile();
    
    if (!logFile || !existsSync(logFile)) {
      this.consoleService.log('No debug logs found');
      return;
    }
    
    this.consoleService.log(`📋 Debug Logs from: ${logFile}`);
    this.consoleService.log('='.repeat(50));
    
    try {
      const logs = readFileSync(logFile, 'utf8');
      const lines = logs.split('\n');
      
      // Apply log level filter
      const filteredLines = lines.filter(line => {
        if (!options.logLevel) return true;
        return line.toLowerCase().includes(options.logLevel);
      });
      
      // Show last 50 lines by default
      const recentLines = filteredLines.slice(-50);
      this.consoleService.log(recentLines.join('\n'));
      
      if (filteredLines.length > 50) {
        this.consoleService.log(`\n... (${filteredLines.length - 50} more lines)`);
        this.consoleService.log('Use --output to specify a different log file');
      }
    } catch (error) {
      this.consoleService.error(`Failed to read log file: ${error}`);
      this.processService.exit(1);
    }
  }
}