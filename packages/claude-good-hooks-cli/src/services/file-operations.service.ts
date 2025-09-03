import {
  createReadStream,
  createWriteStream,
  type ReadStream,
  type WriteStream,
  type FSWatcher,
} from 'fs';
import { pipeline } from 'stream/promises';
import { Transform } from 'stream';
import { FileSystemService } from './file-system.service.js';

// Type guard for Error instances
function isError(error: unknown): error is Error {
  return error instanceof Error;
}

// Convert unknown error to Error
function toError(error: unknown): Error {
  if (isError(error)) {
    return error;
  }
  if (typeof error === 'string') {
    return new Error(error);
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return new Error(String(error.message));
  }
  return new Error(`Unknown error: ${String(error)}`);
}

export interface BatchOperation {
  type: 'read' | 'write' | 'delete' | 'copy' | 'move';
  source: string;
  destination?: string;
  content?: string;
  encoding?: BufferEncoding;
}

export interface BatchResult {
  success: boolean;
  operation: BatchOperation;
  error?: Error;
  result?: unknown;
}

export interface StreamOptions {
  encoding?: BufferEncoding;
  highWaterMark?: number;
  objectMode?: boolean;
}

type StreamExecutor = (op: BatchOperation) => Promise<unknown>;

/**
 * High-performance file operations service with batching, streaming, and debouncing
 */
export class FileOperationsService {
  private writeTimeouts = new Map<string, ReturnType<typeof globalThis.setTimeout>>();
  private pendingWrites = new Map<
    string,
    { content: string; resolve: () => void; reject: (error: Error) => void }[]
  >();
  private watchers = new Map<string, FSWatcher>();
  private fileSystem = new FileSystemService();

  constructor() {}

  async batchOperations(operations: BatchOperation[]): Promise<BatchResult[]> {
    // Group operations by type for optimal execution order
    const readOps = operations.filter(op => op.type === 'read');
    const writeOps = operations.filter(op => op.type === 'write');
    const deleteOps = operations.filter(op => op.type === 'delete');
    const copyOps = operations.filter(op => op.type === 'copy');
    const moveOps = operations.filter(op => op.type === 'move');

    const results: BatchResult[] = [];

    // Execute operations in parallel within each type
    const executeOperations = async (ops: BatchOperation[], executor: StreamExecutor) => {
      const promises = ops.map(async operation => {
        try {
          const result = await executor(operation);
          return { success: true, operation, result };
        } catch (error: unknown) {
          return { success: false, operation, error: toError(error) };
        }
      });
      return Promise.all(promises);
    };

    // Execute reads first (they don't modify anything)
    if (readOps.length > 0) {
      const readResults = await executeOperations(readOps, async op => {
        return this.fileSystem.readFile(op.source, op.encoding || 'utf-8');
      });
      results.push(...readResults);
    }

    // Execute writes
    if (writeOps.length > 0) {
      const writeResults = await executeOperations(writeOps, async op => {
        if (!op.content) throw new Error('Write operation requires content');
        const dir = this.fileSystem.dirname(op.source);
        if (!this.fileSystem.exists(dir)) {
          this.fileSystem.mkdir(dir, { recursive: true });
        }
        this.fileSystem.writeFile(op.source, op.content, op.encoding);
        return true;
      });
      results.push(...writeResults);
    }

    // Execute copies
    if (copyOps.length > 0) {
      const copyResults = await executeOperations(copyOps, async op => {
        if (!op.destination) throw new Error('Copy operation requires destination');
        await this.streamCopy(op.source, op.destination);
        return true;
      });
      results.push(...copyResults);
    }

    // Execute moves
    if (moveOps.length > 0) {
      const moveResults = await executeOperations(moveOps, async op => {
        if (!op.destination) throw new Error('Move operation requires destination');
        await this.streamCopy(op.source, op.destination);
        this.fileSystem.unlink(op.source);
        return true;
      });
      results.push(...moveResults);
    }

    // Execute deletes last
    if (deleteOps.length > 0) {
      const deleteResults = await executeOperations(deleteOps, async op => {
        if (this.fileSystem.exists(op.source)) {
          const stats = this.fileSystem.stat(op.source);
          if (stats.isDirectory()) {
            this.fileSystem.rmdir(op.source, { recursive: true });
          } else {
            this.fileSystem.unlink(op.source);
          }
        }
        return true;
      });
      results.push(...deleteResults);
    }

    // Sort results back to original operation order
    const originalOrder = new Map(operations.map((op, index) => [op, index]));
    results.sort((a, b) => {
      const aIndex = originalOrder.get(a.operation) ?? Infinity;
      const bIndex = originalOrder.get(b.operation) ?? Infinity;
      return aIndex - bIndex;
    });

    return results;
  }

