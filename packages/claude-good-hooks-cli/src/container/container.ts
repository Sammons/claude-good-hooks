import {
  ConsoleService,
  FileSystemService,
  ProcessService,
  type IConsoleService,
  type IFileSystemService,
  type IProcessService,
} from '../interfaces/index.js';

import {
  SettingsService,
  ModuleService,
  HookService,
  DoctorService,
  PackageService,
  type ISettingsService,
  type IModuleService,
  type IHookService,
  type IDoctorService,
  type IPackageService,
} from '../services/index.js';

import {
  CacheService,
  type ICacheService,
} from '../services/cache.service.js';

import {
  PerformanceService,
  type IPerformanceService,
} from '../services/performance.service.js';

import {
  FileOperationsService,
  type IFileOperationsService,
} from '../services/file-operations.service.js';

import {
  ParallelizationService,
  type IParallelizationService,
} from '../services/parallelization.service.js';

import {
  LazyLoadingService,
  type ILazyLoadingService,
} from '../services/lazy-loading.service.js';

import {
  BenchmarkService,
  type IBenchmarkService,
} from '../services/benchmark.service.js';

/**
 * Simple dependency injection container
 * Provides singleton instances of all services with their dependencies properly injected
 */
export class Container {
  private services = new Map<string, unknown>();

  private getOrCreate<T>(key: string, factory: () => T): T {
    if (!this.services.has(key)) {
      this.services.set(key, factory());
    }
    return this.services.get(key) as T;
  }

  get consoleService(): IConsoleService {
    return this.getOrCreate('consoleService', () => new ConsoleService());
  }

  get fileSystemService(): IFileSystemService {
    return this.getOrCreate('fileSystemService', () => new FileSystemService());
  }

  get processService(): IProcessService {
    return this.getOrCreate('processService', () => new ProcessService());
  }

  get cacheService(): ICacheService {
    return this.getOrCreate(
      'cacheService',
      () => new CacheService(this.fileSystemService)
    );
  }

  get performanceService(): IPerformanceService {
    return this.getOrCreate(
      'performanceService',
      () => new PerformanceService(this.fileSystemService)
    );
  }

  get fileOperationsService(): IFileOperationsService {
    return this.getOrCreate(
      'fileOperationsService',
      () => new FileOperationsService(this.fileSystemService)
    );
  }

  get parallelizationService(): IParallelizationService {
    return this.getOrCreate(
      'parallelizationService',
      () => new ParallelizationService()
    );
  }

  get lazyLoadingService(): ILazyLoadingService {
    return this.getOrCreate(
      'lazyLoadingService',
      () => new LazyLoadingService(this.fileSystemService)
    );
  }

  get benchmarkService(): IBenchmarkService {
    return this.getOrCreate(
      'benchmarkService',
      () => new BenchmarkService(this.fileSystemService)
    );
  }

  get settingsService(): ISettingsService {
    return this.getOrCreate(
      'settingsService',
      () => new SettingsService(this.fileSystemService)
    );
  }

  get moduleService(): IModuleService {
    return this.getOrCreate(
      'moduleService',
      () => new ModuleService(this.fileSystemService, this.processService)
    );
  }

  get hookService(): IHookService {
    return this.getOrCreate(
      'hookService',
      () => new HookService(this.moduleService, this.settingsService)
    );
  }

  get doctorService(): IDoctorService {
    return this.getOrCreate(
      'doctorService',
      () => new DoctorService(this.fileSystemService, this.processService)
    );
  }

  get packageService(): IPackageService {
    return this.getOrCreate(
      'packageService',
      () => new PackageService(this.fileSystemService)
    );
  }

  /**
   * Override a service for testing purposes
   */
  override<T>(key: string, instance: T): void {
    this.services.set(key, instance);
  }

  /**
   * Clear all cached services - useful for testing
   */
  clear(): void {
    this.services.clear();
  }
}