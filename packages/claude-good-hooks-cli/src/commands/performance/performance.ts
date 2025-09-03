import type { Container } from '../dependency-injection/dependency-injection.js';

export interface PerformanceCommandOptions {
  output?: string;
  format?: 'json' | 'table' | 'csv';
  verbose?: boolean;
  export?: boolean;
  warmup?: number;
  iterations?: number;
  cache?: boolean;
  parallel?: boolean;
  lazy?: boolean;
  benchmark?: boolean;
  profile?: boolean;
  optimize?: boolean;
}

/**
 * Performance analysis and optimization command
 */
export async function performanceCommand(
  container: Container,
  options: PerformanceCommandOptions = {}
): Promise<void> {
  const performanceService = container.performanceService;
  const benchmarkService = container.benchmarkService;
  const cacheService = container.cacheService;
  const fileOpsService = container.fileOperationsService;
  const parallelService = container.parallelizationService;
  const lazyService = container.lazyLoadingService;

  console.log('🚀 Claude Good Hooks Performance Analysis\n');

  if (options.profile) {
    console.log('📊 Enabling performance profiling...');
    performanceService.enableProfiling();
  }

  // Cache analysis
  if (options.cache) {
    console.log('💾 Cache Analysis:');
    const cacheStats = cacheService.getStats();
    console.log(`  Cache Size: ${cacheStats.size} entries`);
    console.log(`  Hit Rate: ${((cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100).toFixed(2)}%`);
    console.log(`  Hits: ${cacheStats.hits}`);
    console.log(`  Misses: ${cacheStats.misses}`);
    console.log(`  Evictions: ${cacheStats.evictions}`);
    
    // Evict expired entries
    const evicted = cacheService.evictExpired();
    if (evicted > 0) {
      console.log(`  Cleaned up ${evicted} expired entries\n`);
    }
  }

  // Lazy loading analysis
  if (options.lazy) {
    console.log('⚡ Lazy Loading Analysis:');
    const lazyStats = lazyService.getLoadingStats();
    console.log(`  Total Modules: ${lazyStats.totalModules}`);
    console.log(`  Loaded Modules: ${lazyStats.loadedModules}`);
    console.log(`  Memory Usage: ${(lazyStats.memoryUsage / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Loading Efficiency: ${((lazyStats.loadedModules / lazyStats.totalModules) * 100).toFixed(2)}%\n`);
  }

  // Run benchmarks
  if (options.benchmark) {
    console.log('🏁 Running Performance Benchmarks...\n');
    
    const suite = benchmarkService.createCLIBenchmarkSuite();
    const results = await benchmarkService.runSuite(suite);
    
    // Display results
    if (options.format === 'table' || !options.format) {
      console.log('\n📈 Benchmark Results:');
      console.table(results.map(r => ({
        'Test': r.name,
        'Mean (ms)': r.meanTime.toFixed(3),
        'Ops/Sec': r.operationsPerSecond.toFixed(2),
        'Memory (MB)': (r.memoryUsage.used / 1024 / 1024).toFixed(2),
        'Std Dev': r.standardDeviation.toFixed(3),
      })));
    } else if (options.format === 'json') {
      console.log(JSON.stringify(results, null, 2));
    }
    
    if (options.export) {
      await benchmarkService.exportResults(results, options.output);
    }
  }

  // Optimization recommendations
  if (options.optimize) {
    console.log('🔧 Performance Optimization Recommendations:\n');
    
    const recommendations = await generateOptimizationRecommendations(container, options);
    
    for (const recommendation of recommendations) {
      console.log(`${recommendation.priority === 'high' ? '🔴' : recommendation.priority === 'medium' ? '🟡' : '🟢'} ${recommendation.title}`);
      console.log(`   ${recommendation.description}`);
      if (recommendation.action) {
        console.log(`   💡 Action: ${recommendation.action}`);
      }
      console.log();
    }
  }

  // Performance report
  const report = performanceService.getReport();
  if (report.totalOperations > 0) {
    console.log('📊 Performance Report:');
    console.log(`  Total Operations: ${report.totalOperations}`);
    console.log(`  Average Duration: ${report.averageDuration.toFixed(3)}ms`);
    console.log(`  95th Percentile: ${report.percentiles.p95.toFixed(3)}ms`);
    console.log(`  99th Percentile: ${report.percentiles.p99.toFixed(3)}ms`);
    
    if (options.verbose) {
      console.log('\n  Operation Breakdown:');
      for (const [op, stats] of Object.entries(report.operationBreakdown)) {
        console.log(`    ${op}: ${stats.count} ops, ${stats.averageDuration.toFixed(3)}ms avg`);
      }
    }
  }

  if (options.export) {
    const exportData = {
      timestamp: new Date().toISOString(),
      cacheStats: cacheService.getStats(),
      lazyStats: lazyService.getLoadingStats(),
      performanceReport: report,
      systemInfo: benchmarkService.getSystemInfo(),
    };
    
    const outputPath = options.output || `performance-analysis-${Date.now()}.json`;
    container.fileSystemService.writeFile(outputPath, JSON.stringify(exportData, null, 2));
    console.log(`\n📁 Performance data exported to: ${outputPath}`);
  }

  performanceService.disableProfiling();
}

