import type { HookExecutionContext, HookExecutionResult, HookCommand } from '@sammons/claude-good-hooks-types';

/**
 * Configuration for the test harness
 */
export interface TestHarnessConfig {
  /** Timeout for hook execution in milliseconds */
  timeout?: number;
  /** Whether to capture stdout/stderr */
  captureOutput?: boolean;
  /** Mock file system root directory */
  mockRoot?: string;
  /** Environment variables to set */
  env?: Record<string, string>;
  /** Working directory for hook execution */
  cwd?: string;
  /** Whether to enable debug mode */
  debug?: boolean;
}

/**
 * Mock Claude environment configuration
 */
export interface MockClaudeEnvironment {
  /** Current session ID */
  sessionId: string;
  /** Path to transcript file */
  transcriptPath: string;
  /** Current working directory */
  cwd: string;
  /** Tool name being executed */
  toolName?: string;
  /** Tool input data */
  toolInput?: Record<string, unknown>;
  /** Tool response data */
  toolResponse?: Record<string, unknown>;
  /** User prompt */
  prompt?: string;
  /** Notification message */
  message?: string;
  /** Stop hook status */
  stopHookActive?: boolean;
  /** Compact trigger type */
  trigger?: 'manual' | 'auto';
  /** Custom compact instructions */
  customInstructions?: string;
  /** Session start source */
  source?: 'startup' | 'resume' | 'clear';
  /** Session end reason */
  reason?: 'clear' | 'logout' | 'prompt_input_exit' | 'other';
}

/**
 * Test case definition
 */
export interface HookTestCase {
  /** Test case name */
  name: string;
  /** Test description */
  description?: string;
  /** Hook event type */
  eventType: string;
  /** Mock environment setup */
  environment: Partial<MockClaudeEnvironment>;
  /** Expected results */
  expected: HookTestExpectation;
  /** Setup function to run before test */
  setup?: () => Promise<void> | void;
  /** Cleanup function to run after test */
  cleanup?: () => Promise<void> | void;
  /** Test timeout in milliseconds */
  timeout?: number;
  /** Tags for test categorization */
  tags?: string[];
}

/**
 * Expected test results
 */
export interface HookTestExpectation {
  /** Expected exit code */
  exitCode?: number;
  /** Expected stdout content */
  stdout?: string | RegExp | ((output: string) => boolean);
  /** Expected stderr content */
  stderr?: string | RegExp | ((output: string) => boolean);
  /** Expected execution duration range */
  duration?: {
    min?: number;
    max?: number;
  };
  /** Expected files to be created/modified */
  files?: {
    path: string;
    content?: string | RegExp | ((content: string) => boolean);
    exists?: boolean;
  }[];
  /** Custom assertion function */
  customAssert?: (result: HookExecutionResult) => void | Promise<void>;
}

/**
 * Test suite configuration
 */
export interface TestSuite {
  /** Suite name */
  name: string;
  /** Suite description */
  description?: string;
  /** Test cases */
  tests: HookTestCase[];
  /** Global setup for all tests */
  beforeAll?: () => Promise<void> | void;
  /** Global cleanup for all tests */
  afterAll?: () => Promise<void> | void;
  /** Setup before each test */
  beforeEach?: () => Promise<void> | void;
  /** Cleanup after each test */
  afterEach?: () => Promise<void> | void;
  /** Suite timeout in milliseconds */
  timeout?: number;
  /** Tags for suite categorization */
  tags?: string[];
}

/**
 * Coverage report configuration
 */
export interface CoverageConfig {
  /** Include patterns for coverage */
  include?: string[];
  /** Exclude patterns from coverage */
  exclude?: string[];
  /** Coverage thresholds */
  thresholds?: {
    statements?: number;
    branches?: number;
    functions?: number;
    lines?: number;
  };
  /** Output directory for coverage reports */
  outputDir?: string;
  /** Output formats */
  formats?: ('html' | 'json' | 'text' | 'lcov')[];
}

/**
 * Test runner configuration
 */
export interface TestRunnerConfig {
  /** Test file patterns */
  testMatch?: string[];
  /** Maximum concurrent test suites */
  maxConcurrency?: number;
  /** Global timeout for all tests */
  timeout?: number;
  /** Reporter configuration */
  reporters?: ('default' | 'verbose' | 'json' | 'junit')[];
  /** Coverage configuration */
  coverage?: CoverageConfig;
  /** Watch mode configuration */
  watch?: boolean;
  /** Fail fast on first error */
  failFast?: boolean;
  /** Retry failed tests */
  retry?: number;
}

/**
 * Mock file system entry
 */
export interface MockFileSystemEntry {
  [path: string]: string | MockFileSystemEntry;
}

/**
 * Assertion helper types
 */
export type AssertionMatcher<T> = T | RegExp | ((value: T) => boolean);

export interface AssertionHelpers {
  /** Assert that a value matches the expected matcher */
  toMatch<T>(actual: T, expected: AssertionMatcher<T>): void;
  /** Assert that a file exists */
  fileExists(path: string): void;
  /** Assert that a file has specific content */
  fileContent(path: string, expected: AssertionMatcher<string>): void;
  /** Assert that a directory exists */
  directoryExists(path: string): void;
  /** Assert that an object has a property */
  hasProperty(obj: unknown, property: string): void;
  /** Assert that execution time is within range */
  executionTime(actual: number, min?: number, max?: number): void;
}

/**
 * Hook fixture definition
 */
export interface HookFixture {
  /** Fixture name */
  name: string;
  /** Hook configuration */
  hook: HookCommand;
  /** Test environment */
  environment: MockClaudeEnvironment;
  /** Expected behavior */
  expected: HookTestExpectation;
  /** Fixture description */
  description?: string;
  /** Tags for categorization */
  tags?: string[];
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  /** Execution time in milliseconds */
  executionTime: number;
  /** Memory usage in bytes */
  memoryUsage?: number;
  /** CPU usage percentage */
  cpuUsage?: number;
  /** System load average */
  loadAverage?: number[];
}

/**
 * Test result summary
 */
export interface TestResultSummary {
  /** Total number of tests */
  total: number;
  /** Number of passed tests */
  passed: number;
  /** Number of failed tests */
  failed: number;
  /** Number of skipped tests */
  skipped: number;
  /** Total execution time */
  totalTime: number;
  /** Performance metrics */
  performance: PerformanceMetrics;
  /** Coverage information */
  coverage?: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
}