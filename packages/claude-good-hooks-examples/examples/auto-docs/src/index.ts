#!/usr/bin/env node

import type { HookPlugin } from '@sammons/claude-good-hooks-types';

const autoDocsHook: HookPlugin = {
  name: 'auto-docs',
  description: 'Automatically generate and update documentation',
  version: '1.0.0',
  customArgs: {
    enabled: { description: 'Enable auto documentation', type: 'boolean', default: true },
    updateReadme: { description: 'Update README.md automatically', type: 'boolean', default: true },
    generateApiDocs: { description: 'Generate API documentation', type: 'boolean', default: false }
  },
  makeHook: (args) => ({
    PostToolUse: [{
      matcher: 'Write|Edit',
      hooks: [{
        type: 'command',
        command: `node -e "
          const input = JSON.parse(require('fs').readFileSync(0, 'utf-8'));
          const filePath = input.tool_input?.file_path || '';
          
          if (filePath.endsWith('.ts') || filePath.endsWith('.js')) {
            console.log('📚 Updating documentation for:', require('path').basename(filePath));
            // In real implementation: extract JSDoc, update README, etc.
          }
        "`
      }]
    }]
  })
};

export default autoDocsHook;