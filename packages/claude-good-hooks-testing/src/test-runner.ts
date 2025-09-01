import { HookTestHarness } from './test-harness.js';
import { CoverageTracker } from './coverage.js';
import { createAssertions } from './assertions.js';
import type { 
  TestSuite, 
  TestRunnerConfig, 
  TestResultSummary, 
  HookTestCase,
  PerformanceMetrics 
} from './types.js';

/**
 * Test runner for executing hook test suites
 */
export class HookTestRunner {
  private config: Required<TestRunnerConfig>;
  private harness: HookTestHarness;
  private coverage: CoverageTracker;
  private results: TestResult[] = [];

  constructor(config: TestRunnerConfig = {}) {
    this.config = {
      testMatch: config.testMatch || ['**/*.test.{js,ts}', '**/test/**/*.{js,ts}'],
      maxConcurrency: config.maxConcurrency || 4,
      timeout: config.timeout || 30000,
      reporters: config.reporters || ['default'],
      coverage: config.coverage || {},
      watch: config.watch || false,
      failFast: config.failFast || false,
      retry: config.retry || 0
    };

    this.harness = new HookTestHarness();
    this.coverage = new CoverageTracker(this.config.coverage);
  }

  /**
   * Run a single test suite
   */
  async runSuite(suite: TestSuite): Promise<TestSuiteResult> {
    console.log(`📋 Running test suite: ${suite.name}`);
    
    const startTime = Date.now();
    const testResults: TestResult[] = [];
    
    try {
      // Global setup
      if (suite.beforeAll) {
        await suite.beforeAll();
      }

      // Run tests with concurrency limit
      const testPromises = suite.tests.map(async (testCase, index) => {
        if (this.config.failFast && this.hasFailures()) {
          return this.createSkippedResult(testCase, 'Skipped due to fail-fast mode');
        }

        return this.runTestWithRetry(testCase, index);
      });

      const batchSize = this.config.maxConcurrency;
      for (let i = 0; i < testPromises.length; i += batchSize) {
        const batch = testPromises.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch);
        testResults.push(...batchResults);

        // Check fail-fast after each batch
        if (this.config.failFast && batchResults.some(r => !r.passed)) {
          // Mark remaining tests as skipped
          for (let j = i + batchSize; j < testPromises.length; j++) {
            testResults.push(
              this.createSkippedResult(suite.tests[j], 'Skipped due to fail-fast mode')
            );
          }
          break;
        }
      }

      // Global cleanup
      if (suite.afterAll) {
        await suite.afterAll();
      }

    } catch (error) {
      console.error(`❌ Suite setup/teardown failed: ${error}`);
      
      // Mark all tests as failed if setup fails
      for (const testCase of suite.tests) {
        testResults.push({
          testCase,
          passed: false,
          duration: 0,
          errors: [`Suite setup failed: ${error}`],
          skipped: false,
          retryCount: 0
        });
      }
    }

    const duration = Date.now() - startTime;
    const passed = testResults.filter(r => r.passed).length;
    const failed = testResults.filter(r => !r.passed && !r.skipped).length;
    const skipped = testResults.filter(r => r.skipped).length;

    this.results.push(...testResults);

