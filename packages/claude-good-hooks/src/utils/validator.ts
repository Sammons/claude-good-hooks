import { existsSync, accessSync, constants } from 'fs';
import { join, isAbsolute } from 'path';
import { spawn } from 'child_process';
import chalk from 'chalk';
import type { ClaudeSettings } from '../types';
import { isClaudeSettings, isHookConfiguration, isHookCommand } from '../types';

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
}

export interface ValidationError {
  type: 'syntax' | 'structure' | 'command' | 'timeout' | 'permission' | 'path';
  message: string;
  location?: string;
  details?: string;
}

export interface ValidationWarning {
  type: 'performance' | 'security' | 'compatibility' | 'best-practice' | 'permission';
  message: string;
  location?: string;
  suggestion?: string;
}

/**
 * Validate Claude settings object
 */
export function validateSettings(settings: unknown, filePath?: string): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    suggestions: [],
  };

  // Basic structure validation
  if (!isClaudeSettings(settings)) {
    result.valid = false;
    result.errors.push({
      type: 'structure',
      message: 'Invalid ClaudeSettings structure',
      location: filePath,
      details: 'Settings must be a valid ClaudeSettings object with optional hooks property',
    });
    return result;
  }

  // Validate hooks if present
  if (settings.hooks) {
    const hookResult = validateHooks(settings.hooks, filePath);
    result.valid = result.valid && hookResult.valid;
    result.errors.push(...hookResult.errors);
    result.warnings.push(...hookResult.warnings);
    result.suggestions.push(...hookResult.suggestions);
  }

  // Add general suggestions
  if (!settings.hooks || Object.keys(settings.hooks).length === 0) {
    result.suggestions.push('Consider adding some hooks to enhance your Claude workflow');
  }

  return result;
}

/**
 * Validate hooks object
 */
export function validateHooks(hooks: ClaudeSettings['hooks'], filePath?: string): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    suggestions: [],
  };

  if (!hooks) return result;

  const validEvents = [
    'PreToolUse',
    'PostToolUse',
    'UserPromptSubmit',
    'Notification',
    'Stop',
    'SubagentStop',
    'SessionEnd',
    'SessionStart',
    'PreCompact',
  ];

  // Validate event names
  for (const event of Object.keys(hooks)) {
    if (!validEvents.includes(event)) {
      result.valid = false;
      result.errors.push({
        type: 'structure',
        message: `Invalid hook event: ${event}`,
        location: filePath,
        details: `Valid events are: ${validEvents.join(', ')}`,
      });
    }
  }

  // Validate each event's configurations
  for (const [event, configs] of Object.entries(hooks)) {
    if (!Array.isArray(configs)) {
      result.valid = false;
      result.errors.push({
        type: 'structure',
        message: `Hook event ${event} must be an array`,
        location: filePath,
      });
      continue;
    }

    configs.forEach((config, index) => {
      const configResult = validateHookConfiguration(config, `${filePath}:${event}[${index}]`);
      result.valid = result.valid && configResult.valid;
      result.errors.push(...configResult.errors);
      result.warnings.push(...configResult.warnings);
      result.suggestions.push(...configResult.suggestions);
    });
  }

  return result;
}

/**
 * Validate hook configuration
 */
export function validateHookConfiguration(config: unknown, location?: string): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    suggestions: [],
  };

  if (!isHookConfiguration(config)) {
    result.valid = false;
    result.errors.push({
      type: 'structure',
      message: 'Invalid HookConfiguration structure',
      location,
      details: 'Configuration must have hooks array and optional matcher string',
    });
    return result;
  }

  // Validate matcher patterns
  if (config.matcher) {
    const matcherResult = validateMatcher(config.matcher, location);
    result.valid = result.valid && matcherResult.valid;
    result.errors.push(...matcherResult.errors);
    result.warnings.push(...matcherResult.warnings);
  }

  // Validate each hook command
  config.hooks.forEach((hook, index) => {
    const hookResult = validateHookCommand(hook, `${location}:hook[${index}]`);
    result.valid = result.valid && hookResult.valid;
    result.errors.push(...hookResult.errors);
    result.warnings.push(...hookResult.warnings);
    result.suggestions.push(...hookResult.suggestions);
  });

  return result;
}

