import type { IFileSystemService } from '../interfaces/index.js';

export interface LazyModule<T = any> {
  load(): Promise<T>;
  isLoaded(): boolean;
  unload(): void;
  getSize(): number;
}

export interface LazyCommandDefinition {
  name: string;
  description: string;
  modulePath: string;
  dependencies?: string[];
  preload?: boolean;
  weight?: number; // For prioritizing loading order
}

export interface LazyHookDefinition {
  name: string;
  events: string[];
  modulePath: string;
  dependencies?: string[];
  priority?: number;
}

export interface LoadingStrategy {
  type: 'eager' | 'lazy' | 'preload' | 'progressive';
  maxConcurrent?: number;
  preloadThreshold?: number;
  progressiveChunks?: number;
}

export interface ILazyLoadingService {
  registerCommand(definition: LazyCommandDefinition): void;
  registerHook(definition: LazyHookDefinition): void;
  loadCommand(name: string): Promise<any>;
  loadHook(name: string): Promise<any>;
  preloadCritical(): Promise<void>;
  unloadUnused(): Promise<number>;
  getLoadingStats(): LoadingStats;
  setLoadingStrategy(strategy: LoadingStrategy): void;
}

export interface LoadingStats {
  totalModules: number;
  loadedModules: number;
  memoryUsage: number;
  loadTimes: Record<string, number>;
  accessCounts: Record<string, number>;
}

/**
 * Lazy module loader with caching and dependency resolution
 */
class LazyModuleLoader<T> implements LazyModule<T> {
  private module: T | null = null;
  private loading: Promise<T> | null = null;
  private loadTime = 0;
  private accessCount = 0;
  private size = 0;

  constructor(
    private modulePath: string,
    private loader: () => Promise<T>,
    private onUnload?: () => void
  ) {}

  async load(): Promise<T> {
    if (this.module) {
      this.accessCount++;
      return this.module;
    }

    if (this.loading) {
      return this.loading;
    }

    const startTime = Date.now();
    this.loading = this.loader().then(module => {
      this.module = module;
      this.loadTime = Date.now() - startTime;
      this.accessCount++;
      this.loading = null;
      
      // Estimate module size
      try {
        this.size = JSON.stringify(module).length;
      } catch {
        this.size = 1024; // Fallback estimate
      }
      
      return module;
    });

    return this.loading;
  }

  isLoaded(): boolean {
    return this.module !== null;
  }

  unload(): void {
    if (this.module && this.onUnload) {
      this.onUnload();
    }
    this.module = null;
    this.loading = null;
  }

  getSize(): number {
    return this.size;
  }

  getAccessCount(): number {
    return this.accessCount;
  }

  getLoadTime(): number {
    return this.loadTime;
  }
}

/**
 * Comprehensive lazy loading service with progressive enhancement
 */
export class LazyLoadingService implements ILazyLoadingService {
  private commands = new Map<string, LazyCommandDefinition>();
  private hooks = new Map<string, LazyHookDefinition>();
  private moduleLoaders = new Map<string, LazyModuleLoader<any>>();
  private dependencyGraph = new Map<string, Set<string>>();
  private loadingStrategy: LoadingStrategy = { type: 'lazy' };
  private preloadPromises = new Map<string, Promise<void>>();

  constructor(private fileSystem: IFileSystemService) {}

  registerCommand(definition: LazyCommandDefinition): void {
    this.commands.set(definition.name, definition);
    this.createModuleLoader(definition.name, definition.modulePath, definition.dependencies);
    
    if (definition.preload) {
      this.schedulePreload(definition.name, definition.weight ?? 0);
    }
  }

  registerHook(definition: LazyHookDefinition): void {
    this.hooks.set(definition.name, definition);
    this.createModuleLoader(definition.name, definition.modulePath, definition.dependencies);
  }

