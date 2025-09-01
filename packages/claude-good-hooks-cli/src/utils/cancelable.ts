import chalk from 'chalk';
import { createSpinner } from './progress.js';

/**
 * Utilities for cancelable operations with proper cleanup and signal handling
 */

export interface CancelableOperation<T> {
  promise: Promise<T>;
  cancel: (reason?: string) => void;
  isCanceled: () => boolean;
  onCancel: (handler: (reason?: string) => void) => void;
}

export interface CancelableOptions {
  timeout?: number;
  signal?: AbortSignal;
  onCancel?: (reason?: string) => void;
  cleanupHandler?: () => void | Promise<void>;
}

/**
 * Create a cancelable operation from a Promise-returning function
 */
export function makeCancelable<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  options: CancelableOptions = {}
): CancelableOperation<T> {
  const abortController = new AbortController();
  const cancelHandlers: Array<(reason?: string) => void> = [];
  
  // Chain with external signal if provided
  if (options.signal) {
    if (options.signal.aborted) {
      abortController.abort();
    } else {
      options.signal.addEventListener('abort', () => {
        abortController.abort();
      });
    }
  }

  // Add cleanup handler if provided
  if (options.cleanupHandler) {
    cancelHandlers.push(() => {
      try {
        const cleanup = options.cleanupHandler?.();
        if (cleanup instanceof Promise) {
          cleanup.catch(error => {
            console.error(chalk.red('Error during cleanup:'), error);
          });
        }
      } catch (error) {
        console.error(chalk.red('Error during cleanup:'), error);
      }
    });
  }

  // Add user cancel handler
  if (options.onCancel) {
    cancelHandlers.push(options.onCancel);
  }

  let cancelReason: string | undefined;

  const promise = new Promise<T>((resolve, reject) => {
    // Setup timeout if specified
    let timeoutId: NodeJS.Timeout | undefined;
    if (options.timeout && options.timeout > 0) {
      timeoutId = setTimeout(() => {
        cancel('Operation timed out');
      }, options.timeout);
    }

    // Start the operation
    operation(abortController.signal)
      .then(result => {
        if (timeoutId) clearTimeout(timeoutId);
        if (!abortController.signal.aborted) {
          resolve(result);
        } else {
          reject(new Error(cancelReason || 'Operation was canceled'));
        }
      })
      .catch(error => {
        if (timeoutId) clearTimeout(timeoutId);
        if (abortController.signal.aborted) {
          reject(new Error(cancelReason || 'Operation was canceled'));
        } else {
          reject(error);
        }
      });
  });

  const cancel = (reason?: string) => {
    if (abortController.signal.aborted) return;
    
    cancelReason = reason;
    abortController.abort();
    
    // Execute all cancel handlers
    cancelHandlers.forEach(handler => {
      try {
        handler(reason);
      } catch (error) {
        console.error(chalk.red('Error in cancel handler:'), error);
      }
    });
  };

  const isCanceled = () => abortController.signal.aborted;

  const onCancel = (handler: (reason?: string) => void) => {
    cancelHandlers.push(handler);
  };

  return {
    promise,
    cancel,
    isCanceled,
    onCancel
  };
}

/**
 * Run multiple operations concurrently with shared cancellation
 */
export function makeCancelableAll<T>(
  operations: Array<(signal: AbortSignal) => Promise<T>>,
  options: CancelableOptions = {}
): CancelableOperation<T[]> {
  return makeCancelable(async (signal) => {
    return Promise.all(operations.map(op => op(signal)));
  }, options);
}

/**
 * Race multiple operations with shared cancellation
 */
export function makeCancelableRace<T>(
  operations: Array<(signal: AbortSignal) => Promise<T>>,
  options: CancelableOptions = {}
): CancelableOperation<T> {
  return makeCancelable(async (signal) => {
    return Promise.race(operations.map(op => op(signal)));
  }, options);
}

/**
 * Create a cancelable operation with a spinner
 */