    return {
      suite,
      results: testResults,
      summary: {
        total: testResults.length,
        passed,
        failed,
        skipped,
        duration
      }
    };
  }

  /**
   * Run multiple test suites
   */
  async runSuites(suites: TestSuite[]): Promise<TestRunnerResult> {
    console.log(`🚀 Starting test run with ${suites.length} suites`);
    
    const startTime = Date.now();
    
    // Initialize coverage tracking
    await this.coverage.startCoverage();
    
    // Initialize test harness
    await this.harness.initialize();
    
    try {
      const suiteResults: TestSuiteResult[] = [];
      
      for (const suite of suites) {
        const result = await this.runSuite(suite);
        suiteResults.push(result);
        
        // Report progress
        this.reportProgress(result);
        
        // Check fail-fast at suite level
        if (this.config.failFast && result.summary.failed > 0) {
          console.log('🛑 Stopping due to fail-fast mode');
          break;
        }
      }
      
      // Generate coverage report
      const coverageReport = await this.coverage.generateReport();
      const coverageCheck = this.coverage.checkThresholds(coverageReport.summary);
      
      const duration = Date.now() - startTime;
      const summary = this.calculateOverallSummary(suiteResults);
      
      const result: TestRunnerResult = {
        suiteResults,
        summary: {
          ...summary,
          totalTime: duration,
          performance: this.getPerformanceMetrics(),
          coverage: coverageReport.summary
        },
        coverage: coverageReport,
        coverageThresholdsPassed: coverageCheck.passed
      };
      
      // Generate reports
      await this.generateReports(result);
      
      return result;
      
    } finally {
      await this.harness.cleanup();
    }
  }

  /**
   * Run a single test with retry logic
   */
  private async runTestWithRetry(testCase: HookTestCase, index: number): Promise<TestResult> {
    let lastError: any;
    let retryCount = 0;
    
    while (retryCount <= this.config.retry) {
      try {
        console.log(`🧪 Running test: ${testCase.name}${retryCount > 0 ? ` (retry ${retryCount})` : ''}`);
        
        const result = await this.runSingleTest(testCase);
        
        // If test passed or we've exhausted retries, return result
        if (result.passed || retryCount === this.config.retry) {
          return {
            ...result,
            retryCount
          };
        }
        
        lastError = result.errors;
        retryCount++;
        
      } catch (error) {
        lastError = error;
        retryCount++;
        
        if (retryCount > this.config.retry) {
          break;
        }
      }
    }
    
    return {
      testCase,
      passed: false,
      duration: 0,
      errors: Array.isArray(lastError) ? lastError : [String(lastError)],
      skipped: false,
      retryCount
    };
  }

  /**
   * Run a single test case
   */
  private async runSingleTest(testCase: HookTestCase): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      // Test setup
      if (testCase.setup) {
        await testCase.setup();
      }
      
      // Run the test
      const result = await this.harness.runTestCase(testCase);
      
      // Test cleanup
      if (testCase.cleanup) {
        await testCase.cleanup();
      }
      
      const duration = Date.now() - startTime;
      
      return {
        testCase,
        passed: result.passed,
        duration,
        errors: result.errors,
        skipped: false,
        retryCount: 0,
        executionResult: result.result
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        testCase,
        passed: false,
        duration,
        errors: [String(error)],
        skipped: false,
        retryCount: 0
      };
    }
  }

  /**
   * Create a skipped test result
   */
  private createSkippedResult(testCase: HookTestCase, reason: string): TestResult {
    return {
      testCase,
      passed: false,
      duration: 0,
      errors: [],
      skipped: true,
      skipReason: reason,
      retryCount: 0
    };
  }

  /**
   * Check if there are any test failures
   */
  private hasFailures(): boolean {
    return this.results.some(result => !result.passed && !result.skipped);
  }

  /**
   * Report progress for a completed suite
   */
  private reportProgress(suiteResult: TestSuiteResult): void {
    const { summary } = suiteResult;
    const passRate = Math.round((summary.passed / summary.total) * 100);
    
    console.log(
      `✅ ${suiteResult.suite.name}: ` +
      `${summary.passed} passed, ${summary.failed} failed, ${summary.skipped} skipped ` +
      `(${passRate}%) in ${(summary.duration / 1000).toFixed(2)}s`
    );
  }

  /**
   * Calculate overall test summary
   */
  private calculateOverallSummary(suiteResults: TestSuiteResult[]): Omit<TestResultSummary, 'totalTime' | 'performance' | 'coverage'> {
    return suiteResults.reduce(
      (acc, suiteResult) => ({
        total: acc.total + suiteResult.summary.total,
        passed: acc.passed + suiteResult.summary.passed,
        failed: acc.failed + suiteResult.summary.failed,
        skipped: acc.skipped + suiteResult.summary.skipped
      }),
      { total: 0, passed: 0, failed: 0, skipped: 0 }
    );
  }

  /**
   * Get performance metrics
   */
  private getPerformanceMetrics(): PerformanceMetrics {
    const usage = process.cpuUsage();
    const memory = process.memoryUsage();
    
    return {
      executionTime: this.results.reduce((acc, r) => acc + r.duration, 0),
      memoryUsage: memory.heapUsed,
      cpuUsage: (usage.user + usage.system) / 1000000,
      loadAverage: process.platform === 'win32' ? undefined : require('os').loadavg()
    };
  }

  /**
   * Generate test reports
   */
  private async generateReports(result: TestRunnerResult): Promise<void> {
    for (const reporter of this.config.reporters) {
      switch (reporter) {
        case 'default':
          this.generateDefaultReport(result);
          break;
        case 'verbose':
          this.generateVerboseReport(result);
          break;
        case 'json':
          await this.generateJsonReport(result);
          break;
        case 'junit':
          await this.generateJunitReport(result);
          break;
      }
    }
  }

  /**
   * Generate default console report
   */
  private generateDefaultReport(result: TestRunnerResult): void {
    const { summary } = result;
    const passRate = Math.round((summary.passed / summary.total) * 100);
    
    console.log('\\n📊 Test Results Summary');
    console.log('========================');
    console.log(`Tests:       ${summary.total}`);
    console.log(`Passed:      ${summary.passed} (${passRate}%)`);
    console.log(`Failed:      ${summary.failed}`);
    console.log(`Skipped:     ${summary.skipped}`);
    console.log(`Duration:    ${(summary.totalTime / 1000).toFixed(2)}s`);
    
    if (summary.coverage) {
      console.log('\\n📈 Coverage Summary');
      console.log('===================');
      console.log(`Statements:  ${summary.coverage.statements}%`);
      console.log(`Branches:    ${summary.coverage.branches}%`);
      console.log(`Functions:   ${summary.coverage.functions}%`);
      console.log(`Lines:       ${summary.coverage.lines}%`);
    }
    
    if (summary.failed > 0) {
      console.log('\\n❌ Failed Tests');
      console.log('===============');
      
      for (const suiteResult of result.suiteResults) {
        const failedTests = suiteResult.results.filter(r => !r.passed && !r.skipped);
        
        if (failedTests.length > 0) {
          console.log(`\\n${suiteResult.suite.name}:`);
          
          for (const failedTest of failedTests) {
            console.log(`  ❌ ${failedTest.testCase.name}`);
            
            for (const error of failedTest.errors) {
              console.log(`     ${error}`);
            }
          }
        }
      }
    }
  }

  /**
   * Generate verbose console report
   */
  private generateVerboseReport(result: TestRunnerResult): void {
    this.generateDefaultReport(result);
    
    console.log('\\n🔍 Detailed Results');
    console.log('===================');
    
    for (const suiteResult of result.suiteResults) {
      console.log(`\\n📋 Suite: ${suiteResult.suite.name}`);
      
      for (const testResult of suiteResult.results) {
        const icon = testResult.passed ? '✅' : testResult.skipped ? '⏭️' : '❌';
        const duration = `(${testResult.duration}ms)`;
        const retryInfo = testResult.retryCount > 0 ? ` [retry: ${testResult.retryCount}]` : '';
        
        console.log(`  ${icon} ${testResult.testCase.name} ${duration}${retryInfo}`);
        
        if (testResult.skipped && testResult.skipReason) {
          console.log(`     Skipped: ${testResult.skipReason}`);
        }
      }
    }
  }

  /**
   * Generate JSON report
   */
  private async generateJsonReport(result: TestRunnerResult): Promise<void> {
    const fs = await import('fs/promises');
    const jsonPath = './test-results.json';
    
    await fs.writeFile(jsonPath, JSON.stringify(result, null, 2));
    console.log(`📄 JSON report generated: ${jsonPath}`);
  }

  /**
   * Generate JUnit XML report
   */
  private async generateJunitReport(result: TestRunnerResult): Promise<void> {
    // Simplified JUnit XML generation
    // In a real implementation, you'd use a proper XML library
    
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\\n';
    xml += '<testsuites>\\n';
    
    for (const suiteResult of result.suiteResults) {
      xml += `  <testsuite name="${this.escapeXml(suiteResult.suite.name)}" `;
      xml += `tests="${suiteResult.summary.total}" `;
      xml += `failures="${suiteResult.summary.failed}" `;
      xml += `skipped="${suiteResult.summary.skipped}" `;
      xml += `time="${(suiteResult.summary.duration / 1000).toFixed(3)}">\\n`;
      
      for (const testResult of suiteResult.results) {
        xml += `    <testcase name="${this.escapeXml(testResult.testCase.name)}" `;
        xml += `time="${(testResult.duration / 1000).toFixed(3)}">\\n`;
        
        if (!testResult.passed && !testResult.skipped) {
          xml += `      <failure message="Test failed">`;
          xml += `${this.escapeXml(testResult.errors.join('\\n'))}`;
          xml += `</failure>\\n`;
        }
        
        if (testResult.skipped) {
          xml += `      <skipped message="${this.escapeXml(testResult.skipReason || 'Skipped')}"/>\\n`;
        }
        
        xml += '    </testcase>\\n';
      }
      
      xml += '  </testsuite>\\n';
    }
    
    xml += '</testsuites>\\n';
    
    const fs = await import('fs/promises');
    const xmlPath = './test-results.xml';
    
    await fs.writeFile(xmlPath, xml);
    console.log(`📄 JUnit report generated: ${xmlPath}`);
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

// Additional type definitions

interface TestResult {
  testCase: HookTestCase;
  passed: boolean;
  duration: number;
  errors: string[];
  skipped: boolean;
  skipReason?: string;
  retryCount: number;
  executionResult?: any;
}

interface TestSuiteResult {
  suite: TestSuite;
  results: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
  };
}

interface TestRunnerResult {
  suiteResults: TestSuiteResult[];
  summary: TestResultSummary;
  coverage?: any;
  coverageThresholdsPassed?: boolean;
}

export type { TestResult, TestSuiteResult, TestRunnerResult };