// Utility functions and lightweight GitHub stats
export function copyToClipboard(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      showCopyFeedback();
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  }
}

export function showCopyFeedback() {
  const feedback = document.createElement('div');
  feedback.textContent = 'Copied!';
  feedback.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #10b981;
    color: white;
    padding: 8px 16px;
    border-radius: 4px;
    font-size: 14px;
    z-index: 10000;
  `;
  
  document.body.appendChild(feedback);
  
  setTimeout(() => {
    if (document.body.contains(feedback)) {
      document.body.removeChild(feedback);
    }
  }, 2000);
}

export class GitHubStatsManager {
  constructor() {
    this.initializeStats();
  }
  
  async initializeStats() {
    try {
      await this.fetchGitHubStats();
    } catch (error) {
      console.warn('Failed to fetch GitHub stats:', error);
    }
  }
  
  async fetchGitHubStats() {
    // Simulate stats loading for demo
    setTimeout(() => {
      const statsElement = document.getElementById('github-stars');
      if (statsElement) {
        this.animateNumber(statsElement, '⭐ 1.2k', 1200);
      }
    }, 1000);
  }
  
  animateNumber(element, finalText, finalNumber) {
    const startNumber = 0;
    const duration = 2000;
    const steps = 60;
    const increment = finalNumber / steps;
    
    let current = startNumber;
    const timer = setInterval(() => {
      current += increment;
      
      if (current >= finalNumber) {
        element.textContent = finalText;
        clearInterval(timer);
      } else {
        const formatted = current < 1000 ? 
          Math.floor(current).toString() : 
          `${(current / 1000).toFixed(1)}k`;
        element.textContent = `⭐ ${formatted}`;
      }
    }, duration / steps);
  }
}

// Make copyToClipboard available globally for inline event handlers
window.copyToClipboard = copyToClipboard;