  private createModuleLoader(name: string, modulePath: string, dependencies?: string[]): void {
    if (this.moduleLoaders.has(name)) {
      return; // Already registered
    }

    const loader = async () => {
      // Load dependencies first
      if (dependencies && dependencies.length > 0) {
        await this.loadDependencies(dependencies);
      }

      // Resolve module path
      const resolvedPath = this.resolvePath(modulePath);
      
      // Dynamic import with error handling
      try {
        const module = await import(resolvedPath);
        return module.default || module;
      } catch (error) {
        throw new Error(`Failed to load module ${name} from ${resolvedPath}: ${error}`);
      }
    };

    const moduleLoader = new LazyModuleLoader(modulePath, loader, () => {
      // Cleanup logic when module is unloaded
      delete require.cache[require.resolve(modulePath)];
    });

    this.moduleLoaders.set(name, moduleLoader);
    
    // Build dependency graph
    if (dependencies) {
      this.dependencyGraph.set(name, new Set(dependencies));
    }
  }

  private async loadDependencies(dependencies: string[]): Promise<void> {
    const dependencyPromises = dependencies.map(async (dep) => {
      const loader = this.moduleLoaders.get(dep);
      if (loader && !loader.isLoaded()) {
        await loader.load();
      }
    });

    await Promise.all(dependencyPromises);
  }

  private resolvePath(modulePath: string): string {
    if (modulePath.startsWith('./') || modulePath.startsWith('../')) {
      return this.fileSystem.resolve(modulePath);
    }
    if (modulePath.startsWith('/')) {
      return modulePath;
    }
    
    // Try to resolve relative to current working directory
    const resolvedPath = this.fileSystem.join(this.fileSystem.cwd(), modulePath);
    if (this.fileSystem.exists(resolvedPath)) {
      return resolvedPath;
    }
    
    // Fallback to original path (might be a node module)
    return modulePath;
  }

  async loadCommand(name: string): Promise<any> {
    const loader = this.moduleLoaders.get(name);
    if (!loader) {
      throw new Error(`Command ${name} not registered`);
    }

    return loader.load();
  }

  async loadHook(name: string): Promise<any> {
    const loader = this.moduleLoaders.get(name);
    if (!loader) {
      throw new Error(`Hook ${name} not registered`);
    }

    return loader.load();
  }

  private schedulePreload(name: string, weight: number): void {
    if (this.preloadPromises.has(name)) {
      return;
    }

    const preloadPromise = new Promise<void>((resolve) => {
      // Delay preload based on weight (lower weight = higher priority = less delay)
      const delay = Math.max(0, (weight - 1) * 100);
      
      setTimeout(async () => {
        try {
          await this.loadCommand(name);
        } catch (error) {
          console.error(`Failed to preload ${name}:`, error);
        } finally {
          resolve();
        }
      }, delay);
    });

    this.preloadPromises.set(name, preloadPromise);
  }

  async preloadCritical(): Promise<void> {
    const strategy = this.loadingStrategy;
    
    if (strategy.type === 'eager') {
      // Load everything immediately
      const allPromises = Array.from(this.moduleLoaders.entries()).map(([name, loader]) =>
        loader.load().catch(error => console.error(`Failed to eagerly load ${name}:`, error))
      );
      await Promise.all(allPromises);
      return;
    }

    if (strategy.type === 'preload') {
      // Load based on preload flags and weights
      const preloadCommands = Array.from(this.commands.entries())
        .filter(([_, def]) => def.preload)
        .sort((a, b) => (a[1].weight ?? Infinity) - (b[1].weight ?? Infinity));

      const maxConcurrent = strategy.maxConcurrent ?? 3;
      const batches = this.chunkArray(preloadCommands, maxConcurrent);

      for (const batch of batches) {
        await Promise.all(
          batch.map(([name, _]) =>
            this.loadCommand(name).catch(error =>
              console.error(`Failed to preload ${name}:`, error)
            )
          )
        );
      }
      return;
    }

    if (strategy.type === 'progressive') {
      // Load in progressive chunks
      const allModules = Array.from(this.moduleLoaders.keys());
      const chunkSize = Math.ceil(allModules.length / (strategy.progressiveChunks ?? 3));
      const chunks = this.chunkArray(allModules, chunkSize);

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        setTimeout(() => {
          Promise.all(
            chunk.map(name =>
              this.moduleLoaders.get(name)?.load().catch(error =>
                console.error(`Failed to progressively load ${name}:`, error)
              )
            )
          );
        }, i * 1000); // 1 second between chunks
      }
    }