/**
 * Validate matcher pattern
 */
export function validateMatcher(matcher: string, location?: string): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    suggestions: [],
  };

  if (!matcher || typeof matcher !== 'string') {
    result.valid = false;
    result.errors.push({
      type: 'structure',
      message: 'Matcher must be a non-empty string',
      location,
    });
    return result;
  }

  // Check for potentially problematic regex patterns
  try {
    new RegExp(matcher);
  } catch {
    result.warnings.push({
      type: 'compatibility',
      message: `Matcher pattern may be invalid regex: ${matcher}`,
      location,
      suggestion: 'Use simple tool names or basic regex patterns',
    });
  }

  // Check for common tool names
  const knownTools = [
    'Bash',
    'Read',
    'Write',
    'Edit',
    'MultiEdit',
    'Glob',
    'Grep',
    'WebFetch',
    'WebSearch',
    'TodoWrite',
    'Task',
    'NotebookEdit',
  ];

  const hasKnownTool = knownTools.some(tool => matcher.includes(tool));
  if (!hasKnownTool && matcher !== '*') {
    result.warnings.push({
      type: 'best-practice',
      message: `Matcher pattern doesn't match known tools: ${matcher}`,
      location,
      suggestion: `Consider using known tool names: ${knownTools.join(', ')}, or "*" for all tools`,
    });
  }

  return result;
}

/**
 * Validate hook command
 */
export function validateHookCommand(hook: unknown, location?: string): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    suggestions: [],
  };

  if (!isHookCommand(hook)) {
    result.valid = false;
    result.errors.push({
      type: 'structure',
      message: 'Invalid HookCommand structure',
      location,
      details: 'Hook must have type "command" and command string, with optional timeout number',
    });
    return result;
  }

  // Validate timeout
  if (hook.timeout !== undefined) {
    if (hook.timeout <= 0) {
      result.valid = false;
      result.errors.push({
        type: 'timeout',
        message: 'Timeout must be positive',
        location,
      });
    } else if (hook.timeout > 600) {
      result.warnings.push({
        type: 'performance',
        message: `Timeout is very high (${hook.timeout}s)`,
        location,
        suggestion: 'Consider reducing timeout to avoid hanging hooks',
      });
    }
  }

  // Validate command
  const commandResult = validateCommand(hook.command, location);
  result.valid = result.valid && commandResult.valid;
  result.errors.push(...commandResult.errors);
  result.warnings.push(...commandResult.warnings);
  result.suggestions.push(...commandResult.suggestions);

  return result;
}

/**
 * Validate command string
 */
export function validateCommand(command: string, location?: string): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    suggestions: [],
  };

  if (!command || typeof command !== 'string') {
    result.valid = false;
    result.errors.push({
      type: 'command',
      message: 'Command must be a non-empty string',
      location,
    });
    return result;
  }

  // Check for shebang
  if (command.includes('\n') && !command.startsWith('#!')) {
    result.warnings.push({
      type: 'best-practice',
      message: 'Multi-line commands should start with shebang',
      location,
      suggestion: 'Add "#!/bin/bash" or appropriate shebang at the start',
    });
  }

  // Check for dangerous commands
  const dangerousPatterns = [
    /\brm\s+-rf\s+\//, // rm -rf /
    /\bsudo\s+rm/, // sudo rm
    />\s*\/dev\/[^s]/, // writing to critical devices
    /\bchmod\s+777/, // overly permissive chmod
    /\bcurl.*\|\s*sh/, // piping curl to shell
    /\bwget.*\|\s*sh/, // piping wget to shell
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(command)) {
      result.warnings.push({
        type: 'security',
        message: 'Command contains potentially dangerous operations',
        location,
        suggestion: 'Review command for security implications',
      });
      break;
    }
  }

  // Check for common issues
  if (command.includes('$1') && !command.includes('file_path')) {
    result.suggestions.push('Consider using descriptive variable names instead of $1');
  }

  if (command.includes('&&') || command.includes('||')) {
    result.suggestions.push('Consider using proper error handling with if/then/else');
  }

  return result;
}

