import { diff } from 'jest-diff';
import { promises as fs } from 'fs';
import path from 'path';
import type { AssertionMatcher, AssertionHelpers } from './types.js';
import type { HookExecutionResult } from '@sammons/claude-good-hooks-types';

/**
 * Custom assertion error class
 */
export class AssertionError extends Error {
  constructor(message: string, actual?: unknown, expected?: unknown) {
    super(message);
    this.name = 'AssertionError';
    
    if (actual !== undefined && expected !== undefined) {
      const diffString = diff(expected, actual);
      if (diffString) {
        this.message += `\n\n${diffString}`;
      }
    }
  }
}

/**
 * Enhanced assertion utilities for hook testing
 */
export class HookAssertions implements AssertionHelpers {
  private cwd: string;

  constructor(cwd: string = process.cwd()) {
    this.cwd = cwd;
  }

  /**
   * Assert that a value matches the expected matcher
   */
  toMatch<T>(actual: T, expected: AssertionMatcher<T>): void {
    if (typeof expected === 'function') {
      if (!expected(actual)) {
        throw new AssertionError(
          `Expected value to match custom matcher`,
          actual,
          'custom function'
        );
      }
      return;
    }

    if (expected instanceof RegExp) {
      if (typeof actual !== 'string' || !expected.test(actual)) {
        throw new AssertionError(
          `Expected "${actual}" to match pattern ${expected}`,
          actual,
          expected
        );
      }
      return;
    }

    if (actual !== expected) {
      throw new AssertionError(
        `Expected values to match`,
        actual,
        expected
      );
    }
  }

  /**
   * Assert that a file exists
   */
  fileExists(filePath: string): void {
    const fullPath = path.resolve(this.cwd, filePath);
    try {
      const stats = require('fs').statSync(fullPath);
      if (!stats.isFile()) {
        throw new AssertionError(`Path exists but is not a file: ${filePath}`);
      }
    } catch (error) {
      throw new AssertionError(`Expected file to exist: ${filePath}`);
    }
  }

