// Mobile Navigation Toggle
const navToggle = document.getElementById('nav-toggle');
const navMenu = document.getElementById('nav-menu');

if (navToggle && navMenu) {
  navToggle.addEventListener('click', () => {
    navMenu.classList.toggle('active');
    
    // Animate hamburger menu
    const spans = navToggle.querySelectorAll('span');
    spans.forEach((span, index) => {
      if (navMenu.classList.contains('active')) {
        if (index === 0) span.style.transform = 'rotate(45deg) translate(5px, 5px)';
        if (index === 1) span.style.opacity = '0';
        if (index === 2) span.style.transform = 'rotate(-45deg) translate(7px, -6px)';
      } else {
        span.style.transform = 'none';
        span.style.opacity = '1';
      }
    });
  });
}

// Close mobile menu when clicking on a link
if (navMenu && navToggle) {
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      navMenu.classList.remove('active');
      const spans = navToggle.querySelectorAll('span');
      spans.forEach(span => {
        span.style.transform = 'none';
        span.style.opacity = '1';
      });
    });
  });
}

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      const headerHeight = document.querySelector('.header')?.offsetHeight || 0;
      const targetPosition = target.offsetTop - headerHeight;
      
      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      });
    }
  });
});

// Copy to clipboard functionality
function copyToClipboard(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      showCopyFeedback();
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  }
}

function showCopyFeedback() {
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
    document.body.removeChild(feedback);
  }, 2000);
}

// Handle external links
document.querySelectorAll('a[href^="http"]').forEach(link => {
  if (!link.getAttribute('target')) {
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
  }
});

// Keyboard navigation enhancements
document.addEventListener('keydown', (e) => {
  // ESC key closes mobile menu
  if (e.key === 'Escape' && navMenu && navMenu.classList.contains('active')) {
    navMenu.classList.remove('active');
    const spans = navToggle?.querySelectorAll('span');
    spans?.forEach(span => {
      span.style.transform = 'none';
      span.style.opacity = '1';
    });
  }
});

// Initialize Prism.js for syntax highlighting
document.addEventListener('DOMContentLoaded', () => {
  // Ensure Prism.js is loaded and initialize syntax highlighting
  if (typeof Prism !== 'undefined') {
    Prism.highlightAll();
  }
});

// Re-highlight any dynamically added code blocks
function highlightCodeBlocks() {
  if (typeof Prism !== 'undefined') {
    Prism.highlightAll();
  }
}

console.log('Claude Good Hooks landing page loaded');