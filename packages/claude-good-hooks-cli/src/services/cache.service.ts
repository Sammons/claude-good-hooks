import type { ClaudeSettings } from '@sammons/claude-good-hooks-types';
import type { IFileSystemService } from '../interfaces/index.js';

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
  key: string;
}

export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
}

export interface ICacheService {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, ttl?: number): void;
  has(key: string): boolean;
  delete(key: string): boolean;
  clear(): void;
  getStats(): CacheStats;
  evictExpired(): number;
  warmup(): Promise<void>;
}

/**
 * High-performance in-memory cache with TTL support
 * Optimized for CLI usage patterns with automatic cleanup
 */
export class CacheService implements ICacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private stats: CacheStats = { hits: 0, misses: 0, evictions: 0, size: 0 };
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly maxSize: number;
  private readonly defaultTtl: number;

  constructor(
    private fileSystem: IFileSystemService,
    options: {
      maxSize?: number;
      defaultTtl?: number;
      cleanupInterval?: number;
    } = {}
  ) {
    this.maxSize = options.maxSize ?? 1000;
    this.defaultTtl = options.defaultTtl ?? 5 * 60 * 1000; // 5 minutes

    // Start automatic cleanup
    this.cleanupInterval = setInterval(
      () => this.evictExpired(),
      options.cleanupInterval ?? 30000 // 30 seconds
    );
  }

  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    // Check if expired
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      this.stats.evictions++;
      this.stats.misses++;
      return undefined;
    }

    this.stats.hits++;
    return entry.value;
  }

  set<T>(key: string, value: T, ttl?: number): void {
    // Evict LRU if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      ttl: ttl ?? this.defaultTtl,
      key,
    };

    this.cache.set(key, entry);
    this.updateSize();
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    // Check if expired
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      this.stats.evictions++;
      return false;
    }
    
    return true;
  }

  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.updateSize();
    }
    return deleted;
  }

  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, evictions: 0, size: 0 };
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  evictExpired(): number {
    const now = Date.now();
    let evicted = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key);
        evicted++;
      }
    }

    this.stats.evictions += evicted;
    this.updateSize();
    return evicted;
  }

  private evictLRU(): void {
    const oldestKey = this.cache.keys().next().value;
    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  private updateSize(): void {
    this.stats.size = this.cache.size;
  }

  /**
   * Warm up cache with commonly accessed data
   */
  async warmup(): Promise<void> {
    // Pre-cache settings files that are likely to be accessed
    const settingsPaths = [
      this.fileSystem.join(this.fileSystem.homedir(), '.claude', 'settings.json'),
      this.fileSystem.join(this.fileSystem.cwd(), '.claude', 'settings.json'),
      this.fileSystem.join(this.fileSystem.cwd(), '.claude', 'settings.local.json'),
    ];

    for (const path of settingsPaths) {
      if (this.fileSystem.exists(path)) {
        try {
          const content = this.fileSystem.readFile(path, 'utf-8');
          const settings = JSON.parse(content);
          this.set(`settings:${path}`, settings, 2 * 60 * 1000); // 2 minute TTL for settings
        } catch (error) {
          // Ignore parsing errors during warmup
        }
      }
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

/**
 * Specialized cache for memoizing function results
 */
export class MemoizedCache extends CacheService {
  /**
   * Memoize a function with automatic cache key generation
   */
  memoize<TArgs extends any[], TReturn>(
    fn: (...args: TArgs) => TReturn,
    options: {
      keyGenerator?: (...args: TArgs) => string;
      ttl?: number;
    } = {}
  ): (...args: TArgs) => TReturn {
    const keyGen = options.keyGenerator ?? ((...args) => JSON.stringify(args));
    
    return (...args: TArgs): TReturn => {
      const key = `memo:${fn.name}:${keyGen(...args)}`;
      
      let result = this.get<TReturn>(key);
      if (result === undefined) {
        result = fn(...args);
        this.set(key, result, options.ttl);
      }
      
      return result;
    };
  }

  /**
   * Memoize an async function
   */
  memoizeAsync<TArgs extends any[], TReturn>(
    fn: (...args: TArgs) => Promise<TReturn>,
    options: {
      keyGenerator?: (...args: TArgs) => string;
      ttl?: number;
    } = {}
  ): (...args: TArgs) => Promise<TReturn> {
    const keyGen = options.keyGenerator ?? ((...args) => JSON.stringify(args));
    const pendingPromises = new Map<string, Promise<TReturn>>();
    
    return async (...args: TArgs): Promise<TReturn> => {
      const key = `async:${fn.name}:${keyGen(...args)}`;
      
      // Check cache first
      let result = this.get<TReturn>(key);
      if (result !== undefined) {
        return result;
      }
      
      // Check if there's already a pending promise for this key
      let promise = pendingPromises.get(key);
      if (promise) {
        return promise;
      }
      
      // Create new promise and cache it
      promise = fn(...args).then(result => {
        this.set(key, result, options.ttl);
        pendingPromises.delete(key);
        return result;
      }).catch(error => {
        pendingPromises.delete(key);
        throw error;
      });
      
      pendingPromises.set(key, promise);
      return promise;
    };
  }
}