  createReadStreamOptimized(filePath: string, options: StreamOptions = {}): ReadStream {
    const defaultOptions = {
      encoding: options.encoding as BufferEncoding,
      highWaterMark: options.highWaterMark ?? 64 * 1024, // 64KB chunks
      objectMode: options.objectMode ?? false,
    };

    return createReadStream(filePath, defaultOptions);
  }

  createWriteStreamOptimized(filePath: string, options: StreamOptions = {}): WriteStream {
    // Ensure directory exists
    const dir = this.fileSystem.dirname(filePath);
    if (!this.fileSystem.exists(dir)) {
      this.fileSystem.mkdir(dir, { recursive: true });
    }

    const defaultOptions = {
      encoding: options.encoding as BufferEncoding,
      highWaterMark: options.highWaterMark ?? 64 * 1024, // 64KB chunks
      objectMode: options.objectMode ?? false,
    };

    return createWriteStream(filePath, defaultOptions);
  }

  async streamCopy(source: string, destination: string): Promise<void> {
    const readStream = this.createReadStreamOptimized(source);
    const writeStream = this.createWriteStreamOptimized(destination);

    try {
      await pipeline(readStream, writeStream);
    } catch (error) {
      // Clean up partial file on error
      if (this.fileSystem.exists(destination)) {
        try {
          this.fileSystem.unlink(destination);
        } catch {
          // Ignore cleanup errors
        }
      }
      throw error;
    }
  }

  async streamProcessFile<T>(
    filePath: string,
    processor: Transform,
    outputPath?: string
  ): Promise<T> {
    const readStream = this.createReadStreamOptimized(filePath);

    if (outputPath) {
      const writeStream = this.createWriteStreamOptimized(outputPath);
      await pipeline(readStream, processor, writeStream);
      return undefined as T;
    } else {
      // Collect processed data
      const chunks: unknown[] = [];
      const collector = new Transform({
        objectMode: true,
        transform(chunk, encoding, callback) {
          chunks.push(chunk);
          callback();
        },
      });

      await pipeline(readStream, processor, collector);
      return chunks as T;
    }
  }

  async debouncedWrite(filePath: string, content: string, delay = 500): Promise<void> {
    return new Promise((resolve, reject) => {
      // Clear existing timeout for this file
      const existingTimeout = this.writeTimeouts.get(filePath);
      if (existingTimeout) {
        globalThis.clearTimeout(existingTimeout);
      }

      // Add to pending writes
      if (!this.pendingWrites.has(filePath)) {
        this.pendingWrites.set(filePath, []);
      }
      this.pendingWrites.get(filePath)!.push({ content, resolve, reject });

      // Set new timeout
      const timeout = globalThis.setTimeout(async () => {
        const pending = this.pendingWrites.get(filePath) || [];
        this.pendingWrites.delete(filePath);
        this.writeTimeouts.delete(filePath);

        if (pending.length === 0) return;

        // Use the latest content
        const latest = pending[pending.length - 1];

        try {
          const dir = this.fileSystem.dirname(filePath);
          if (!this.fileSystem.exists(dir)) {
            this.fileSystem.mkdir(dir, { recursive: true });
          }

          this.fileSystem.writeFile(filePath, latest.content);

          // Resolve all pending promises
          for (const p of pending) {
            p.resolve();
          }
        } catch (error: unknown) {
          // Reject all pending promises
          const errorObj = toError(error);
          for (const p of pending) {
            p.reject(errorObj);
          }
        }
      }, delay);

      this.writeTimeouts.set(filePath, timeout);
    });
  }