    // For 'lazy' type, wait for existing preload promises
    await Promise.all(this.preloadPromises.values());
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  async unloadUnused(): Promise<number> {
    let unloadedCount = 0;
    const threshold = Date.now() - (5 * 60 * 1000); // 5 minutes ago

    for (const [name, loader] of this.moduleLoaders.entries()) {
      if (loader.isLoaded()) {
        const lastAccess = loader.getAccessCount();
        const loadTime = loader.getLoadTime();
        
        // Unload if not accessed recently and not critical
        const commandDef = this.commands.get(name);
        const hookDef = this.hooks.get(name);
        
        const isCritical = commandDef?.preload || (hookDef?.priority ?? 0) > 5;
        const isUnused = lastAccess < 2 && (Date.now() - loadTime) > threshold;
        
        if (!isCritical && isUnused) {
          loader.unload();
          unloadedCount++;
        }
      }
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    return unloadedCount;
  }

  getLoadingStats(): LoadingStats {
    const stats: LoadingStats = {
      totalModules: this.moduleLoaders.size,
      loadedModules: 0,
      memoryUsage: 0,
      loadTimes: {},
      accessCounts: {},
    };

    for (const [name, loader] of this.moduleLoaders.entries()) {
      if (loader.isLoaded()) {
        stats.loadedModules++;
        stats.memoryUsage += loader.getSize();
      }
      stats.loadTimes[name] = loader.getLoadTime();
      stats.accessCounts[name] = loader.getAccessCount();
    }

    return stats;
  }

  setLoadingStrategy(strategy: LoadingStrategy): void {
    this.loadingStrategy = strategy;
  }

  /**
   * Create a lazy-loaded proxy for a module
   */
  createLazyProxy<T extends object>(name: string): T {
    const loader = this.moduleLoaders.get(name);
    if (!loader) {
      throw new Error(`Module ${name} not registered`);
    }

    return new Proxy({} as T, {
      get: (target, prop, receiver) => {
        if (typeof prop === 'string') {
          // Load the module synchronously if possible (if already loaded)
          if (loader.isLoaded()) {
            const module = loader.load();
            return Reflect.get(module, prop, receiver);
          }

          // Return a promise-based accessor for lazy loading
          return async (...args: any[]) => {
            const module = await loader.load();
            const value = Reflect.get(module, prop, receiver);
            if (typeof value === 'function') {
              return value.apply(module, args);
            }
            return value;
          };
        }
        
        return undefined;
      },
      
      has: (target, prop) => {
        if (loader.isLoaded()) {
          const module = loader.load();
          return Reflect.has(module, prop);
        }
        // For lazy modules, assume the property might exist
        return true;
      }
    });
  }

  /**
   * Decorator for lazy loading methods
   */
  static lazyMethod(moduleName: string, service: LazyLoadingService) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
      const originalMethod = descriptor.value;
      
      descriptor.value = async function (...args: any[]) {
        const module = await service.loadCommand(moduleName);
        if (module && typeof module[propertyKey] === 'function') {
          return module[propertyKey].apply(module, args);
        }
        return originalMethod?.apply(this, args);
      };
    };
  }

  /**
   * Clean up all resources
   */
  destroy(): void {
    // Unload all modules
    for (const loader of this.moduleLoaders.values()) {
      loader.unload();
    }
    
    this.commands.clear();
    this.hooks.clear();
    this.moduleLoaders.clear();
    this.dependencyGraph.clear();
    this.preloadPromises.clear();
  }
}

/**
 * Utility for progressive module registration
 */
export class ProgressiveRegistry {
  private registrations: Array<() => Promise<void>> = [];
  private processing = false;

  constructor(private lazyLoader: LazyLoadingService) {}

  queueCommand(definition: LazyCommandDefinition): void {
    this.registrations.push(async () => {
      this.lazyLoader.registerCommand(definition);
    });
    this.processQueue();
  }

  queueHook(definition: LazyHookDefinition): void {
    this.registrations.push(async () => {
      this.lazyLoader.registerHook(definition);
    });
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.registrations.length === 0) {
      return;
    }

    this.processing = true;

    try {
      while (this.registrations.length > 0) {
        const registration = this.registrations.shift();
        if (registration) {
          await registration();
        }
        
        // Yield control to prevent blocking
        await new Promise(resolve => setImmediate(resolve));
      }
    } finally {
      this.processing = false;
    }
  }

  async flush(): Promise<void> {
    await this.processQueue();
  }
}