export function withCancelableSpinner<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  message: string,
  options: CancelableOptions & { 
    successMessage?: string;
    errorMessage?: string;
    spinnerColor?: 'green' | 'blue' | 'yellow' | 'red' | 'cyan' | 'magenta';
  } = {}
): CancelableOperation<T> {
  const spinner = createSpinner({
    message,
    color: options.spinnerColor || 'cyan'
  });

  const cancelableOp = makeCancelable(operation, {
    ...options,
    onCancel: (reason) => {
      spinner.stop(chalk.yellow(`Operation canceled${reason ? ': ' + reason : ''}`));
      options.onCancel?.(reason);
    }
  });

  // Start spinner
  spinner.start();

  // Handle completion
  cancelableOp.promise
    .then(() => {
      if (!cancelableOp.isCanceled()) {
        spinner.succeed(options.successMessage || message);
      }
    })
    .catch((error) => {
      if (!cancelableOp.isCanceled()) {
        const errorMsg = options.errorMessage || `${message} failed`;
        spinner.fail(`${errorMsg}: ${error.message}`);
      }
    });

  return cancelableOp;
}

/**
 * Setup global cancellation handlers for CLI
 */
export function setupGlobalCancellation(): {
  addCancelable: (operation: CancelableOperation<unknown>) => void;
  removeCancelable: (operation: CancelableOperation<unknown>) => void;
  cancelAll: (reason?: string) => void;
} {
  const activeOperations = new Set<CancelableOperation<unknown>>();
  let isShuttingDown = false;

  const cleanup = (reason?: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    if (activeOperations.size > 0) {
      console.log(chalk.yellow('\nCanceling active operations...'));
      
      const operations = Array.from(activeOperations);
      operations.forEach(op => {
        try {
          op.cancel(reason);
        } catch (error) {
          console.error(chalk.red('Error canceling operation:'), error);
        }
      });

      // Wait a bit for cleanup
      setTimeout(() => {
        process.exit(130);
      }, 100);
    } else {
      process.exit(130);
    }
  };

  // Setup signal handlers
  process.on('SIGINT', () => cleanup('User interrupted (SIGINT)'));
  process.on('SIGTERM', () => cleanup('Process terminated (SIGTERM)'));
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error(chalk.red('Uncaught exception:'), error);
    cleanup('Uncaught exception');
  });

  process.on('unhandledRejection', (reason) => {
    console.error(chalk.red('Unhandled rejection:'), reason);
    cleanup('Unhandled rejection');
  });

  return {
    addCancelable: (operation: CancelableOperation<unknown>) => {
      activeOperations.add(operation);
      operation.promise
        .finally(() => {
          activeOperations.delete(operation);
        });
    },

    removeCancelable: (operation: CancelableOperation<unknown>) => {
      activeOperations.delete(operation);
    },

    cancelAll: (reason?: string) => {
      cleanup(reason);
    }
  };
}

/**
 * Global cancellation manager
 */
const globalCancellation = setupGlobalCancellation();

/**
 * Register a cancelable operation with global cancellation
 */
export function registerCancelable<T>(operation: CancelableOperation<T>): CancelableOperation<T> {
  globalCancellation.addCancelable(operation);
  return operation;
}

/**
 * Utility to create a delay that respects cancellation
 */
export function cancelableDelay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('Operation was canceled'));
      return;
    }

    const timeoutId = setTimeout(resolve, ms);
    
    if (signal) {
      signal.addEventListener('abort', () => {
        clearTimeout(timeoutId);
        reject(new Error('Operation was canceled'));
      });
    }
  });
}

/**
 * Utility to make any Promise cancelable
 */
export function toCancelable<T>(
  promise: Promise<T>,
  options: CancelableOptions = {}
): CancelableOperation<T> {
  return makeCancelable(async (signal) => {
    const racePromises: Promise<T>[] = [promise];
    
    // Add cancellation promise
    if (!options.signal || !options.signal.aborted) {
      const cancelPromise = new Promise<T>((_, reject) => {
        signal.addEventListener('abort', () => {
          reject(new Error('Operation was canceled'));
        });
      });
      racePromises.push(cancelPromise);
    }

    return Promise.race(racePromises);
  }, options);
}

/**
 * Utility to check if an error is a cancellation error
 */
export function isCancellationError(error: unknown): boolean {
  return error instanceof Error && 
    (error.name === 'AbortError' || 
     error.message.includes('canceled') || 
     error.message.includes('cancelled') ||
     error.message.includes('aborted'));
}

/**
 * Utility to handle cancellation errors gracefully
 */
export function handleCancellation<T>(
  operation: () => Promise<T>,
  onCancel?: (error: Error) => void
): Promise<T> {
  return operation().catch(error => {
    if (isCancellationError(error)) {
      onCancel?.(error);
      process.exit(130); // Standard exit code for SIGINT
    }
    throw error;
  });
}