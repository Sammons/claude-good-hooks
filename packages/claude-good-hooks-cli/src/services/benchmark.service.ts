import { performance, PerformanceObserver } from 'perf_hooks';
import { FileSystemService } from './file-system.service.js';

export interface BenchmarkResult {
  name: string;
  duration: number;
  iterations: number;
  meanTime: number;
  medianTime: number;
  minTime: number;
  maxTime: number;
  standardDeviation: number;
  operationsPerSecond: number;
  memoryUsage: {
    used: number;
    total: number;
    external: number;
    heapUsed: number;
    heapTotal: number;
  };
  timestamp: number;
}

export interface BenchmarkSuite {
  name: string;
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
  benchmarks: Array<{
    name: string;
    fn: () => Promise<void> | void;
    iterations?: number;
    warmupIterations?: number;
  }>;
}

export interface ComparisonResult {
  baseline: BenchmarkResult;
  comparison: BenchmarkResult;
  improvementFactor: number;
  significantDifference: boolean;
  confidenceInterval: [number, number];
}

export interface SystemInfo {
  platform: string;
  arch: string;
  nodeVersion: string;
  cpuCount: number;
  totalMemory: number;
  freeMemory: number;
  uptime: number;
}

/**
 * Comprehensive benchmarking service for performance analysis
 */
export class BenchmarkService {
  private performanceObserver: PerformanceObserver | null = null;
  private performanceEntries: Map<string, PerformanceEntry[]> = new Map();
  private fileSystem = new FileSystemService();

  constructor() {
    this.initializePerformanceObserver();
  }

