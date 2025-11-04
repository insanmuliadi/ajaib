console.log("Hello Hugo!");

// Fungsi baru
window.topFunction = function(name) {
    document.body.scrollTop=0;document.documentElement.scrollTop=0
  };
// Dark mode functionality
class DarkMode {
  constructor() {
      this.key = 'dark-mode';
      this.init();
  }
  
  init() {
      this.applySavedTheme();
      this.setupToggle();
  }
  
  getSystemPreference() {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  
  getSavedTheme() {
      return localStorage.getItem(this.key);
  }
  
  applySavedTheme() {
      const saved = this.getSavedTheme();
      const system = this.getSystemPreference();
      const theme = saved || system;
      
      document.documentElement.setAttribute('data-theme', theme);
  }
  
  setupToggle() {
      const toggle = document.querySelector('.dark-mode-toggle');
      if (toggle) {
          toggle.addEventListener('click', () => {
              this.toggleTheme();
          });
      }
  }
  
  toggleTheme() {
      const current = document.documentElement.getAttribute('data-theme');
      const newTheme = current === 'dark' ? 'light' : 'dark';
      
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem(this.key, newTheme);
  }
}

// Initialize dark mode
document.addEventListener('DOMContentLoaded', () => {
  new DarkMode();
});