  watchDirectory(
    dirPath: string,
    callback: (event: string, filename: string) => void,
    options: { recursive?: boolean; debounce?: number } = {}
  ): () => void {
    const watchKey = `${dirPath}:${options.recursive}`;
    const debounceDelay = options.debounce ?? 100;
    const debouncedCallbacks = new Map<string, ReturnType<typeof globalThis.setTimeout>>();

    // Ensure directory exists
    if (!this.fileSystem.exists(dirPath)) {
      this.fileSystem.mkdir(dirPath, { recursive: true });
    }

    const watcher = this.fileSystem.watch(
      dirPath,
      { recursive: options.recursive, persistent: false },
      (eventType, filename) => {
        if (!filename) return;

        const callbackKey = `${eventType}:${filename}`;

        // Clear existing debounce timeout
        const existingTimeout = debouncedCallbacks.get(callbackKey);
        if (existingTimeout) {
          globalThis.clearTimeout(existingTimeout);
        }

        // Set new debounce timeout
        const timeout = globalThis.setTimeout(() => {
          debouncedCallbacks.delete(callbackKey);
          try {
            callback(
              eventType,
              typeof filename === 'string' ? filename : filename?.toString() || ''
            );
          } catch (error) {
            console.error('Error in directory watch callback:', error);
          }
        }, debounceDelay);

        debouncedCallbacks.set(callbackKey, timeout);
      }
    );

    this.watchers.set(watchKey, watcher);

    // Return cleanup function
    return () => {
      // Clear all debounce timeouts
      for (const timeout of Array.from(debouncedCallbacks.values())) {
        globalThis.clearTimeout(timeout);
      }
      debouncedCallbacks.clear();

      // Close watcher
      if (this.watchers.has(watchKey)) {
        watcher.close();
        this.watchers.delete(watchKey);
      }
    };
  }

  /**
   * Clean up all pending operations and watchers
   */
  destroy(): void {
    // Clear all write timeouts
    for (const timeout of Array.from(this.writeTimeouts.values())) {
      globalThis.clearTimeout(timeout);
    }
    this.writeTimeouts.clear();

    // Reject all pending writes
    for (const pending of Array.from(this.pendingWrites.values())) {
      for (const p of pending) {
        p.reject(new Error('FileOperationsService destroyed'));
      }
    }
    this.pendingWrites.clear();

    // Close all watchers
    for (const watcher of Array.from(this.watchers.values())) {
      watcher.close();
    }
    this.watchers.clear();
  }
}

/**
 * Utility transform streams for common file processing tasks
 */
export class FileProcessingStreams {
  /**
   * Transform stream that processes JSON objects line by line
   */
  static jsonLineProcessor(): Transform {
    return new Transform({
      objectMode: true,
      transform(chunk: Buffer, encoding, callback) {
        try {
          const lines = chunk.toString().split('\n');
          const results = lines.filter(line => line.trim()).map(line => JSON.parse(line));

          for (const result of results) {
            this.push(result);
          }
          callback();
        } catch (error: unknown) {
          callback(toError(error));
        }
      },
    });
  }

  /**
   * Transform stream that filters lines based on a predicate
   */
  static lineFilter(predicate: (line: string) => boolean): Transform {
    return new Transform({
      transform(chunk: Buffer, encoding, callback) {
        const lines = chunk.toString().split('\n');
        const filtered = lines.filter(predicate).join('\n');
        callback(null, filtered);
      },
    });
  }

  /**
   * Transform stream that batches data into chunks
   */
  static batcher<T>(batchSize: number): Transform {
    let batch: T[] = [];

    return new Transform({
      objectMode: true,
      transform(chunk: T, encoding, callback) {
        batch.push(chunk);

        if (batch.length >= batchSize) {
          callback(null, batch);
          batch = [];
        } else {
          callback();
        }
      },
      flush(callback) {
        if (batch.length > 0) {
          callback(null, batch);
        } else {
          callback();
        }
      },
    });
  }
}
