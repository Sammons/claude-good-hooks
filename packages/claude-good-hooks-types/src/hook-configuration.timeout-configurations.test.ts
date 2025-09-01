import { describe, it, expect } from 'vitest';
import type { HookConfiguration } from './index.js';

/**
 * Hook Configuration Timeout Configurations Tests
 */

describe('HookConfiguration - Timeout Configurations', () => {
  it('should support various timeout values', () => {
    const timeoutVariations: HookConfiguration = {
      hooks: [
        {
          type: 'command',
          command: 'quick-command',
          timeout: 1000, // 1 second
        },
        {
          type: 'command',
          command: 'medium-command',
          timeout: 30000, // 30 seconds
        },
        {
          type: 'command',
          command: 'long-command',
          timeout: 300000, // 5 minutes
        },
        {
          type: 'command',
          command: 'very-long-command',
          timeout: 1800000, // 30 minutes
        },
      ],
    };

    expect(timeoutVariations.hooks[0].timeout).toBe(1000);
    expect(timeoutVariations.hooks[1].timeout).toBe(30000);
    expect(timeoutVariations.hooks[2].timeout).toBe(300000);
    expect(timeoutVariations.hooks[3].timeout).toBe(1800000);
  });

  it('should support zero timeout', () => {
    const zeroTimeout: HookConfiguration = {
      hooks: [
        {
          type: 'command',
          command: 'instant-command',
          timeout: 0,
        },
      ],
    };

    expect(zeroTimeout.hooks[0].timeout).toBe(0);
  });

  it('should support mixed timeout configurations', () => {
    const mixedTimeouts: HookConfiguration = {
      hooks: [
        {
          type: 'command',
          command: 'no-timeout-command',
        },
        {
          type: 'command',
          command: 'with-timeout-command',
          timeout: 15000,
        },
        {
          type: 'command',
          command: 'another-no-timeout',
        },
      ],
    };

    expect(mixedTimeouts.hooks[0].timeout).toBeUndefined();
    expect(mixedTimeouts.hooks[1].timeout).toBe(15000);
    expect(mixedTimeouts.hooks[2].timeout).toBeUndefined();
  });
});