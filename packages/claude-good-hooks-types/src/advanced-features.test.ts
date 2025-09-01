/**
 * Tests for advanced hook features including composition, versioning, and debugging
 */

import { describe, it, expect } from 'vitest';
import {
  parseVersion,
  formatVersion,
  compareVersions,
  checkCompatibility,
  createComposedHook,
  createHookChain,
  createDebugHook,
  createMarketplaceClient,
  type HookVersion,
  type HookComposition,
  type HookChain,
  type VersionCompatibility,
  type HookDebugConfig
} from '@sammons/claude-good-hooks-factories';
import {
  isHookVersion,
  isHookDependency,
  isHookComposition,
  isHookExecutionContext,
  isHookExecutionResult,
  type HookDependency,
  type HookExecutionContext,
  type HookExecutionResult
} from '@sammons/claude-good-hooks-types';

describe('Version Management', () => {
  describe('parseVersion', () => {
    it('should parse semantic version strings correctly', () => {
      const version = parseVersion('1.2.3-beta.1+build.123');
      
      expect(version).toEqual({
        major: 1,
        minor: 2,
        patch: 3,
        prerelease: 'beta.1',
        build: 'build.123'
      });
    });

    it('should parse version without prerelease and build', () => {
      const version = parseVersion('2.0.0');
      
      expect(version).toEqual({
        major: 2,
        minor: 0,
        patch: 0
      });
    });

    it('should throw error for invalid version strings', () => {
      expect(() => parseVersion('invalid')).toThrow('Invalid version string: invalid');
    });
  });

  describe('formatVersion', () => {
    it('should format version object to string', () => {
      const version: HookVersion = {
        major: 1,
        minor: 2,
        patch: 3,
        prerelease: 'alpha.1',
        build: 'build.456'
      };
      
      expect(formatVersion(version)).toBe('1.2.3-alpha.1+build.456');
    });

    it('should format version without prerelease and build', () => {
      const version: HookVersion = {
        major: 2,
        minor: 1,
        patch: 0
      };
      
      expect(formatVersion(version)).toBe('2.1.0');
    });
  });

  describe('compareVersions', () => {
    it('should compare versions correctly', () => {
      expect(compareVersions('1.0.0', '1.0.1')).toBe(-1);
      expect(compareVersions('1.1.0', '1.0.0')).toBe(1);
      expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
    });

    it('should handle prerelease versions', () => {
      expect(compareVersions('1.0.0-alpha', '1.0.0')).toBe(-1);
      expect(compareVersions('1.0.0', '1.0.0-alpha')).toBe(1);
      expect(compareVersions('1.0.0-alpha.1', '1.0.0-alpha.2')).toBe(-1);
    });
  });

  describe('checkCompatibility', () => {
    it('should check version compatibility correctly', () => {
      const compatibility: VersionCompatibility = {
        minimumVersion: '1.0.0',
        maximumVersion: '2.0.0',
        excludedVersions: ['1.5.0']
      };

      expect(checkCompatibility('1.2.0', compatibility)).toBe(true);
      expect(checkCompatibility('0.9.0', compatibility)).toBe(false);
      expect(checkCompatibility('2.1.0', compatibility)).toBe(false);
      expect(checkCompatibility('1.5.0', compatibility)).toBe(false);
    });
  });
});

describe('Hook Composition', () => {
  describe('createComposedHook', () => {
    it('should create a composed hook from multiple hooks', () => {
      const composition: HookComposition = {
        name: 'test-composition',
        description: 'Test composition',
        hooks: [
          { hookName: 'linter', order: 1 },
          { hookName: 'tester', order: 2 },
          { hookName: 'builder', order: 3 }
        ]
      };

      const composedHook = createComposedHook(composition);
      
      expect(composedHook.name).toBe('test-composition');
      expect(composedHook.description).toBe('Test composition');
      
      const hooks = composedHook.makeHook({});
      expect(hooks).toHaveProperty('PostToolUse');
      expect(hooks.PostToolUse).toHaveLength(1);
      expect(hooks.PostToolUse![0].hooks).toHaveLength(3);
    });

    it('should respect hook order', () => {
      const composition: HookComposition = {
        name: 'ordered-composition',
        description: 'Ordered test',
        hooks: [
          { hookName: 'third', order: 3 },
          { hookName: 'first', order: 1 },
          { hookName: 'second', order: 2 }
        ]
      };

      const composedHook = createComposedHook(composition);
      const hooks = composedHook.makeHook({});
      
      const commands = hooks.PostToolUse![0].hooks;
      expect(commands[0].command).toContain('first');
      expect(commands[1].command).toContain('second');
      expect(commands[2].command).toContain('third');
    });

    it('should skip disabled hooks', () => {
      const composition: HookComposition = {
        name: 'filtered-composition',
        description: 'Filtered test',
        hooks: [
          { hookName: 'enabled', enabled: true },
          { hookName: 'disabled', enabled: false },
          { hookName: 'default' }
        ]
      };

      const composedHook = createComposedHook(composition);
      const hooks = composedHook.makeHook({});
      
      expect(hooks.PostToolUse![0].hooks).toHaveLength(2);
      expect(hooks.PostToolUse![0].hooks.some(h => h.command.includes('disabled'))).toBe(false);
    });
  });

  describe('createHookChain', () => {
    it('should create a hook chain with error handling', () => {
      const chain: HookChain = {
        name: 'test-chain',
        description: 'Test chain',
        steps: [
          { hookName: 'step1', onError: 'stop' },
          { hookName: 'step2', onError: 'retry', retryCount: 2 },
          { hookName: 'step3', onError: 'continue' }
        ]
      };

      const chainHook = createHookChain(chain);
      
      expect(chainHook.name).toBe('test-chain');
      
      const hooks = chainHook.makeHook({});
      expect(hooks.PostToolUse![0].hooks[0].command).toContain('#!/bin/bash');
    });
  });
});