/**
 * Test command execution (dry run)
 */
export async function testCommand(
  command: string,
  timeout: number = 30
): Promise<ValidationResult> {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    suggestions: [],
  };

  return new Promise(resolve => {
    // Create a safe test version of the command
    const testCommand = `set -n; ${command}`;

    const child = spawn('/bin/bash', ['-c', testCommand], {
      stdio: 'pipe',
      timeout: timeout * 1000,
    });

    let stderr = '';
    child.stderr?.on('data', data => {
      stderr += data.toString();
    });

    child.on('close', code => {
      if (code !== 0) {
        result.valid = false;
        result.errors.push({
          type: 'syntax',
          message: 'Command has syntax errors',
          details: stderr.trim() || 'Command failed syntax check',
        });
      }
      resolve(result);
    });

    child.on('error', error => {
      result.valid = false;
      result.errors.push({
        type: 'command',
        message: 'Command execution failed',
        details: error.message,
      });
      resolve(result);
    });
  });
}

/**
 * Validate file paths referenced in commands
 */
export function validateCommandPaths(
  command: string,
  basePath: string = process.cwd()
): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    suggestions: [],
  };

  // Extract file paths from command (basic pattern matching)
  const pathPatterns = [
    /["']([^"']+\.(?:sh|py|js|ts|json|yaml|yml|toml))["']/g,
    /\$CLAUDE_PROJECT_DIR\/([^\s]+)/g,
    /([./][^\s]+)/g,
  ];

  const foundPaths = new Set<string>();

  for (const pattern of pathPatterns) {
    let match;
    while ((match = pattern.exec(command)) !== null) {
      const path = match[1] || match[0];
      if (path && !path.startsWith('$') && !path.includes('*')) {
        foundPaths.add(path);
      }
    }
  }

  // Check if paths exist
  for (const path of Array.from(foundPaths)) {
    let fullPath = path;
    if (!isAbsolute(path)) {
      fullPath = join(basePath, path);
    }

    if (!existsSync(fullPath)) {
      result.warnings.push({
        type: 'compatibility',
        message: `Referenced file does not exist: ${path}`,
        suggestion: 'Ensure the file exists or add existence checks to your hook',
      });
    } else {
      // Check if file is executable for .sh files
      if (path.endsWith('.sh')) {
        try {
          accessSync(fullPath, constants.X_OK);
        } catch {
          result.warnings.push({
            type: 'permission',
            message: `Script file is not executable: ${path}`,
            suggestion: `Run 'chmod +x ${path}' to make it executable`,
          });
        }
      }
    }
  }

  return result;
}

/**
 * Print validation results
 */
export function printValidationResults(results: ValidationResult, verbose: boolean = false): void {
  if (results.valid) {
    console.log(chalk.green('✅ Validation passed'));
  } else {
    console.log(chalk.red('❌ Validation failed'));
  }

  if (results.errors.length > 0) {
    console.log(chalk.red('\n🚨 Errors:'));
    results.errors.forEach((error, index) => {
      console.log(chalk.red(`  ${index + 1}. ${error.message}`));
      if (error.location) {
        console.log(chalk.gray(`     Location: ${error.location}`));
      }
      if (error.details && verbose) {
        console.log(chalk.gray(`     Details: ${error.details}`));
      }
    });
  }

  if (results.warnings.length > 0) {
    console.log(chalk.yellow('\n⚠️  Warnings:'));
    results.warnings.forEach((warning, index) => {
      console.log(chalk.yellow(`  ${index + 1}. ${warning.message}`));
      if (warning.location) {
        console.log(chalk.gray(`     Location: ${warning.location}`));
      }
      if (warning.suggestion) {
        console.log(chalk.blue(`     Suggestion: ${warning.suggestion}`));
      }
    });
  }

  if (results.suggestions.length > 0 && verbose) {
    console.log(chalk.blue('\n💡 Suggestions:'));
    results.suggestions.forEach((suggestion, index) => {
      console.log(chalk.blue(`  ${index + 1}. ${suggestion}`));
    });
  }

  console.log();
}
