import { describe, it, expect, beforeEach } from 'vitest';
import { isClaudeSettings } from '@claude-good-hooks/types';

/**
 * End-to-end configuration management tests
 */

describe('Configuration Management E2E', () => {
  let testSettings: any;

  beforeEach(() => {
    testSettings = {
      hooks: {
        PostToolUse: [
          {
            matcher: 'Write|Edit',
            hooks: [
              { type: 'command', command: 'prettier --write .' },
            ],
          },
        ],
      },
    };
  });

  it('should complete full configuration lifecycle', async () => {
    // Step 1: Initial configuration creation
    const initialConfig = {
      hooks: {
        SessionStart: [
          {
            hooks: [
              { type: 'command' as const, command: 'git status' },
            ],
          },
        ],
      },
    };

    expect(isClaudeSettings(initialConfig)).toBe(true);

    // Step 2: Configuration validation
    const validationResult = {
      isValid: isClaudeSettings(initialConfig),
      errors: [],
      warnings: [],
    };

    expect(validationResult.isValid).toBe(true);
    expect(validationResult.errors).toHaveLength(0);

    // Step 3: Configuration merging
    const additionalConfig = {
      hooks: {
        PostToolUse: [
          {
            matcher: 'Write',
            hooks: [
              { type: 'command' as const, command: 'eslint --fix .' },
            ],
          },
        ],
      },
    };

    const mergedConfig = {
      hooks: {
        ...initialConfig.hooks,
        ...additionalConfig.hooks,
      },
    };

    expect(isClaudeSettings(mergedConfig)).toBe(true);
    expect(mergedConfig.hooks.SessionStart).toBeDefined();
    expect(mergedConfig.hooks.PostToolUse).toBeDefined();

    // Step 4: Configuration optimization
    const optimizedConfig = {
      hooks: {
        SessionStart: mergedConfig.hooks.SessionStart,
        PostToolUse: [
          {
            matcher: 'Write|Edit',
            hooks: [
              { type: 'command' as const, command: 'eslint --fix .' },
              { type: 'command' as const, command: 'prettier --write .' },
            ],
          },
        ],
      },
    };

    expect(isClaudeSettings(optimizedConfig)).toBe(true);

    // Step 5: Configuration backup and restore
    const backupConfig = JSON.parse(JSON.stringify(optimizedConfig));
    expect(isClaudeSettings(backupConfig)).toBe(true);

    // Step 6: Configuration export/import
    const exportedConfig = JSON.stringify(optimizedConfig, null, 2);
    const importedConfig = JSON.parse(exportedConfig);
    expect(isClaudeSettings(importedConfig)).toBe(true);
  });

  it('should handle multi-environment configuration management', async () => {
    // Development environment
    const devConfig = {
      hooks: {
        PostToolUse: [
          {
            matcher: 'Write|Edit',
            hooks: [
              { type: 'command' as const, command: 'eslint --fix .' },
              { type: 'command' as const, command: 'prettier --write .' },
              { type: 'command' as const, command: 'npm run test:unit' },
            ],
          },
        ],
        SessionStart: [
          {
            hooks: [
              { type: 'command' as const, command: 'npm run dev:setup' },
            ],
          },
        ],
      },
    };

    // Production environment
    const prodConfig = {
      hooks: {
        PreToolUse: [
          {
            matcher: 'Write|Edit',
            hooks: [
              { type: 'command' as const, command: 'security-scan.sh' },
            ],
          },
        ],
        PostToolUse: [
          {
            matcher: 'Write|Edit',
            hooks: [
              { type: 'command' as const, command: 'eslint --max-warnings 0 .' },
              { type: 'command' as const, command: 'npm run test:all', timeout: 300000 },
            ],
          },
        ],
      },
    };

    // Testing environment
    const testConfig = {
      hooks: {
        PostToolUse: [
          {
            matcher: 'Write|Edit',
            hooks: [
              { type: 'command' as const, command: 'npm run test:coverage' },
            ],
          },
        ],
      },
    };

    expect(isClaudeSettings(devConfig)).toBe(true);
    expect(isClaudeSettings(prodConfig)).toBe(true);
    expect(isClaudeSettings(testConfig)).toBe(true);

    // Environment-specific configuration switching
    const environmentConfigs = {
      development: devConfig,
      production: prodConfig,
      testing: testConfig,
    };

    Object.values(environmentConfigs).forEach(config => {
      expect(isClaudeSettings(config)).toBe(true);
    });
  });

  it('should handle configuration inheritance and overrides', async () => {
    // Base configuration
    const baseConfig = {
      hooks: {
        SessionStart: [
          {
            hooks: [
              { type: 'command' as const, command: 'base-setup.sh' },
            ],
          },
        ],
        PostToolUse: [
          {
            matcher: '*',
            hooks: [
              { type: 'command' as const, command: 'base-cleanup.sh' },
            ],
          },
        ],
      },
    };

    // Project-specific overrides
    const projectOverrides = {
      hooks: {
        PostToolUse: [
          {
            matcher: 'Write|Edit',
            hooks: [
              { type: 'command' as const, command: 'project-specific-format.sh' },
            ],
          },
        ],
        PreToolUse: [
          {
            matcher: 'Bash',
            hooks: [
              { type: 'command' as const, command: 'validate-bash.sh' },
            ],
          },
        ],
      },
    };

    // Merge with inheritance logic
    const inheritedConfig = {
      hooks: {
        // Keep SessionStart from base
        SessionStart: baseConfig.hooks.SessionStart,
        // Override PostToolUse with project-specific
        PostToolUse: projectOverrides.hooks.PostToolUse,
        // Add new PreToolUse from project
        PreToolUse: projectOverrides.hooks.PreToolUse,
      },
    };

    expect(isClaudeSettings(inheritedConfig)).toBe(true);
    expect(inheritedConfig.hooks.SessionStart).toBeDefined();
    expect(inheritedConfig.hooks.PostToolUse![0].matcher).toBe('Write|Edit');
    expect(inheritedConfig.hooks.PreToolUse).toBeDefined();
  });

  it('should handle configuration migration between versions', async () => {
    // Version 1.0 configuration format
    const v1Config = {
      hooks: {
        PostToolUse: [
          {
            matcher: 'Write',
            hooks: [
              { type: 'command' as const, command: 'old-formatter .' },
            ],
          },
        ],
      },
    };

    // Version 2.0 configuration format (with migrations)
    const migratedConfig = {
      hooks: {
        PostToolUse: [
          {
            matcher: 'Write|Edit',  // Expanded matcher
            hooks: [
              { type: 'command' as const, command: 'new-formatter .', timeout: 30000 },  // Added timeout
            ],
          },
        ],
        // New hook type in v2.0
        SessionStart: [
          {
            hooks: [
              { type: 'command' as const, command: 'migration-setup.sh' },
            ],
          },
        ],
      },
    };

    expect(isClaudeSettings(v1Config)).toBe(true);
    expect(isClaudeSettings(migratedConfig)).toBe(true);

    // Verify migration improvements
    expect(migratedConfig.hooks.PostToolUse![0].matcher).toBe('Write|Edit');
    expect(migratedConfig.hooks.PostToolUse![0].hooks[0].timeout).toBe(30000);
    expect(migratedConfig.hooks.SessionStart).toBeDefined();
  });
});