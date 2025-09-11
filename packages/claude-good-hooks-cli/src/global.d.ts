// Global type declarations for CLI package

declare global {
  // Node.js globals
  var AbortController: typeof globalThis.AbortController;
  var AbortSignal: typeof globalThis.AbortSignal;
  
  namespace NodeJS {
    interface Timeout {
      ref(): this;
      unref(): this;
      hasRef(): boolean;
      [Symbol.toPrimitive](): number;
    }
  }
  
  function setTimeout(callback: () => void, ms?: number): NodeJS.Timeout;
  function clearTimeout(timeoutId: NodeJS.Timeout | undefined): void;
  function setInterval(callback: () => void, ms?: number): NodeJS.Timeout;
  function clearInterval(intervalId: NodeJS.Timeout | undefined): void;
}

export {};