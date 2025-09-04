#!/usr/bin/env node
import { ListHooksCommand } from './packages/claude-good-hooks-cli/dist/index.mjs';
import { ModuleService } from './packages/claude-good-hooks-cli/dist/index.mjs';
import { HookService } from './packages/claude-good-hooks-cli/dist/index.mjs';

// Create a mock hook service that returns test data
class TestHookService {
  async listInstalledHooks(scope) {
    return [
      {
        name: 'test-hook',
        description: 'Test hook for warnings',
        version: '1.0.0',
        source: scope === 'global' ? 'global' : 'local',
        packageName: '@sammons/missing-module',
        installed: true,
        hookConfiguration: {
          matcher: 'Write',
          hooks: [{ type: 'command', command: 'echo "test"' }],
          claudegoodhooks: {
            name: '@sammons/missing-module/test-hook',
            description: 'Test hook for warnings',
            version: '1.0.0'
          }
        }
      },
      {
        name: 'outdated-hook',
        description: 'Outdated hook for testing',
        version: '1.0.0',
        source: scope === 'global' ? 'global' : 'local',
        packageName: '@sammons/dirty-good-claude-hook',
        installed: true,
        hookConfiguration: {
          matcher: 'Edit',
          hooks: [{ type: 'command', command: 'echo "outdated"' }],
          claudegoodhooks: {
            name: '@sammons/dirty-good-claude-hook/dirty',
            description: 'Outdated hook for testing',
            version: '0.9.0'  // Older version than what's installed
          }
        }
      }
    ];
  }

  async listAvailableHooks(global) {
    return this.listInstalledHooks(global ? 'global' : 'project');
  }
}

// Test the functionality
async function testWarnings() {
  console.log('Testing warning functionality...\n');
  
  const testHookService = new TestHookService();
  const command = new ListHooksCommand(testHookService);
  
  await command.execute([], { installed: true });
}

testWarnings().catch(console.error);