// Simple test hook
module.exports = {
  name: 'test-hook',
  description: 'A simple test hook',
  version: '1.0.0',
  makeHook: (args) => ({
    SessionStart: [{
      hooks: [{
        type: 'command',
        command: 'echo "Test hook loaded from file!"'
      }]
    }]
  })
};