  /**
   * Assert that a file has specific content
   */
  async fileContent(filePath: string, expected: AssertionMatcher<string>): Promise<void> {
    const fullPath = path.resolve(this.cwd, filePath);
    
    try {
      const content = await fs.readFile(fullPath, 'utf-8');
      this.toMatch(content, expected);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new AssertionError(`File does not exist: ${filePath}`);
      }
      throw new AssertionError(`Could not read file content: ${filePath} - ${error}`);
    }
  }

  /**
   * Synchronous version of fileContent for convenience
   */
  fileContentSync(filePath: string, expected: AssertionMatcher<string>): void {
    const fullPath = path.resolve(this.cwd, filePath);
    
    try {
      const content = require('fs').readFileSync(fullPath, 'utf-8');
      this.toMatch(content, expected);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new AssertionError(`File does not exist: ${filePath}`);
      }
      throw new AssertionError(`Could not read file content: ${filePath} - ${error}`);
    }
  }

  /**
   * Assert that a directory exists
   */
  directoryExists(dirPath: string): void {
    const fullPath = path.resolve(this.cwd, dirPath);
    try {
      const stats = require('fs').statSync(fullPath);
      if (!stats.isDirectory()) {
        throw new AssertionError(`Path exists but is not a directory: ${dirPath}`);
      }
    } catch (error) {
      throw new AssertionError(`Expected directory to exist: ${dirPath}`);
    }
  }

  /**
   * Assert that an object has a property
   */
  hasProperty(obj: unknown, property: string): void {
    if (typeof obj !== 'object' || obj === null) {
      throw new AssertionError(
        `Expected object to have property "${property}" but got ${typeof obj}`
      );
    }

    if (!(property in obj)) {
      throw new AssertionError(
        `Expected object to have property "${property}"`,
        Object.keys(obj),
        `object with "${property}" property`
      );
    }
  }

  /**
   * Assert that execution time is within range
   */
  executionTime(actual: number, min?: number, max?: number): void {
    if (min !== undefined && actual < min) {
      throw new AssertionError(
        `Expected execution time to be >= ${min}ms but got ${actual}ms`
      );
    }

    if (max !== undefined && actual > max) {
      throw new AssertionError(
        `Expected execution time to be <= ${max}ms but got ${actual}ms`
      );
    }
  }

  /**
   * Assert that a hook execution was successful
   */
  hookSucceeded(result: HookExecutionResult): void {
    if (!result.success) {
      throw new AssertionError(
        `Expected hook to succeed but it failed`,
        {
          exitCode: result.exitCode,
          error: result.error,
          duration: result.duration
        },
        { success: true }
      );
    }
  }

  /**
   * Assert that a hook execution failed
   */
  hookFailed(result: HookExecutionResult, expectedExitCode?: number): void {
    if (result.success) {
      throw new AssertionError(
        `Expected hook to fail but it succeeded`,
        result,
        { success: false }
      );
    }

    if (expectedExitCode !== undefined && result.exitCode !== expectedExitCode) {
      throw new AssertionError(
        `Expected hook to fail with exit code ${expectedExitCode} but got ${result.exitCode}`
      );
    }
  }

  /**
   * Assert that hook output contains expected text
   */
  hookOutputContains(result: HookExecutionResult, text: string, stream: 'stdout' | 'stderr' = 'stdout'): void {
    const output = stream === 'stdout' ? result.output : result.error;
    if (!output || !output.includes(text)) {
      throw new AssertionError(
        `Expected ${stream} to contain "${text}"`,
        output,
        `string containing "${text}"`
      );
    }
  }

  /**
   * Assert that hook output matches regex
   */
  hookOutputMatches(result: HookExecutionResult, pattern: RegExp, stream: 'stdout' | 'stderr' = 'stdout'): void {
    const output = stream === 'stdout' ? result.output : result.error;
    if (!output || !pattern.test(output)) {
      throw new AssertionError(
        `Expected ${stream} to match pattern ${pattern}`,
        output,
        pattern
      );
    }
  }

  /**
   * Assert that hook completed within time limit
   */
  hookCompletedWithinTime(result: HookExecutionResult, maxTime: number): void {
    if (result.duration > maxTime) {
      throw new AssertionError(
        `Expected hook to complete within ${maxTime}ms but took ${result.duration}ms`
      );
    }
  }

  /**
   * Assert that multiple files exist
   */
  filesExist(filePaths: string[]): void {
    const missing: string[] = [];
    
    for (const filePath of filePaths) {
      try {
        this.fileExists(filePath);
      } catch (error) {
        missing.push(filePath);
      }
    }

    if (missing.length > 0) {
      throw new AssertionError(
        `Expected files to exist: ${missing.join(', ')}`
      );
    }
  }

  /**
   * Assert that files do not exist
   */
  filesDoNotExist(filePaths: string[]): void {
    const existing: string[] = [];
    
    for (const filePath of filePaths) {
      const fullPath = path.resolve(this.cwd, filePath);
      try {
        require('fs').statSync(fullPath);
        existing.push(filePath);
      } catch (error) {
        // File doesn't exist, which is what we want
      }
    }

    if (existing.length > 0) {
      throw new AssertionError(
        `Expected files not to exist: ${existing.join(', ')}`
      );
    }
  }

  /**
   * Assert that a JSON file has specific content
   */
  async jsonFileEquals(filePath: string, expected: unknown): Promise<void> {
    const fullPath = path.resolve(this.cwd, filePath);
    
    try {
      const content = await fs.readFile(fullPath, 'utf-8');
      const parsed = JSON.parse(content);
      
      if (JSON.stringify(parsed) !== JSON.stringify(expected)) {
        throw new AssertionError(
          `JSON file content does not match expected`,
          parsed,
          expected
        );
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new AssertionError(`JSON file does not exist: ${filePath}`);
      }
      if (error instanceof SyntaxError) {
        throw new AssertionError(`Invalid JSON in file: ${filePath}`);
      }
      throw error;
    }
  }

  /**
   * Assert that environment variables are set
   */
  environmentVariablesSet(variables: string[]): void {
    const missing: string[] = [];
    
    for (const variable of variables) {
      if (process.env[variable] === undefined) {
        missing.push(variable);
      }
    }

    if (missing.length > 0) {
      throw new AssertionError(
        `Expected environment variables to be set: ${missing.join(', ')}`
      );
    }
  }

  /**
   * Create a custom assertion
   */
  custom<T>(actual: T, predicate: (value: T) => boolean, message: string): void {
    if (!predicate(actual)) {
      throw new AssertionError(message, actual, 'custom predicate');
    }
  }
}

/**
 * Create assertion helpers with working directory context
 */
export function createAssertions(cwd?: string): HookAssertions {
  return new HookAssertions(cwd);
}

/**
 * Global assertion helpers (uses process.cwd())
 */
export const assert = new HookAssertions();

/**
 * Async assertion wrapper for better error handling
 */
export async function asyncAssert<T>(
  assertion: () => Promise<T>,
  errorMessage?: string
): Promise<T> {
  try {
    return await assertion();
  } catch (error) {
    if (error instanceof AssertionError) {
      throw error;
    }
    throw new AssertionError(
      errorMessage || `Async assertion failed: ${error}`
    );
  }
}