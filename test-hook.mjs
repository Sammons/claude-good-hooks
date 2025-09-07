// Simple ES module test hook
export default {
  name: 'test-hook-esm',
  description: 'A simple ESM test hook',
  version: '1.0.0',
  makeHook: (args) => ({
    SessionStart: [{
      hooks: [{
        type: 'command',
        command: 'echo "ESM hook loaded from file!"'
      }]
    }]
  })
};