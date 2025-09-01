// Bundle Prism.js syntax highlighting
import Prism from 'prismjs';
import 'prismjs/components/prism-bash.min.js';
import 'prismjs/components/prism-javascript.min.js';
import 'prismjs/components/prism-json.min.js';
import 'prismjs/themes/prism-tomorrow.min.css';
import 'prismjs/plugins/line-numbers/prism-line-numbers.min.css';
import 'prismjs/plugins/line-numbers/prism-line-numbers.min.js';

// Make Prism available globally
window.Prism = Prism;

// Auto-highlight code blocks on load
document.addEventListener('DOMContentLoaded', () => {
  Prism.highlightAll();
});

export default Prism;