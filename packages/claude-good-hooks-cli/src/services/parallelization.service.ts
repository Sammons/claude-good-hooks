import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { cpus } from 'os';

export interface WorkerTask<TInput = any, TOutput = any> {
  id: string;
  data: TInput;
  handler: string; // Function name or path to worker script
  timeout?: number;
}

export interface WorkerResult<TOutput = any> {
  id: string;
  success: boolean;
  result?: TOutput;
  error?: Error;
  duration: number;
}

export interface WorkerPoolOptions {
  maxWorkers?: number;
  idleTimeout?: number;
  taskTimeout?: number;
  retries?: number;
}

export interface IParallelizationService {
  executeInWorker<TInput, TOutput>(
    handler: string,
    data: TInput,
    timeout?: number
  ): Promise<TOutput>;
  
  executeBatch<TInput, TOutput>(
    tasks: WorkerTask<TInput, TOutput>[]
  ): Promise<WorkerResult<TOutput>[]>;
  
  executeParallel<T>(
    items: T[],
    processor: (item: T, index: number) => Promise<any>,
    concurrency?: number
  ): Promise<any[]>;
  
  createWorkerPool(options?: WorkerPoolOptions): WorkerPool;
  shutdown(): Promise<void>;
}

/**
 * Worker pool for efficient task execution
 */
export class WorkerPool {
  private workers: Worker[] = [];
  private availableWorkers: Worker[] = [];
  private taskQueue: Array<{
    task: WorkerTask;
    resolve: (result: any) => void;
    reject: (error: Error) => void;
  }> = [];
  private activeTaskCount = 0;
  private idleTimeouts = new Map<Worker, NodeJS.Timeout>();

  constructor(private options: WorkerPoolOptions = {}) {
    this.options = {
      maxWorkers: options.maxWorkers ?? Math.max(1, cpus().length - 1),
      idleTimeout: options.idleTimeout ?? 30000, // 30 seconds
      taskTimeout: options.taskTimeout ?? 60000, // 1 minute
      retries: options.retries ?? 2,
      ...options,
    };
  }

  async execute<TInput, TOutput>(task: WorkerTask<TInput, TOutput>): Promise<TOutput> {
    return new Promise((resolve, reject) => {
      this.taskQueue.push({
        task,
        resolve,
        reject: (error) => {
          // Implement retry logic
          const retries = this.options.retries ?? 0;
          if (retries > 0) {
            this.executeWithRetries(task, retries)
              .then(resolve)
              .catch(reject);
          } else {
            reject(error);
          }
        },
      });
      
      this.processQueue();
    });
  }