async function generateOptimizationRecommendations(
  container: Container,
  options: PerformanceCommandOptions
): Promise<Array<{
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  action?: string;
}>> {
  const recommendations = [];
  const cacheStats = container.cacheService.getStats();
  const lazyStats = container.lazyLoadingService.getLoadingStats();
  const report = container.performanceService.getReport();

  // Cache recommendations
  if (cacheStats.hits + cacheStats.misses > 0) {
    const hitRate = cacheStats.hits / (cacheStats.hits + cacheStats.misses);
    
    if (hitRate < 0.5) {
      recommendations.push({
        title: 'Low Cache Hit Rate',
        description: `Cache hit rate is ${(hitRate * 100).toFixed(1)}%. Consider adjusting cache TTL or preloading frequently accessed data.`,
        priority: 'high',
        action: 'Run with --cache to analyze cache patterns and adjust TTL settings',
      });
    } else if (hitRate > 0.9 && cacheStats.size < 100) {
      recommendations.push({
        title: 'Increase Cache Size',
        description: 'Excellent hit rate with low cache usage. Consider increasing cache size for better performance.',
        priority: 'low',
        action: 'Increase maxSize in cache configuration',
      });
    }
  }

  // Lazy loading recommendations
  const loadingEfficiency = lazyStats.loadedModules / Math.max(1, lazyStats.totalModules);
  
  if (loadingEfficiency > 0.8) {
    recommendations.push({
      title: 'Consider Eager Loading',
      description: `${(loadingEfficiency * 100).toFixed(1)}% of modules are loaded. Consider eager loading for frequently used modules.`,
      priority: 'medium',
      action: 'Configure preload flags for commonly used commands',
    });
  } else if (loadingEfficiency < 0.3) {
    recommendations.push({
      title: 'Excellent Lazy Loading',
      description: 'Low module loading rate indicates efficient lazy loading strategy.',
      priority: 'low',
    });
  }

  // Performance recommendations
  if (report.totalOperations > 0) {
    if (report.averageDuration > 100) {
      recommendations.push({
        title: 'High Average Operation Duration',
        description: `Average operation takes ${report.averageDuration.toFixed(1)}ms. Consider optimization.`,
        priority: 'high',
        action: 'Enable profiling and identify slow operations',
      });
    }

    if (report.percentiles.p99 > report.percentiles.p95 * 2) {
      recommendations.push({
        title: 'Performance Variance',
        description: 'High variance between 95th and 99th percentiles indicates inconsistent performance.',
        priority: 'medium',
        action: 'Investigate outlier operations and consider optimization',
      });
    }
  }

  // Memory recommendations
  if (lazyStats.memoryUsage > 100 * 1024 * 1024) { // 100MB
    recommendations.push({
      title: 'High Memory Usage',
      description: `Module memory usage is ${(lazyStats.memoryUsage / 1024 / 1024).toFixed(1)}MB. Consider unloading unused modules.`,
      priority: 'medium',
      action: 'Run lazy loading cleanup or reduce module cache size',
    });
  }

  // Add general recommendations if none found
  if (recommendations.length === 0) {
    recommendations.push({
      title: 'Performance Looks Good!',
      description: 'No significant performance issues detected. Consider running benchmarks for detailed analysis.',
      priority: 'low',
      action: 'Run with --benchmark for detailed performance analysis',
    });
  }

  return recommendations.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

/**
 * Cache management command
 */
export async function cacheCommand(
  container: Container,
  action: 'stats' | 'clear' | 'warmup' | 'cleanup',
  options: PerformanceCommandOptions = {}
): Promise<void> {
  const cacheService = container.cacheService;

  switch (action) {
    case 'stats':
      const stats = cacheService.getStats();
      console.log('💾 Cache Statistics:');
      console.log(`  Size: ${stats.size} entries`);
      console.log(`  Hit Rate: ${((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(2)}%`);
      console.log(`  Hits: ${stats.hits}`);
      console.log(`  Misses: ${stats.misses}`);
      console.log(`  Evictions: ${stats.evictions}`);
      break;

    case 'clear':
      cacheService.clear();
      console.log('🗑️  Cache cleared');
      break;

    case 'warmup':
      console.log('🔥 Warming up cache...');
      await cacheService.warmup();
      console.log('✅ Cache warmup complete');
      break;

    case 'cleanup':
      const evicted = cacheService.evictExpired();
      console.log(`🧹 Cleaned up ${evicted} expired entries`);
      break;
  }
}

/**
 * Lazy loading management command
 */
export async function lazyCommand(
  container: Container,
  action: 'stats' | 'preload' | 'unload' | 'strategy',
  options: PerformanceCommandOptions = {}
): Promise<void> {
  const lazyService = container.lazyLoadingService;

  switch (action) {
    case 'stats':
      const stats = lazyService.getLoadingStats();
      console.log('⚡ Lazy Loading Statistics:');
      console.log(`  Total Modules: ${stats.totalModules}`);
      console.log(`  Loaded Modules: ${stats.loadedModules}`);
      console.log(`  Memory Usage: ${(stats.memoryUsage / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  Loading Efficiency: ${((stats.loadedModules / stats.totalModules) * 100).toFixed(2)}%`);
      
      if (options.verbose) {
        console.log('\n  Load Times:');
        for (const [module, time] of Object.entries(stats.loadTimes)) {
          if (time > 0) {
            console.log(`    ${module}: ${time.toFixed(3)}ms`);
          }
        }
        
        console.log('\n  Access Counts:');
        for (const [module, count] of Object.entries(stats.accessCounts)) {
          if (count > 0) {
            console.log(`    ${module}: ${count} accesses`);
          }
        }
      }
      break;

    case 'preload':
      console.log('🔄 Preloading critical modules...');
      await lazyService.preloadCritical();
      console.log('✅ Preload complete');
      break;

    case 'unload':
      const unloaded = await lazyService.unloadUnused();
      console.log(`🗑️  Unloaded ${unloaded} unused modules`);
      break;

    case 'strategy':
      if (options.lazy) {
        lazyService.setLoadingStrategy({ type: 'lazy' });
        console.log('📋 Set loading strategy to: lazy');
      } else if (options.parallel) {
        lazyService.setLoadingStrategy({ type: 'preload', maxConcurrent: 4 });
        console.log('📋 Set loading strategy to: preload (4 concurrent)');
      } else {
        console.log('📋 Available strategies: --lazy, --parallel');
      }
      break;
  }
}