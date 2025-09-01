// Theme management - dark/light mode switching
export class ThemeManager {
  constructor() {
    this.currentTheme = this.getStoredTheme() || this.getSystemTheme();
    this.initializeTheme();
  }
  
  initializeTheme() {
    this.applyTheme(this.currentTheme);
    
    const themeToggle = document.getElementById('theme-toggle');
    themeToggle?.addEventListener('click', () => this.toggleTheme());
    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!this.getStoredTheme()) {
        this.applyTheme(e.matches ? 'dark' : 'light');
      }
    });
  }
  
  getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  
  getStoredTheme() {
    return localStorage.getItem('claude-good-hooks-theme');
  }
  
  storeTheme(theme) {
    localStorage.setItem('claude-good-hooks-theme', theme);
  }
  
  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    this.currentTheme = theme;
    this.updateThemeToggle();
  }
  
  toggleTheme() {
    const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.applyTheme(newTheme);
    this.storeTheme(newTheme);
    
    // Add a subtle animation
    document.body.style.transition = 'background-color 0.3s ease';
    setTimeout(() => {
      document.body.style.transition = '';
    }, 300);
  }
  
  updateThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.textContent = this.currentTheme === 'dark' ? '☀️' : '🌙';
      themeToggle.setAttribute('aria-label', 
        `Switch to ${this.currentTheme === 'dark' ? 'light' : 'dark'} mode`
      );
    }
  }
}