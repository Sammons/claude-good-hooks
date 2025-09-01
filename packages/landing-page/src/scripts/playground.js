// Playground functionality - interactive hook testing
export class PlaygroundManager {
  constructor() {
    this.examples = {
      'git-status': {
        name: 'Git Status Hook',
        config: {
          hooks: {
            SessionStart: [{
              hooks: [{
                type: 'command',
                command: 'git status --porcelain'
              }]
            }]
          }
        }
      },
      'lint-check': {
        name: 'Lint Check Hook',
        config: {
          hooks: {
            PreToolUse: [{
              matcher: 'Write|Edit',
              hooks: [{
                type: 'command',
                command: 'npm run lint -- --fix'
              }]
            }]
          }
        }
      },
      'session-context': {
        name: 'Session Context Hook',
        config: {
          hooks: {
            SessionStart: [{
              hooks: [{
                type: 'command',
                command: 'git branch --show-current && git log --oneline -5'
              }]
            }]
          }
        }
      }
    };
    
    this.initializePlayground();
  }
  
  initializePlayground() {
    const runBtn = document.getElementById('playground-run');
    const resetBtn = document.getElementById('playground-reset');
    const shareBtn = document.getElementById('playground-share');
    const exampleBtns = document.querySelectorAll('.example-btn');
    
    runBtn?.addEventListener('click', () => this.runHook());
    resetBtn?.addEventListener('click', () => this.resetPlayground());
    shareBtn?.addEventListener('click', () => this.sharePlayground());
    
    exampleBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const example = btn.getAttribute('data-example');
        this.loadExample(example);
      });
    });
  }
  
  runHook() {
    const editor = document.getElementById('hook-editor');
    const output = document.getElementById('playground-result');
    const runBtn = document.getElementById('playground-run');
    
    if (!editor || !output || !runBtn) return;
    
    try {
      const config = JSON.parse(editor.value);
      
      runBtn.classList.add('loading');
      runBtn.textContent = 'Running...';
      
      setTimeout(() => {
        this.simulateHookExecution(config, output);
        runBtn.classList.remove('loading');
        runBtn.textContent = 'Run';
      }, 1000);
      
    } catch (error) {
      this.displayError(output, 'Invalid JSON configuration', error.message);
    }
  }
  
  simulateHookExecution(config, output) {
    const results = [];
    
    if (!config.hooks) {
      this.displayError(output, 'Missing hooks configuration');
      return;
    }
    
    Object.entries(config.hooks).forEach(([event, hooks]) => {
      results.push({
        type: 'info',
        message: `Processing ${event} hooks...`
      });
      
      hooks.forEach((hookGroup) => {
        if (hookGroup.hooks) {
          hookGroup.hooks.forEach((hook) => {
            if (hook.command) {
              results.push({
                type: 'success',
                message: `✓ Executed: ${hook.command}`
              });
              
              results.push({
                type: 'output',
                message: this.simulateCommandOutput(hook.command)
              });
            }
          });
        }
      });
    });
    
    this.displayResults(output, results);
  }
  
  simulateCommandOutput(command) {
    const outputs = {
      'git status --porcelain': ' M src/index.js\\n?? new-file.txt',
      'npm run lint -- --fix': '✓ All files passed linting',
      'git branch --show-current': 'main',
      'git log --oneline -5': 'a1b2c3d Fix bug in hook processing\\n4e5f6g7 Add new feature\\n8h9i0j1 Update documentation',
      'echo \'About to modify file: $CLAUDE_PROJECT_DIR\'': 'About to modify file: /path/to/project'
    };
    
    return outputs[command] || `Command executed: ${command}`;
  }
  
  displayResults(output, results) {
    output.innerHTML = results.map(result => `
      <div class="output-${result.type}">
        ${result.message}
      </div>
    `).join('');
  }
  
  displayError(output, title, message = '') {
    output.innerHTML = `
      <div class="output-error">
        <strong>${title}</strong>
        ${message ? `<br><small>${message}</small>` : ''}
      </div>
    `;
  }
  
  loadExample(exampleKey) {
    const example = this.examples[exampleKey];
    const editor = document.getElementById('hook-editor');
    
    if (example && editor) {
      editor.value = JSON.stringify(example.config, null, 2);
      
      const exampleBtns = document.querySelectorAll('.example-btn');
      exampleBtns.forEach(btn => {
        if (btn.getAttribute('data-example') === exampleKey) {
          btn.classList.add('btn-success');
          btn.textContent = '✓ Loaded';
          setTimeout(() => {
            btn.classList.remove('btn-success');
            btn.textContent = example.name.replace(' Hook', '');
          }, 2000);
        }
      });
    }
  }
  
  resetPlayground() {
    const editor = document.getElementById('hook-editor');
    const output = document.getElementById('playground-result');
    
    if (editor) {
      editor.value = `{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Write|Edit",
      "hooks": [{
        "type": "command",
        "command": "echo 'About to modify file: $CLAUDE_PROJECT_DIR'"
      }]
    }]
  }
}`;
    }
    
    if (output) {
      output.innerHTML = `
        <div class="output-placeholder">
          <p>Run your hook configuration to see the output</p>
        </div>
      `;
    }
  }
  
  sharePlayground() {
    const editor = document.getElementById('hook-editor');
    const shareBtn = document.getElementById('playground-share');
    
    if (!editor || !shareBtn) return;
    
    try {
      const config = JSON.parse(editor.value);
      const encoded = btoa(JSON.stringify(config));
      const url = `${window.location.origin}${window.location.pathname}#playground=${encoded}`;
      
      navigator.clipboard.writeText(url).then(() => {
        shareBtn.classList.add('btn-success');
        shareBtn.textContent = '✓ Copied!';
        setTimeout(() => {
          shareBtn.classList.remove('btn-success');
          shareBtn.textContent = 'Share';
        }, 2000);
      }).catch(() => {
        // Fallback for older browsers
        this.fallbackCopyToClipboard(url, shareBtn);
      });
      
    } catch (error) {
      shareBtn.classList.add('btn-error');
      shareBtn.textContent = 'Invalid JSON';
      setTimeout(() => {
        shareBtn.classList.remove('btn-error');
        shareBtn.textContent = 'Share';
      }, 2000);
    }
  }
  
  fallbackCopyToClipboard(text, btn) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    
    btn.classList.add('btn-success');
    btn.textContent = '✓ Copied!';
    setTimeout(() => {
      btn.classList.remove('btn-success');
      btn.textContent = 'Share';
    }, 2000);
  }
  
  loadSharedPlayground() {
    const hash = window.location.hash;
    if (hash.startsWith('#playground=')) {
      try {
        const encoded = hash.substring('#playground='.length);
        const config = JSON.parse(atob(encoded));
        const editor = document.getElementById('hook-editor');
        
        if (editor) {
          editor.value = JSON.stringify(config, null, 2);
        }
      } catch (error) {
        console.error('Failed to load shared playground:', error);
      }
    }
  }
}