/**
 * Debug logs display sub-command implementation
 */

import { readFileSync, existsSync } from 'fs';
import type { DebugSubCommand, DebugOptions } from '../debug-types.js';
import { DebugConfigurations } from './debugging-utils/debug-configs.js';

export class DebugLogsCommand implements DebugSubCommand {
  match(subcommand: string): boolean {
    return subcommand === 'logs';
  }

  async execute(_args: string[], options: DebugOptions): Promise<void> {
    const logFile = options.output || DebugConfigurations.findLatestLogFile();
    
    if (!logFile || !existsSync(logFile)) {
      console.log('No debug logs found');
      return;
    }
    
    console.log(`📋 Debug Logs from: ${logFile}`);
    console.log('='.repeat(50));
    
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
      console.log(recentLines.join('\n'));
      
      if (filteredLines.length > 50) {
        console.log(`\n... (${filteredLines.length - 50} more lines)`);
        console.log('Use --output to specify a different log file');
      }
    } catch (error) {
      console.error(`Failed to read log file: ${error}`);
      process.exit(1);
    }
  }
}