// Optimized main entry point with lazy loading and code splitting
import { NavigationManager } from './navigation.js';

// Core initialization - load immediately
let themeManager = null;
let searchManager = null;
let playgroundManager = null;
let githubStatsManager = null;

// Lazy load modules on demand
async function initializeFeature(feature) {
  try {
    switch (feature) {
      case 'theme':
        if (!themeManager) {
          const { ThemeManager } = await import('./theme.js');
          themeManager = new ThemeManager();
        }
        return themeManager;
        
      case 'search':
        if (!searchManager) {
          const { SearchManager } = await import('./search.js');
          searchManager = new SearchManager();
        }
        return searchManager;
        
      case 'playground':
        if (!playgroundManager) {
          const { PlaygroundManager } = await import('./playground.js');
          playgroundManager = new PlaygroundManager();
        }
        return playgroundManager;
        
      case 'github-stats':
        if (!githubStatsManager) {
          const { GitHubStatsManager } = await import('./utils.js');
          githubStatsManager = new GitHubStatsManager();
        }
        return githubStatsManager;
        
      case 'prism':
        return import('./prism-setup.js');
    }
  } catch (error) {
    console.error(`Failed to load ${feature}:`, error);
  }
}

// Initialize critical features immediately
document.addEventListener('DOMContentLoaded', async () => {
  // Always load navigation (critical for UX)
  const navigationManager = new NavigationManager();
  
  // Load theme immediately (prevents flash)
  themeManager = await initializeFeature('theme');
  
  // Setup lazy loading for interactive features
  setupLazyLoading();
  
  console.log('Claude Good Hooks landing page core loaded');
});

function setupLazyLoading() {
  // Theme toggle - preload for instant UX
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      if (themeManager) {
        themeManager.toggleTheme();
      }
    });
  }
  
  // Search - load on first interaction
  let searchLoaded = false;
  const searchTriggers = ['search-toggle'];
  searchTriggers.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('click', async () => {
        if (!searchLoaded) {
          searchManager = await initializeFeature('search');
          searchLoaded = true;
        }
        searchManager?.openSearch();
      });
    }
  });
  
  // Search keyboard shortcut
  document.addEventListener('keydown', async (e) => {
    if (e.key === '/' && !isInputFocused()) {
      e.preventDefault();
      if (!searchLoaded) {
        searchManager = await initializeFeature('search');
        searchLoaded = true;
      }
      searchManager?.openSearch();
    }
  });
  
  // Playground - load when section comes into view or user interacts
  let playgroundLoaded = false;
  const playgroundSection = document.getElementById('playground');
  
  if (playgroundSection) {
    // Intersection Observer for lazy loading
    const playgroundObserver = new IntersectionObserver(async (entries) => {
      entries.forEach(async (entry) => {
        if (entry.isIntersecting && !playgroundLoaded) {
          playgroundManager = await initializeFeature('playground');
          playgroundLoaded = true;
          playgroundObserver.disconnect();
        }
      });
    }, { rootMargin: '100px' });
    
    playgroundObserver.observe(playgroundSection);
    
    // Also load on direct playground interaction
    const playgroundButtons = ['playground-run', 'playground-reset', 'playground-share'];
    playgroundButtons.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.addEventListener('click', async () => {
          if (!playgroundLoaded) {
            playgroundManager = await initializeFeature('playground');
            playgroundLoaded = true;
          }
        });
      }
    });
  }
  
  // Code highlighting - load when code blocks are visible
  let prismLoaded = false;
  const codeBlocks = document.querySelectorAll('pre code');
  if (codeBlocks.length > 0) {
    const codeObserver = new IntersectionObserver(async (entries) => {
      entries.forEach(async (entry) => {
        if (entry.isIntersecting && !prismLoaded) {
          await initializeFeature('prism');
          prismLoaded = true;
          codeObserver.disconnect();
        }
      });
    }, { rootMargin: '50px' });
    
    codeBlocks.forEach(block => codeObserver.observe(block));
  }
  
  // GitHub stats - load when stats section is visible
  let githubStatsLoaded = false;
  const statsSection = document.querySelector('.social-proof');
  if (statsSection) {
    const statsObserver = new IntersectionObserver(async (entries) => {
      entries.forEach(async (entry) => {
        if (entry.isIntersecting && !githubStatsLoaded) {
          githubStatsManager = await initializeFeature('github-stats');
          githubStatsLoaded = true;
          statsObserver.disconnect();
        }
      });
    }, { rootMargin: '100px' });
    
    statsObserver.observe(statsSection);
  }
}

function isInputFocused() {
  const activeElement = document.activeElement;
  return activeElement && (
    activeElement.tagName === 'INPUT' ||
    activeElement.tagName === 'TEXTAREA' ||
    activeElement.isContentEditable
  );
}

// Handle browser back/forward with shared playground
window.addEventListener('hashchange', async () => {
  if (window.location.hash.startsWith('#playground=')) {
    if (!playgroundManager) {
      playgroundManager = await initializeFeature('playground');
    }
    playgroundManager?.loadSharedPlayground();
  }
});

// Export for global access
window.ClaudeGoodHooks = {
  search: async () => {
    if (!searchManager) {
      searchManager = await initializeFeature('search');
    }
    return searchManager?.openSearch();
  },
  toggleTheme: async () => {
    if (!themeManager) {
      themeManager = await initializeFeature('theme');
    }
    return themeManager?.toggleTheme();
  },
  loadExample: async (key) => {
    if (!playgroundManager) {
      playgroundManager = await initializeFeature('playground');
    }
    return playgroundManager?.loadExample(key);
  }
};