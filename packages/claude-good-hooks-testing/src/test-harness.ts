import { spawn, type ChildProcess } from 'child_process';
import { createWriteStream, promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type {
  TestHarnessConfig,
  MockClaudeEnvironment,
  HookTestCase,
  HookTestExpectation,
  PerformanceMetrics
} from './types.js';
import type { HookCommand, HookExecutionResult } from '@sammons/claude-good-hooks-types';
import { MockEnvironment } from './mock-environment.js';
import { AssertionError } from './assertions.js';

/**
 * Test harness for executing and testing Claude hooks
 */
export class HookTestHarness {
  private config: Required<TestHarnessConfig>;
  private mockEnv: MockEnvironment;
  private tempDir: string;

  constructor(config: TestHarnessConfig = {}) {
    this.config = {
      timeout: config.timeout ?? 30000,
      captureOutput: config.captureOutput ?? true,
      mockRoot: config.mockRoot ?? '/tmp/claude-hooks-test',
      env: config.env ?? {},
      cwd: config.cwd ?? process.cwd(),
      debug: config.debug ?? false,
      ...config
    };
    
    this.mockEnv = new MockEnvironment();
    this.tempDir = path.join(this.config.mockRoot, uuidv4());
  }

  /**
   * Initialize the test harness
   */
  async initialize(): Promise<void> {
    await fs.mkdir(this.tempDir, { recursive: true });
    await this.mockEnv.setup(this.config.mockRoot);
  }

  /**
   * Cleanup test harness resources
   */
  async cleanup(): Promise<void> {
    try {
      await fs.rm(this.tempDir, { recursive: true, force: true });
      await this.mockEnv.cleanup();
    } catch (error) {
      if (this.config.debug) {
        console.warn('Cleanup warning:', error);
      }
    }
  }

  /**
   * Execute a hook command with the given environment
   */
  async executeHook(
    command: HookCommand,
    environment: MockClaudeEnvironment,
    options: { timeout?: number } = {}
  ): Promise<HookExecutionResult> {
    const startTime = Date.now();
    const executionId = uuidv4();
    
    const context = {
      hookName: 'test-hook',
      eventType: 'TestEvent',
      timestamp: new Date(),
      executionId,
      sessionId: environment.sessionId,
      toolName: environment.toolName,
      args: {},
      metadata: {}
    };

    try {
      // Prepare the environment input JSON
      const hookInput = this.createHookInput(environment);
      
      // Execute the command
      const result = await this.runCommand(
        command.command,
        hookInput,
        options.timeout ?? command.timeout ?? this.config.timeout
      );

      const duration = Date.now() - startTime;
      
      return {
        context,
        success: result.exitCode === 0,
        exitCode: result.exitCode,
        output: result.stdout,
        error: result.stderr,
        duration,
        memoryUsage: result.memoryUsage,
        cpuUsage: result.cpuUsage
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        context,
        success: false,
        exitCode: -1,
        error: error instanceof Error ? error.message : String(error),
        duration
      };
    }
  }

  /**
   * Run a complete test case
   */
  async runTestCase(testCase: HookTestCase): Promise<{
    passed: boolean;
    result: HookExecutionResult;
    errors: string[];
  }> {
    const errors: string[] = [];
    
    try {
      // Setup
      if (testCase.setup) {
        await testCase.setup();
      }

      // Create mock environment
      const environment = this.mockEnv.createEnvironment(testCase.environment);
      
      // Create hook command for testing
      const hookCommand: HookCommand = {
        type: 'command',
        command: 'echo "Test hook"', // This would be replaced with actual hook command
        timeout: testCase.timeout
      };

      // Execute hook
      const result = await this.executeHook(hookCommand, environment, {
        timeout: testCase.timeout
      });

      // Validate results
      try {
        await this.validateExpectation(result, testCase.expected);
      } catch (error) {
        if (error instanceof AssertionError) {
          errors.push(error.message);
        } else {
          errors.push(`Assertion failed: ${error}`);
        }
      }

      // Cleanup
      if (testCase.cleanup) {
        await testCase.cleanup();
      }

      return {
        passed: errors.length === 0,
        result,
        errors
      };
    } catch (error) {
      errors.push(`Test execution failed: ${error}`);
      return {
        passed: false,
        result: {
          context: {
            hookName: 'test-hook',
            eventType: testCase.eventType,
            timestamp: new Date(),
            executionId: uuidv4()
          },
          success: false,
          error: String(error),
          duration: 0
        },
        errors
      };
    }
  }

  /**
   * Create hook input JSON from environment
   */
  private createHookInput(environment: MockClaudeEnvironment): string {
    const input = {
      session_id: environment.sessionId,
      transcript_path: environment.transcriptPath,
      cwd: environment.cwd,
      hook_event_name: 'TestEvent',
      ...environment.toolName && { tool_name: environment.toolName },
      ...environment.toolInput && { tool_input: environment.toolInput },
      ...environment.toolResponse && { tool_response: environment.toolResponse },
      ...environment.prompt && { prompt: environment.prompt },
      ...environment.message && { message: environment.message },
      ...environment.stopHookActive !== undefined && { stop_hook_active: environment.stopHookActive },
      ...environment.trigger && { trigger: environment.trigger },
      ...environment.customInstructions && { custom_instructions: environment.customInstructions },
      ...environment.source && { source: environment.source },
      ...environment.reason && { reason: environment.reason }
    };

    return JSON.stringify(input, null, 2);
  }

  /**
   * Run a shell command with input
   */
  private async runCommand(
    command: string,
    input: string,
    timeout: number
  ): Promise<{
    exitCode: number;
    stdout: string;
    stderr: string;
    memoryUsage?: number;
    cpuUsage?: number;
  }> {
    return new Promise((resolve, reject) => {
      const child = spawn('bash', ['-c', command], {
        cwd: this.config.cwd,
        env: {
          ...process.env,
          ...this.config.env,
          CLAUDE_PROJECT_DIR: this.config.cwd
        },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';
      let timedOut = false;

      // Set up timeout
      const timer = setTimeout(() => {
        timedOut = true;
        child.kill('SIGKILL');
        reject(new Error(`Command timed out after ${timeout}ms`));
      }, timeout);

      // Collect output
      if (child.stdout) {
        child.stdout.on('data', (data) => {
          stdout += data.toString();
        });
      }

      if (child.stderr) {
        child.stderr.on('data', (data) => {
          stderr += data.toString();
        });
      }

      // Send input
      if (child.stdin) {
        child.stdin.write(input);
        child.stdin.end();
      }

      // Handle completion
      child.on('close', (code) => {
        if (timedOut) return;
        
        clearTimeout(timer);
        
        resolve({
          exitCode: code ?? -1,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          memoryUsage: process.memoryUsage().heapUsed,
          cpuUsage: process.cpuUsage().user / 1000000 // Convert to seconds
        });
      });

      child.on('error', (error) => {
        if (timedOut) return;
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  /**
   * Validate test expectations against results
   */
  private async validateExpectation(
    result: HookExecutionResult,
    expected: HookTestExpectation
  ): Promise<void> {
    // Exit code validation
    if (expected.exitCode !== undefined && result.exitCode !== expected.exitCode) {
      throw new AssertionError(
        `Expected exit code ${expected.exitCode}, got ${result.exitCode}`
      );
    }

    // Stdout validation
    if (expected.stdout !== undefined) {
      this.validateOutput(result.output || '', expected.stdout, 'stdout');
    }

    // Stderr validation
    if (expected.stderr !== undefined) {
      this.validateOutput(result.error || '', expected.stderr, 'stderr');
    }

    // Duration validation
    if (expected.duration) {
      const { min, max } = expected.duration;
      if (min !== undefined && result.duration < min) {
        throw new AssertionError(
          `Expected duration >= ${min}ms, got ${result.duration}ms`
        );
      }
      if (max !== undefined && result.duration > max) {
        throw new AssertionError(
          `Expected duration <= ${max}ms, got ${result.duration}ms`
        );
      }
    }

    // File validation
    if (expected.files) {
      for (const fileExpectation of expected.files) {
        await this.validateFile(fileExpectation);
      }
    }

    // Custom assertion
    if (expected.customAssert) {
      await expected.customAssert(result);
    }
  }

  /**
   * Validate output against expectation
   */
  private validateOutput(
    actual: string,
    expected: string | RegExp | ((output: string) => boolean),
    type: string
  ): void {
    if (typeof expected === 'string') {
      if (actual !== expected) {
        throw new AssertionError(
          `Expected ${type} "${expected}", got "${actual}"`
        );
      }
    } else if (expected instanceof RegExp) {
      if (!expected.test(actual)) {
        throw new AssertionError(
          `Expected ${type} to match ${expected}, got "${actual}"`
        );
      }
    } else if (typeof expected === 'function') {
      if (!expected(actual)) {
        throw new AssertionError(
          `Custom ${type} validation failed for "${actual}"`
        );
      }
    }
  }

  /**
   * Validate file expectations
   */
  private async validateFile(fileExpectation: {
    path: string;
    content?: string | RegExp | ((content: string) => boolean);
    exists?: boolean;
  }): Promise<void> {
    const fullPath = path.resolve(this.config.cwd, fileExpectation.path);
    
    try {
      const stats = await fs.stat(fullPath);
      
      if (fileExpectation.exists === false) {
        throw new AssertionError(`Expected file ${fileExpectation.path} not to exist`);
      }

      if (fileExpectation.content !== undefined && stats.isFile()) {
        const content = await fs.readFile(fullPath, 'utf-8');
        this.validateOutput(content, fileExpectation.content, `file content of ${fileExpectation.path}`);
      }
    } catch (error) {
      if (error instanceof AssertionError) {
        throw error;
      }
      
      if (fileExpectation.exists !== false) {
        throw new AssertionError(`Expected file ${fileExpectation.path} to exist`);
      }
    }
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    const usage = process.cpuUsage();
    const memory = process.memoryUsage();
    
    return {
      executionTime: 0, // This would be tracked during test execution
      memoryUsage: memory.heapUsed,
      cpuUsage: (usage.user + usage.system) / 1000000, // Convert to seconds
      loadAverage: process.platform === 'win32' ? undefined : require('os').loadavg()
    };
  }
}