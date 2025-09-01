import type { IFileSystemService } from '../interfaces/index.js';
import { CacheService, MemoizedCache } from './cache.service.js';

export interface PerformanceMetrics {
  operationName: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface PerformanceReport {
  totalOperations: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  percentiles: {
    p50: number;
    p95: number;
    p99: number;
  };
  operationBreakdown: Record<string, {
    count: number;
    averageDuration: number;
    totalDuration: number;
  }>;
}

export interface IPerformanceService {
  startTimer(operationName: string): () => void;
  recordMetric(metric: PerformanceMetrics): void;
  getReport(): PerformanceReport;
  getCache(): CacheService;
  getMemoCache(): MemoizedCache;
  clearMetrics(): void;
  enableProfiling(): void;
  disableProfiling(): void;
  exportMetrics(filePath?: string): Promise<void>;
}

/**
 * Comprehensive performance monitoring and optimization service
 */
export class PerformanceService implements IPerformanceService {
  private metrics: PerformanceMetrics[] = [];
  private cache: CacheService;
  private memoCache: MemoizedCache;
  private profilingEnabled = false;
  private activeTimers = new Map<string, number>();

  constructor(
    private fileSystem: IFileSystemService,
    options: {
      maxMetrics?: number;
      cacheOptions?: {
        maxSize?: number;
        defaultTtl?: number;
        cleanupInterval?: number;
      };
    } = {}
  ) {
    this.cache = new CacheService(fileSystem, options.cacheOptions);
    this.memoCache = new MemoizedCache(fileSystem, {
      ...options.cacheOptions,
      maxSize: options.cacheOptions?.maxSize ?? 500,
    });

    // Limit metrics array size to prevent memory leaks
    const maxMetrics = options.maxMetrics ?? 10000;
    setInterval(() => {
      if (this.metrics.length > maxMetrics) {
        this.metrics = this.metrics.slice(-maxMetrics / 2);
      }
    }, 60000); // Check every minute
  }

  startTimer(operationName: string): () => void {
    const startTime = performance.now();
    const timerId = `${operationName}-${Date.now()}-${Math.random()}`;
    
    this.activeTimers.set(timerId, startTime);
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      this.activeTimers.delete(timerId);
      
      if (this.profilingEnabled) {
        this.recordMetric({
          operationName,
          duration,
          timestamp: Date.now(),
        });
      }
    };
  }

  recordMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);
  }

  getReport(): PerformanceReport {
    if (this.metrics.length === 0) {
      return {
        totalOperations: 0,
        averageDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        percentiles: { p50: 0, p95: 0, p99: 0 },
        operationBreakdown: {},
      };
    }

    const durations = this.metrics.map(m => m.duration).sort((a, b) => a - b);
    const operationBreakdown: Record<string, any> = {};

    // Calculate operation breakdown
    for (const metric of this.metrics) {
      if (!operationBreakdown[metric.operationName]) {
        operationBreakdown[metric.operationName] = {
          count: 0,
          totalDuration: 0,
        };
      }
      operationBreakdown[metric.operationName].count++;
      operationBreakdown[metric.operationName].totalDuration += metric.duration;
    }

    // Calculate averages
    for (const opName in operationBreakdown) {
      const op = operationBreakdown[opName];
      op.averageDuration = op.totalDuration / op.count;
    }

    return {
      totalOperations: this.metrics.length,
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: durations[0],
      maxDuration: durations[durations.length - 1],
      percentiles: {
        p50: durations[Math.floor(durations.length * 0.5)],
        p95: durations[Math.floor(durations.length * 0.95)],
        p99: durations[Math.floor(durations.length * 0.99)],
      },
      operationBreakdown,
    };
  }

  getCache(): CacheService {
    return this.cache;
  }

  getMemoCache(): MemoizedCache {
    return this.memoCache;
  }

  clearMetrics(): void {
    this.metrics = [];
  }

  enableProfiling(): void {
    this.profilingEnabled = true;
  }

  disableProfiling(): void {
    this.profilingEnabled = false;
  }

  async exportMetrics(filePath?: string): Promise<void> {
    const report = this.getReport();
    const cacheStats = this.cache.getStats();
    
    const exportData = {
      timestamp: new Date().toISOString(),
      performanceReport: report,
      cacheStats,
      systemInfo: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        memory: process.memoryUsage(),
      },
      rawMetrics: this.profilingEnabled ? this.metrics : [],
    };

    const outputPath = filePath ?? this.fileSystem.join(
      this.fileSystem.cwd(),
      `performance-report-${Date.now()}.json`
    );

    this.fileSystem.writeFile(
      outputPath,
      JSON.stringify(exportData, null, 2)
    );
  }

  /**
   * Create a performance-optimized version of a function
   */
  optimize<TArgs extends any[], TReturn>(
    fn: (...args: TArgs) => TReturn,
    options: {
      cache?: boolean;
      memoize?: boolean;
      profile?: boolean;
      ttl?: number;
    } = {}
  ): (...args: TArgs) => TReturn {
    let optimizedFn = fn;

    // Add memoization if requested
    if (options.memoize) {
      optimizedFn = this.memoCache.memoize(optimizedFn, { ttl: options.ttl });
    }

    // Add profiling if requested
    if (options.profile || this.profilingEnabled) {
      const originalFn = optimizedFn;
      optimizedFn = (...args: TArgs): TReturn => {
        const stopTimer = this.startTimer(fn.name || 'anonymous');
        try {
          const result = originalFn(...args);
          return result;
        } finally {
          stopTimer();
        }
      };
    }

    return optimizedFn;
  }

  /**
   * Create a performance-optimized version of an async function
   */
  optimizeAsync<TArgs extends any[], TReturn>(
    fn: (...args: TArgs) => Promise<TReturn>,
    options: {
      cache?: boolean;
      memoize?: boolean;
      profile?: boolean;
      ttl?: number;
    } = {}
  ): (...args: TArgs) => Promise<TReturn> {
    let optimizedFn = fn;

    // Add memoization if requested
    if (options.memoize) {
      optimizedFn = this.memoCache.memoizeAsync(optimizedFn, { ttl: options.ttl });
    }

    // Add profiling if requested
    if (options.profile || this.profilingEnabled) {
      const originalFn = optimizedFn;
      optimizedFn = async (...args: TArgs): Promise<TReturn> => {
        const stopTimer = this.startTimer(fn.name || 'anonymous');
        try {
          const result = await originalFn(...args);
          return result;
        } finally {
          stopTimer();
        }
      };
    }

    return optimizedFn;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.cache.destroy();
    this.memoCache.destroy();
    this.clearMetrics();
    this.activeTimers.clear();
  }
}

/**
 * Decorator for automatic performance optimization
 */
export function performanceOptimize(options: {
  cache?: boolean;
  memoize?: boolean;
  profile?: boolean;
  ttl?: number;
} = {}) {
  return function <T extends (...args: any[]) => any>(
    target: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    if (!descriptor.value) return descriptor;

    const originalMethod = descriptor.value;
    
    descriptor.value = function (this: any, ...args: any[]) {
      // Assuming 'this' has a performanceService property
      const perfService = this.performanceService as PerformanceService | undefined;
      
      if (perfService) {
        const optimizedMethod = perfService.optimize(originalMethod.bind(this), options);
        return optimizedMethod(...args);
      }
      
      return originalMethod.apply(this, args);
    } as T;

    return descriptor;
  };
}