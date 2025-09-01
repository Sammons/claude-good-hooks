import { describe, it, expect } from 'vitest';
import {
  isHookMetadata,
  type HookMetadata,
} from './index.js';

/**
 * Type Guards Tests - isHookMetadata
 */

describe('Type Guards - isHookMetadata', () => {
  it('should validate correct HookMetadata objects', () => {
    const validMetadata: HookMetadata[] = [
      {
        name: 'test-hook',
        description: 'A test hook',
        version: '1.0.0',
        source: 'local',
        installed: true,
      },
      {
        name: 'global-hook',
        description: 'A global hook',
        version: '2.1.0',
        source: 'global',
        installed: false,
        packageName: '@scope/hook-name',
      },
      {
        name: 'remote-hook',
        description: 'A remote hook',
        version: '3.0.0-beta.1',
        source: 'remote',
        installed: true,
        packageName: 'remote-hook-package',
      },
    ];

    validMetadata.forEach((metadata) => {
      expect(isHookMetadata(metadata)).toBe(true);
    });
  });

  it('should reject invalid HookMetadata objects', () => {
    const invalidMetadata = [
      null,
      undefined,
      {},
      { name: 'test' }, // missing required fields
      { name: 123, description: 'desc', version: '1.0.0', source: 'local', installed: true }, // name not string
      { name: 'test', description: 123, version: '1.0.0', source: 'local', installed: true }, // description not string
      { name: 'test', description: 'desc', version: 123, source: 'local', installed: true }, // version not string
      { name: 'test', description: 'desc', version: '1.0.0', source: 'invalid', installed: true }, // invalid source
      { name: 'test', description: 'desc', version: '1.0.0', source: 'local', installed: 'invalid' }, // installed not boolean
      {
        name: 'test',
        description: 'desc',
        version: '1.0.0',
        source: 'local',
        installed: true,
        packageName: 123, // packageName not string
      },
      'not an object',
      123,
      [],
    ];

    invalidMetadata.forEach((metadata) => {
      expect(isHookMetadata(metadata)).toBe(false);
    });
  });

  it('should validate source types', () => {
    const validSources = ['local', 'global', 'remote'];
    const invalidSources = ['invalid', 'LOCAL', 'Global', 'REMOTE', '', null, undefined, 123];

    validSources.forEach((source) => {
      expect(isHookMetadata({
        name: 'test',
        description: 'desc',
        version: '1.0.0',
        source: source as any,
        installed: true,
      })).toBe(true);
    });

    invalidSources.forEach((source) => {
      expect(isHookMetadata({
        name: 'test',
        description: 'desc',
        version: '1.0.0',
        source: source as any,
        installed: true,
      })).toBe(false);
    });
  });

  it('should handle optional packageName', () => {
    // Without packageName
    expect(isHookMetadata({
      name: 'test',
      description: 'desc',
      version: '1.0.0',
      source: 'local',
      installed: true,
    })).toBe(true);

    // With valid packageName
    expect(isHookMetadata({
      name: 'test',
      description: 'desc',
      version: '1.0.0',
      source: 'remote',
      installed: true,
      packageName: '@scope/package-name',
    })).toBe(true);

    // With invalid packageName
    expect(isHookMetadata({
      name: 'test',
      description: 'desc',
      version: '1.0.0',
      source: 'remote',
      installed: true,
      packageName: 123 as any,
    })).toBe(false);
  });
});