  private initializePerformanceObserver(): void {
    this.performanceObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      
      for (const entry of entries) {
        if (!this.performanceEntries.has(entry.name)) {
          this.performanceEntries.set(entry.name, []);
        }
        this.performanceEntries.get(entry.name)!.push(entry);
      }
    });

    this.performanceObserver.observe({ entryTypes: ['measure', 'function'] });
  }

  async runBenchmark(
    name: string,
    fn: () => Promise<void> | void,
    iterations = 1000
  ): Promise<BenchmarkResult> {
    // Warmup phase
    const warmupIterations = Math.max(10, Math.floor(iterations * 0.1));
    await this.warmup(fn, warmupIterations);

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const durations: number[] = [];
    const memoryBefore = process.memoryUsage();
    const startTime = performance.now();

    // Run benchmark iterations
    for (let i = 0; i < iterations; i++) {
      const iterationStart = performance.now();
      
      try {
        await fn();
      } catch (error: unknown) {
        throw new Error(`Benchmark ${name} failed on iteration ${i + 1}: ${String(error)}`);
      }
      
      const iterationEnd = performance.now();
      durations.push(iterationEnd - iterationStart);
    }

    const endTime = performance.now();
    const memoryAfter = process.memoryUsage();
    const totalDuration = endTime - startTime;

    // Calculate statistics
    const sortedDurations = durations.sort((a, b) => a - b);
    const meanTime = durations.reduce((sum, time) => sum + time, 0) / iterations;
    const medianTime = this.calculateMedian(sortedDurations);
    const minTime = sortedDurations[0];
    const maxTime = sortedDurations[sortedDurations.length - 1];
    const standardDeviation = this.calculateStandardDeviation(durations, meanTime);
    const operationsPerSecond = iterations / (totalDuration / 1000);

    return {
      name,
      duration: totalDuration,
      iterations,
      meanTime,
      medianTime,
      minTime,
      maxTime,
      standardDeviation,
      operationsPerSecond,
      memoryUsage: {
        used: memoryAfter.rss - memoryBefore.rss,
        total: memoryAfter.rss,
        external: memoryAfter.external,
        heapUsed: memoryAfter.heapUsed,
        heapTotal: memoryAfter.heapTotal,
      },
      timestamp: Date.now(),
    };
  }

  async runSuite(suite: BenchmarkSuite): Promise<BenchmarkResult[]> {
    console.log(`Running benchmark suite: ${suite.name}`);
    
    // Run setup if provided
    if (suite.setup) {
      await suite.setup();
    }

    const results: BenchmarkResult[] = [];

    try {
      for (const benchmark of suite.benchmarks) {
        console.log(`  Running: ${benchmark.name}...`);
        
        const result = await this.runBenchmark(
          benchmark.name,
          benchmark.fn,
          benchmark.iterations
        );
        
        results.push(result);
        
        // Brief pause between benchmarks
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } finally {
      // Run teardown if provided
      if (suite.teardown) {
        await suite.teardown();
      }
    }

    return results;
  }

  compare(baseline: BenchmarkResult, comparison: BenchmarkResult): ComparisonResult {
    const improvementFactor = baseline.meanTime / comparison.meanTime;
    
    // Statistical significance test (simple t-test approximation)
    const pooledStdDev = Math.sqrt(
      (baseline.standardDeviation ** 2 + comparison.standardDeviation ** 2) / 2
    );
    const standardError = pooledStdDev * Math.sqrt(
      (1 / baseline.iterations) + (1 / comparison.iterations)
    );
    const tStatistic = Math.abs(baseline.meanTime - comparison.meanTime) / standardError;
    const significantDifference = tStatistic > 1.96; // 95% confidence

    // Calculate confidence interval for the improvement factor
    const marginOfError = 1.96 * standardError / baseline.meanTime;
    const confidenceInterval: [number, number] = [
      improvementFactor - marginOfError,
      improvementFactor + marginOfError,
    ];

    return {
      baseline,
      comparison,
      improvementFactor,
      significantDifference,
      confidenceInterval,
    };
  }

  async exportResults(results: BenchmarkResult[], filePath?: string): Promise<void> {
    const exportData = {
      timestamp: new Date().toISOString(),
      systemInfo: this.getSystemInfo(),
      results,
      summary: this.generateSummary(results),
    };

    const outputPath = filePath ?? this.fileSystem.join(
      this.fileSystem.cwd(),
      `benchmark-results-${Date.now()}.json`
    );

    this.fileSystem.writeFile(outputPath, JSON.stringify(exportData, null, 2));

    // Also generate a human-readable report
    const reportPath = outputPath.replace('.json', '-report.md');
    const report = this.generateMarkdownReport(exportData);
    this.fileSystem.writeFile(reportPath, report);

    console.log(`Results exported to: ${outputPath}`);
    console.log(`Report generated: ${reportPath}`);
  }

  async trackPerformanceMetrics<T>(name: string, fn: () => Promise<T> | T): Promise<T> {
    performance.mark(`${name}-start`);
    
    try {
      const result = await fn();
      performance.mark(`${name}-end`);
      performance.measure(name, `${name}-start`, `${name}-end`);
      return result;
    } catch (error: unknown) {
      performance.mark(`${name}-error`);
      performance.measure(`${name}-error`, `${name}-start`, `${name}-error`);
      throw error;
    }
  }

  getSystemInfo(): SystemInfo {
    const os = require('os');
    
    return {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      cpuCount: os.cpus().length,
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      uptime: os.uptime(),
    };
  }

  private async warmup(fn: () => Promise<void> | void, iterations: number): Promise<void> {
    for (let i = 0; i < iterations; i++) {
      try {
        await fn();
      } catch (error: unknown) {
        // Ignore warmup errors
      }
    }
  }

  private calculateMedian(sortedNumbers: number[]): number {
    const mid = Math.floor(sortedNumbers.length / 2);
    
    if (sortedNumbers.length % 2 === 0) {
      return (sortedNumbers[mid - 1] + sortedNumbers[mid]) / 2;
    }
    
    return sortedNumbers[mid];
  }

  private calculateStandardDeviation(numbers: number[], mean: number): number {
    const squaredDifferences = numbers.map(num => Math.pow(num - mean, 2));
    const avgSquaredDifference = squaredDifferences.reduce((sum, val) => sum + val, 0) / numbers.length;
    return Math.sqrt(avgSquaredDifference);
  }

  private generateSummary(results: BenchmarkResult[]) {
    if (results.length === 0) return null;

    const totalOperations = results.reduce((sum, result) => sum + result.iterations, 0);
    const totalDuration = results.reduce((sum, result) => sum + result.duration, 0);
    const avgOpsPerSecond = results.reduce((sum, result) => sum + result.operationsPerSecond, 0) / results.length;
    
    const fastest = results.reduce((min, result) => 
      result.meanTime < min.meanTime ? result : min
    );
    
    const slowest = results.reduce((max, result) => 
      result.meanTime > max.meanTime ? result : max
    );

    return {
      totalOperations,
      totalDuration,
      avgOpsPerSecond,
      fastest: fastest.name,
      slowest: slowest.name,
      performanceRatio: slowest.meanTime / fastest.meanTime,
    };
  }

  private generateMarkdownReport(exportData: any): string {
    const { systemInfo, results, summary } = exportData;
    
    let report = `# Benchmark Report\n\n`;
    report += `**Generated:** ${exportData.timestamp}\n\n`;
    
    report += `## System Information\n\n`;
    report += `- **Platform:** ${systemInfo.platform} (${systemInfo.arch})\n`;
    report += `- **Node.js:** ${systemInfo.nodeVersion}\n`;
    report += `- **CPU Cores:** ${systemInfo.cpuCount}\n`;
    report += `- **Total Memory:** ${(systemInfo.totalMemory / 1024 / 1024 / 1024).toFixed(2)} GB\n`;
    report += `- **Free Memory:** ${(systemInfo.freeMemory / 1024 / 1024 / 1024).toFixed(2)} GB\n\n`;

    if (summary) {
      report += `## Summary\n\n`;
      report += `- **Total Operations:** ${summary.totalOperations.toLocaleString()}\n`;
      report += `- **Total Duration:** ${summary.totalDuration.toFixed(2)} ms\n`;
      report += `- **Average Ops/Sec:** ${summary.avgOpsPerSecond.toFixed(2)}\n`;
      report += `- **Fastest:** ${summary.fastest}\n`;
      report += `- **Slowest:** ${summary.slowest}\n`;
      report += `- **Performance Ratio:** ${summary.performanceRatio.toFixed(2)}x\n\n`;
    }

    report += `## Results\n\n`;
    report += `| Benchmark | Mean (ms) | Median (ms) | Min (ms) | Max (ms) | Std Dev | Ops/Sec | Memory (MB) |\n`;
    report += `|-----------|-----------|-------------|----------|----------|---------|---------|-------------|\n`;

    for (const result of results) {
      report += `| ${result.name} `;
      report += `| ${result.meanTime.toFixed(3)} `;
      report += `| ${result.medianTime.toFixed(3)} `;
      report += `| ${result.minTime.toFixed(3)} `;
      report += `| ${result.maxTime.toFixed(3)} `;
      report += `| ${result.standardDeviation.toFixed(3)} `;
      report += `| ${result.operationsPerSecond.toFixed(2)} `;
      report += `| ${(result.memoryUsage.used / 1024 / 1024).toFixed(2)} |\n`;
    }

    return report;
  }

  /**
   * Create performance benchmarks for common CLI operations
   */
  createCLIBenchmarkSuite(): BenchmarkSuite {
    const testData = {
      smallJson: JSON.stringify({ test: 'data', count: 100 }),
      largeJson: JSON.stringify(Array.from({ length: 1000 }, (_, i) => ({ id: i, data: 'test'.repeat(100) }))),
      testFiles: ['test1.txt', 'test2.txt', 'test3.txt'],
    };

    return {
      name: 'CLI Operations',
      setup: async () => {
        // Setup test files
        for (const fileName of testData.testFiles) {
          const path = this.fileSystem.join('/tmp', fileName);
          this.fileSystem.writeFile(path, 'test content'.repeat(1000));
        }
      },
      teardown: async () => {
        // Cleanup test files
        for (const fileName of testData.testFiles) {
          const path = this.fileSystem.join('/tmp', fileName);
          if (this.fileSystem.exists(path)) {
            this.fileSystem.unlink(path);
          }
        }
      },
      benchmarks: [
        {
          name: 'JSON Parse (Small)',
          fn: () => JSON.parse(testData.smallJson),
          iterations: 10000,
        },
        {
          name: 'JSON Parse (Large)',
          fn: () => JSON.parse(testData.largeJson),
          iterations: 1000,
        },
        {
          name: 'File System Read',
          fn: async () => {
            const path = this.fileSystem.join('/tmp', testData.testFiles[0]);
            this.fileSystem.readFile(path, 'utf-8');
          },
          iterations: 1000,
        },
        {
          name: 'File System Write',
          fn: async () => {
            const path = this.fileSystem.join('/tmp', `temp-${Math.random()}.txt`);
            this.fileSystem.writeFile(path, 'test content');
            this.fileSystem.unlink(path);
          },
          iterations: 500,
        },
      ],
    };
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }
    this.performanceEntries.clear();
  }
}