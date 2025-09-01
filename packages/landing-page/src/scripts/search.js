// Search functionality - modal, indexing, keyboard navigation
export class SearchManager {
  constructor() {
    this.searchData = this.buildSearchIndex();
    this.currentResults = [];
    this.selectedIndex = -1;
    
    this.initializeSearch();
  }
  
  buildSearchIndex() {
    return [
      // Documentation sections
      { 
        title: 'Getting Started', 
        description: 'Quick start guide and installation instructions',
        type: 'Documentation',
        section: '#getting-started',
        keywords: ['install', 'setup', 'npm', 'cli', 'getting started', 'quick start']
      },
      { 
        title: 'Features', 
        description: 'Key features and capabilities of Claude Good Hooks',
        type: 'Documentation',
        section: '#features',
        keywords: ['features', 'capabilities', 'simple setup', 'flexible scoping', 'npm ecosystem']
      },
      { 
        title: 'Examples', 
        description: 'Popular hook examples and use cases',
        type: 'Documentation',
        section: '#examples',
        keywords: ['examples', 'hooks', 'git status', 'lint', 'session context']
      },
      { 
        title: 'Interactive Playground', 
        description: 'Try hooks without installation',
        type: 'Documentation',
        section: '#playground',
        keywords: ['playground', 'try', 'test', 'interactive', 'demo']
      },
      
      // Hook examples
      { 
        title: 'Git Status Hook', 
        description: 'Automatically show git status to Claude before each response',
        type: 'Hook',
        section: '#examples',
        keywords: ['git', 'status', 'dirty', 'repository', 'version control']
      },
      { 
        title: 'Lint Before Edit Hook', 
        description: 'Run linting automatically before file modifications',
        type: 'Hook',
        section: '#examples',
        keywords: ['lint', 'linting', 'pre-tool', 'edit', 'write', 'code quality']
      },
      { 
        title: 'Session Context Hook', 
        description: 'Add git branch and recent commits to session context',
        type: 'Hook',
        section: '#examples',
        keywords: ['session', 'context', 'branch', 'commits', 'session-start']
      },
      
      // Commands
      { 
        title: 'claude-good-hooks apply', 
        description: 'Apply a hook configuration globally or locally',
        type: 'Command',
        section: '#getting-started',
        keywords: ['apply', 'global', 'local', 'install hook', 'configuration']
      },
      { 
        title: 'npm install -g @sammons/claude-good-hooks', 
        description: 'Install the Claude Good Hooks CLI globally',
        type: 'Command',
        section: '#getting-started',
        keywords: ['install', 'npm', 'global', 'cli', 'command line']
      },
      
      // Hook events
      { 
        title: 'PreToolUse Event', 
        description: 'Hook that runs before Claude uses a tool',
        type: 'Hook Event',
        section: '#examples',
        keywords: ['pre-tool-use', 'before', 'tool', 'matcher', 'command']
      },
      { 
        title: 'SessionStart Event', 
        description: 'Hook that runs when a Claude session starts',
        type: 'Hook Event',
        section: '#examples',
        keywords: ['session-start', 'session', 'startup', 'context', 'initialization']
      }
    ];
  }
  
  initializeSearch() {
    const searchToggle = document.getElementById('search-toggle');
    const searchModal = document.getElementById('search-modal');
    const searchInput = document.getElementById('search-input');
    const searchClose = document.getElementById('search-close');
    
    searchToggle?.addEventListener('click', () => this.openSearch());
    searchClose?.addEventListener('click', () => this.closeSearch());
    
    searchModal?.addEventListener('click', (e) => {
      if (e.target === searchModal) this.closeSearch();
    });
    
    searchInput?.addEventListener('input', (e) => this.performSearch(e.target.value));
    searchInput?.addEventListener('keydown', (e) => this.handleKeyboardNavigation(e));
    
    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && !this.isInputFocused()) {
        e.preventDefault();
        this.openSearch();
      }
      if (e.key === 'Escape') {
        this.closeSearch();
      }
    });
  }
  
  openSearch() {
    const modal = document.getElementById('search-modal');
    const input = document.getElementById('search-input');
    
    modal?.classList.add('active');
    input?.focus();
    
    document.body.style.overflow = 'hidden';
  }
  
  closeSearch() {
    const modal = document.getElementById('search-modal');
    const input = document.getElementById('search-input');
    
    modal?.classList.remove('active');
    input?.blur();
    
    document.body.style.overflow = '';
    
    this.selectedIndex = -1;
    if (input) input.value = '';
    this.displayPlaceholder();
  }
  
  performSearch(query) {
    const resultsContainer = document.getElementById('search-results');
    
    if (!query.trim()) {
      this.displayPlaceholder();
      return;
    }
    
    const results = this.searchData.filter(item => {
      const searchText = [
        item.title,
        item.description,
        ...item.keywords
      ].join(' ').toLowerCase();
      
      return searchText.includes(query.toLowerCase());
    });
    
    this.currentResults = results;
    this.selectedIndex = -1;
    this.displayResults(results);
  }
  
  displayPlaceholder() {
    const resultsContainer = document.getElementById('search-results');
    if (resultsContainer) {
      resultsContainer.innerHTML = `
        <div class="search-placeholder">
          <p>Start typing to search...</p>
          <div class="search-shortcuts">
            <span class="shortcut">Press <kbd>/</kbd> to search</span>
            <span class="shortcut">Press <kbd>Escape</kbd> to close</span>
          </div>
        </div>
      `;
    }
  }
  
  displayResults(results) {
    const resultsContainer = document.getElementById('search-results');
    if (!resultsContainer) return;
    
    if (results.length === 0) {
      resultsContainer.innerHTML = `
        <div class="search-placeholder">
          <p>No results found</p>
          <p style="font-size: var(--font-size-sm); margin-top: 0.5rem;">Try different keywords or check spelling</p>
        </div>
      `;
      return;
    }
    
    resultsContainer.innerHTML = results.map((result, index) => `
      <div class="search-result-item" data-index="${index}" onclick="searchManager.selectResult(${index})">
        <div class="search-result-type">${result.type}</div>
        <div class="search-result-title">${result.title}</div>
        <div class="search-result-description">${result.description}</div>
      </div>
    `).join('');
  }
  
  handleKeyboardNavigation(e) {
    if (this.currentResults.length === 0) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.selectedIndex = Math.min(this.selectedIndex + 1, this.currentResults.length - 1);
        this.updateHighlight();
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
        this.updateHighlight();
        break;
      case 'Enter':
        e.preventDefault();
        if (this.selectedIndex >= 0) {
          this.selectResult(this.selectedIndex);
        }
        break;
    }
  }
  
  updateHighlight() {
    const items = document.querySelectorAll('.search-result-item');
    items.forEach((item, index) => {
      item.classList.toggle('highlighted', index === this.selectedIndex);
    });
  }
  
  selectResult(index) {
    const result = this.currentResults[index];
    if (result?.section) {
      this.closeSearch();
      
      const target = document.querySelector(result.section);
      if (target) {
        const headerHeight = document.querySelector('.header')?.offsetHeight || 0;
        const targetPosition = target.offsetTop - headerHeight;
        
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }
    }
  }
  
  isInputFocused() {
    const activeElement = document.activeElement;
    return activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.isContentEditable
    );
  }
}