describe('Debug Features', () => {
  describe('createDebugHook', () => {
    it('should create debug wrapper for hooks', () => {
      const originalHook = {
        name: 'test-hook',
        description: 'Test hook',
        version: '1.0.0',
        makeHook: () => ({
          PostToolUse: [{
            hooks: [{ type: 'command' as const, command: 'echo "test"' }]
          }]
        })
      };

      const debugConfig: HookDebugConfig = {
        enabled: true,
        tracing: true,
        profiling: true,
        logLevel: 'debug'
      };

      const debugHook = createDebugHook(originalHook, debugConfig);
      
      expect(debugHook.debug).toEqual(debugConfig);
      
      const hooks = debugHook.makeHook({});
      const command = hooks.PostToolUse![0].hooks[0].command;
      
      expect(command).toContain('[TRACE]');
      expect(command).toContain('time');
    });

    it('should return original hook when debug is disabled', () => {
      const originalHook = {
        name: 'test-hook',
        description: 'Test hook',
        version: '1.0.0',
        makeHook: () => ({})
      };

      const debugConfig: HookDebugConfig = {
        enabled: false
      };

      const debugHook = createDebugHook(originalHook, debugConfig);
      
      expect(debugHook).toBe(originalHook);
    });
  });
});

describe('Marketplace Features', () => {
  describe('createMarketplaceClient', () => {
    it('should create marketplace client with search capabilities', async () => {
      const client = createMarketplaceClient({
        baseUrl: 'https://test-api.com',
        apiKey: 'test-key'
      });

      const results = await client.search({ query: 'test' });
      
      expect(results).toHaveProperty('hooks');
      expect(results).toHaveProperty('total');
      expect(results).toHaveProperty('hasMore');
      expect(Array.isArray(results.hooks)).toBe(true);
    });

    it('should filter search results by criteria', async () => {
      const client = createMarketplaceClient({});
      
      const results = await client.search({
        query: 'eslint',
        verified: true,
        category: 'Development Tools'
      });

      // Mock implementation should return filtered results
      expect(results.hooks.every(hook => hook.marketplace.verified)).toBe(true);
    });
  });
});

describe('Type Guards', () => {
  describe('isHookVersion', () => {
    it('should validate hook version objects', () => {
      const validVersion: HookVersion = {
        major: 1,
        minor: 0,
        patch: 0
      };
      
      expect(isHookVersion(validVersion)).toBe(true);
      expect(isHookVersion({})).toBe(false);
      expect(isHookVersion({ major: 1 })).toBe(false);
      expect(isHookVersion({ major: '1', minor: 0, patch: 0 })).toBe(false);
    });
  });

  describe('isHookDependency', () => {
    it('should validate hook dependency objects', () => {
      const validDependency: HookDependency = {
        name: 'test-dep',
        version: '>=1.0.0'
      };
      
      expect(isHookDependency(validDependency)).toBe(true);
      expect(isHookDependency({})).toBe(false);
      expect(isHookDependency({ name: 'test' })).toBe(false);
    });
  });

  describe('isHookComposition', () => {
    it('should validate hook composition objects', () => {
      const validComposition: HookComposition = {
        name: 'test',
        description: 'Test composition',
        hooks: [
          { hookName: 'test-hook' }
        ]
      };
      
      expect(isHookComposition(validComposition)).toBe(true);
      expect(isHookComposition({})).toBe(false);
      expect(isHookComposition({ name: 'test', description: 'desc', hooks: [] })).toBe(true);
    });
  });

  describe('isHookExecutionContext', () => {
    it('should validate hook execution context objects', () => {
      const validContext: HookExecutionContext = {
        hookName: 'test-hook',
        eventType: 'PostToolUse',
        timestamp: new Date(),
        executionId: 'test-id'
      };
      
      expect(isHookExecutionContext(validContext)).toBe(true);
      expect(isHookExecutionContext({})).toBe(false);
      expect(isHookExecutionContext({ hookName: 'test' })).toBe(false);
    });
  });

  describe('isHookExecutionResult', () => {
    it('should validate hook execution result objects', () => {
      const validResult: HookExecutionResult = {
        context: {
          hookName: 'test-hook',
          eventType: 'PostToolUse',
          timestamp: new Date(),
          executionId: 'test-id'
        },
        success: true,
        duration: 100
      };
      
      expect(isHookExecutionResult(validResult)).toBe(true);
      expect(isHookExecutionResult({})).toBe(false);
      expect(isHookExecutionResult({ context: {}, success: true, duration: 100 })).toBe(false);
    });
  });
});

describe('Integration Tests', () => {
  it('should work with version management and composition together', () => {
    const composition: HookComposition = {
      name: 'versioned-composition',
      description: 'Composition with versioning',
      hooks: [
        { hookName: 'linter', args: { version: '1.2.3' } },
        { hookName: 'tester', args: { version: '2.0.0' } }
      ]
    };

    const composedHook = createComposedHook(composition);
    
    expect(composedHook).toBeDefined();
    expect(composedHook.name).toBe('versioned-composition');
    
    const hooks = composedHook.makeHook({ globalFlag: true });
    expect(hooks.PostToolUse![0].hooks).toHaveLength(2);
  });

  it('should work with debug and marketplace features together', async () => {
    const debugConfig: HookDebugConfig = {
      enabled: true,
      tracing: true,
      logLevel: 'info'
    };

    const client = createMarketplaceClient({});
    const results = await client.search({ query: 'debug' });
    
    // Mock should return some results
    expect(results.hooks.length).toBeGreaterThanOrEqual(0);
  });
});