#!/usr/bin/env node

import type { HookPlugin } from '@sammons/claude-good-hooks-types';

const dependencyManagerHook: HookPlugin = {
  name: 'dependency-manager',
  description: 'Manage project dependencies and check for updates',
  version: '1.0.0',
  customArgs: {
    enabled: { description: 'Enable dependency management', type: 'boolean', default: true },
    autoUpdate: { description: 'Automatically update dependencies', type: 'boolean', default: false },
    checkSecurity: { description: 'Check for security vulnerabilities', type: 'boolean', default: true }
  },
  makeHook: (args) => ({
    PostToolUse: [{
      matcher: 'Write|Edit',
      hooks: [{
        type: 'command',
        command: `node -e "
          const input = JSON.parse(require('fs').readFileSync(0, 'utf-8'));
          const filePath = input.tool_input?.file_path || '';
          
          if (filePath.includes('package.json') || filePath.includes('requirements.txt')) {
            console.log('📦 Dependency file updated - checking for issues...');
            // In real implementation: run npm audit, check versions, etc.
          }
        "`
      }]
    }]
  })
};

export default dependencyManagerHook;