/**
 * Shared debug configuration utilities
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { 
  HookDebugConfig, 
  BreakpointConfig, 
  HookExecutionResult,
  TracingHookConfig,
  ProfilingHookConfig,
  DebugExecutions
} from '../../debug-types.js';

export class DebugConfigurations {
  private static getConfigDir(): string {
    return join(process.cwd(), '.claude');
  }

  /**
   * Save debug configuration for a specific hook
   */
  static saveDebugConfig(hookName: string, config: HookDebugConfig): void {
    const configFile = join(this.getConfigDir(), 'debug-configs.json');
    
    let configs: Record<string, HookDebugConfig> = {};
    
    if (existsSync(configFile)) {
      try {
        configs = JSON.parse(readFileSync(configFile, 'utf8'));
      } catch {
        // Ignore parse errors, start fresh
      }
    }
    
    configs[hookName] = config;
    
    writeFileSync(configFile, JSON.stringify(configs, null, 2), 'utf8');
  }

  /**
   * Clear debug configuration for a specific hook
   */
  static clearDebugConfig(hookName: string): void {
    const configFile = join(this.getConfigDir(), 'debug-configs.json');
    
    if (!existsSync(configFile)) return;
    
    try {
      const configs = JSON.parse(readFileSync(configFile, 'utf8'));
      delete configs[hookName];
      writeFileSync(configFile, JSON.stringify(configs, null, 2), 'utf8');
    } catch {
      // Ignore errors
    }
  }

  /**
   * Clear all debug configurations
   */
  static clearAllDebugConfigs(): void {
    const configFile = join(this.getConfigDir(), 'debug-configs.json');
    
    if (existsSync(configFile)) {
      writeFileSync(configFile, '{}', 'utf8');
    }
  }

  /**
   * Load all debug configurations
   */
  static loadAllDebugConfigs(): Record<string, HookDebugConfig> {
    const configFile = join(this.getConfigDir(), 'debug-configs.json');
    
    if (!existsSync(configFile)) return {};
    
    try {
      return JSON.parse(readFileSync(configFile, 'utf8'));
    } catch {
      return {};
    }
  }

  /**
   * Save tracing hook configuration
   */
  static saveTracingConfig(hook: TracingHookConfig): void {
    const configFile = join(this.getConfigDir(), 'tracing-hook.json');
    writeFileSync(configFile, JSON.stringify(hook, null, 2), 'utf8');
  }

  /**
   * Save profiling hook configuration
   */
  static saveProfilingConfig(hook: ProfilingHookConfig): void {
    const configFile = join(this.getConfigDir(), 'profiling-hook.json');
    writeFileSync(configFile, JSON.stringify(hook, null, 2), 'utf8');
  }

  /**
   * Save breakpoint configuration
   */
  static saveBreakpointConfig(hookName: string, condition?: string, interactive: boolean = false): void {
    const configFile = join(this.getConfigDir(), 'breakpoints.json');
    
    let breakpoints: Record<string, BreakpointConfig> = {};
    
    if (existsSync(configFile)) {
      try {
        breakpoints = JSON.parse(readFileSync(configFile, 'utf8'));
      } catch {
        // Ignore parse errors
      }
    }
    
    breakpoints[hookName] = {
      condition,
      interactive,
      timestamp: new Date().toISOString()
    };
    
    writeFileSync(configFile, JSON.stringify(breakpoints, null, 2), 'utf8');
  }

  /**
   * Find latest log file
   */
  static findLatestLogFile(): string | null {
    const logDir = this.getConfigDir();
    const possibleFiles = [
      join(logDir, 'debug.log'),
      join(logDir, 'trace.log'),
      join(logDir, 'hooks.log')
    ];
    
    for (const file of possibleFiles) {
      if (existsSync(file)) {
        return file;
      }
    }
    
    return null;
  }

  /**
   * Load recent hook executions
   */
  static loadRecentExecutions(): HookExecutionResult[] {
    const executionsFile = join(this.getConfigDir(), 'executions.json');
    
    if (!existsSync(executionsFile)) return [];
    
    try {
      const data: DebugExecutions = JSON.parse(readFileSync(executionsFile, 'utf8'));
      return data.executions || [];
    } catch {
      return [];
    }
  }

  /**
   * Find a specific execution by ID
   */
  static findExecution(executionId: string): HookExecutionResult | null {
    const executions = this.loadRecentExecutions();
    return executions.find(exec => exec.context.executionId === executionId) || null;
  }

  /**
   * Get metrics file path
   */
  static getMetricsFilePath(): string {
    return join(this.getConfigDir(), 'metrics.json');
  }

  /**
   * Get trace file path
   */
  static getTraceFilePath(): string {
    return join(this.getConfigDir(), 'trace.log');
  }
}