  private async executeWithRetries<TInput, TOutput>(
    task: WorkerTask<TInput, TOutput>,
    retries: number
  ): Promise<TOutput> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await new Promise<TOutput>((resolve, reject) => {
          this.taskQueue.push({ task, resolve, reject });
          this.processQueue();
        });
      } catch (error) {
        if (attempt === retries) {
          throw error;
        }
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt)));
      }
    }
    throw new Error('Max retries exceeded');
  }

  private processQueue(): void {
    while (this.taskQueue.length > 0 && this.availableWorkers.length > 0) {
      const { task, resolve, reject } = this.taskQueue.shift()!;
      const worker = this.availableWorkers.pop()!;
      
      this.clearIdleTimeout(worker);
      this.executeTaskOnWorker(worker, task, resolve, reject);
    }

    // Create new workers if needed
    if (
      this.taskQueue.length > 0 &&
      this.workers.length < (this.options.maxWorkers ?? 4)
    ) {
      this.createWorker();
    }
  }

  private createWorker(): Worker {
    const worker = new Worker(__filename, {
      workerData: { isWorkerThread: true }
    });

    worker.on('message', (message) => {
      // Handle worker messages
      if (message.type === 'task-complete') {
        this.handleTaskComplete(worker, message);
      }
    });

    worker.on('error', (error) => {
      console.error('Worker error:', error);
      this.removeWorker(worker);
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        console.error(`Worker exited with code ${code}`);
      }
      this.removeWorker(worker);
    });

    this.workers.push(worker);
    this.availableWorkers.push(worker);
    
    return worker;
  }

  private executeTaskOnWorker(
    worker: Worker,
    task: WorkerTask,
    resolve: (result: any) => void,
    reject: (error: Error) => void
  ): void {
    const timeout = task.timeout ?? this.options.taskTimeout ?? 60000;
    let timeoutHandle: NodeJS.Timeout | null = null;
    let completed = false;

    const completeTask = (success: boolean, result?: any, error?: Error) => {
      if (completed) return;
      completed = true;
      
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
      
      this.activeTaskCount--;
      this.availableWorkers.push(worker);
      this.setIdleTimeout(worker);
      
      if (success && result !== undefined) {
        resolve(result);
      } else {
        reject(error || new Error('Task failed'));
      }
      
      // Process next task
      this.processQueue();
    };

    // Set timeout
    timeoutHandle = setTimeout(() => {
      completeTask(false, undefined, new Error(`Task ${task.id} timed out after ${timeout}ms`));
    }, timeout);

    // Set up message handler for this specific task
    const messageHandler = (message: any) => {
      if (message.taskId === task.id) {
        worker.off('message', messageHandler);
        completeTask(message.success, message.result, message.error);
      }
    };

    worker.on('message', messageHandler);
    
    // Send task to worker
    this.activeTaskCount++;
    worker.postMessage({
      type: 'execute-task',
      taskId: task.id,
      handler: task.handler,
      data: task.data,
    });
  }

  private handleTaskComplete(worker: Worker, message: any): void {
    // This is handled by the specific message handler in executeTaskOnWorker
  }

  private setIdleTimeout(worker: Worker): void {
    const timeout = setTimeout(() => {
      if (this.availableWorkers.includes(worker)) {
        this.removeWorker(worker);
      }
    }, this.options.idleTimeout ?? 30000);
    
    this.idleTimeouts.set(worker, timeout);
  }

  private clearIdleTimeout(worker: Worker): void {
    const timeout = this.idleTimeouts.get(worker);
    if (timeout) {
      clearTimeout(timeout);
      this.idleTimeouts.delete(worker);
    }
  }

  private removeWorker(worker: Worker): void {
    const workerIndex = this.workers.indexOf(worker);
    if (workerIndex > -1) {
      this.workers.splice(workerIndex, 1);
    }
    
    const availableIndex = this.availableWorkers.indexOf(worker);
    if (availableIndex > -1) {
      this.availableWorkers.splice(availableIndex, 1);
    }
    
    this.clearIdleTimeout(worker);
    
    worker.terminate();
  }

  async shutdown(): Promise<void> {
    // Wait for active tasks to complete
    while (this.activeTaskCount > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Terminate all workers
    const promises = this.workers.map(worker => worker.terminate());
    await Promise.all(promises);
    
    this.workers = [];
    this.availableWorkers = [];
    this.taskQueue = [];
    
    // Clear all timeouts
    for (const timeout of this.idleTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.idleTimeouts.clear();
  }
}

/**
 * Main parallelization service
 */
export class ParallelizationService implements IParallelizationService {
  private workerPools = new Map<string, WorkerPool>();
  private defaultPool: WorkerPool;

  constructor(private options: WorkerPoolOptions = {}) {
    this.defaultPool = new WorkerPool(options);
  }

  async executeInWorker<TInput, TOutput>(
    handler: string,
    data: TInput,
    timeout?: number
  ): Promise<TOutput> {
    const task: WorkerTask<TInput, TOutput> = {
      id: `task-${Date.now()}-${Math.random()}`,
      data,
      handler,
      timeout,
    };

    return this.defaultPool.execute(task);
  }

  async executeBatch<TInput, TOutput>(
    tasks: WorkerTask<TInput, TOutput>[]
  ): Promise<WorkerResult<TOutput>[]> {
    const promises = tasks.map(async (task) => {
      const startTime = Date.now();
      
      try {
        const result = await this.defaultPool.execute(task);
        return {
          id: task.id,
          success: true,
          result,
          duration: Date.now() - startTime,
        };
      } catch (error) {
        return {
          id: task.id,
          success: false,
          error: error as Error,
          duration: Date.now() - startTime,
        };
      }
    });

    return Promise.all(promises);
  }

  async executeParallel<T>(
    items: T[],
    processor: (item: T, index: number) => Promise<any>,
    concurrency = this.options.maxWorkers ?? cpus().length
  ): Promise<any[]> {
    const results: any[] = new Array(items.length);
    const executing: Promise<void>[] = [];

    for (let i = 0; i < items.length; i++) {
      const promise = processor(items[i], i).then(result => {
        results[i] = result;
      });

      executing.push(promise);

      if (executing.length >= concurrency) {
        await Promise.race(executing);
        // Remove completed promises
        for (let j = executing.length - 1; j >= 0; j--) {
          if ((executing[j] as any).resolved) {
            executing.splice(j, 1);
          }
        }
      }
    }

    await Promise.all(executing);
    return results;
  }

  createWorkerPool(options?: WorkerPoolOptions): WorkerPool {
    const poolOptions = { ...this.options, ...options };
    const pool = new WorkerPool(poolOptions);
    
    // Store pool for potential reuse
    const poolKey = JSON.stringify(poolOptions);
    this.workerPools.set(poolKey, pool);
    
    return pool;
  }

  async shutdown(): Promise<void> {
    await this.defaultPool.shutdown();
    
    const promises = Array.from(this.workerPools.values()).map(pool => pool.shutdown());
    await Promise.all(promises);
    
    this.workerPools.clear();
  }
}

// Worker thread code
if (!isMainThread && workerData?.isWorkerThread) {
  // Built-in worker handlers
  const handlers: Record<string, (data: any) => Promise<any>> = {
    'json-parse': async (data: string) => JSON.parse(data),
    'json-stringify': async (data: any) => JSON.stringify(data),
    'hash-calculation': async (data: string) => {
      const crypto = await import('crypto');
      return crypto.createHash('sha256').update(data).digest('hex');
    },
    'file-validation': async (data: { filePath: string; rules: any }) => {
      // Placeholder for file validation logic
      return { valid: true, errors: [] };
    },
  };

  parentPort?.on('message', async (message) => {
    const { type, taskId, handler, data } = message;
    
    if (type === 'execute-task') {
      try {
        let result;
        
        if (handlers[handler]) {
          result = await handlers[handler](data);
        } else {
          // Try to require and execute external handler
          try {
            const handlerModule = await import(handler);
            const handlerFunction = handlerModule.default || handlerModule[handler];
            if (typeof handlerFunction === 'function') {
              result = await handlerFunction(data);
            } else {
              throw new Error(`Handler ${handler} is not a function`);
            }
          } catch (importError) {
            throw new Error(`Could not load handler ${handler}: ${importError}`);
          }
        }
        
        parentPort?.postMessage({
          taskId,
          success: true,
          result,
        });
      } catch (error) {
        parentPort?.postMessage({
          taskId,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  });
}

/**
 * Utility functions for common parallel operations
 */
export class ParallelUtils {
  static async mapParallel<T, R>(
    array: T[],
    mapper: (item: T, index: number) => Promise<R>,
    concurrency = cpus().length
  ): Promise<R[]> {
    const results: R[] = new Array(array.length);
    const executing: Promise<void>[] = [];

    for (let i = 0; i < array.length; i++) {
      const promise = mapper(array[i], i).then(result => {
        results[i] = result;
      });

      executing.push(promise);

      if (executing.length >= concurrency) {
        await Promise.race(executing);
        executing.splice(executing.findIndex(p => (p as any).resolved), 1);
      }
    }

    await Promise.all(executing);
    return results;
  }

  static async filterParallel<T>(
    array: T[],
    predicate: (item: T, index: number) => Promise<boolean>,
    concurrency = cpus().length
  ): Promise<T[]> {
    const results = await this.mapParallel(array, predicate, concurrency);
    return array.filter((_, index) => results[index]);
  }

  static async findParallel<T>(
    array: T[],
    predicate: (item: T, index: number) => Promise<boolean>,
    concurrency = cpus().length
  ): Promise<T | undefined> {
    const promises: Promise<{ index: number; found: boolean }>[] = [];
    
    for (let i = 0; i < array.length; i += concurrency) {
      const batch = array.slice(i, i + concurrency);
      const batchPromises = batch.map(async (item, localIndex) => {
        const globalIndex = i + localIndex;
        const found = await predicate(item, globalIndex);
        return { index: globalIndex, found };
      });
      
      promises.push(...batchPromises);
      
      // Check if any in this batch match
      const batchResults = await Promise.all(batchPromises);
      const foundResult = batchResults.find(result => result.found);
      if (foundResult) {
        return array[foundResult.index];
      }
    }
    
    return undefined;
  }
}