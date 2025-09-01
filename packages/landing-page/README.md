# Claude Good Hooks Landing Page

![Bundle Size](https://img.shields.io/badge/bundle%20size-23.8%20KB-brightgreen?logo=webpack&logoColor=white)
![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![Performance](https://img.shields.io/badge/lighthouse-100-brightgreen)

A high-performance landing page for the Claude Good Hooks project, built with modern web technologies and optimized for speed and user experience.

## Features

- 🚀 **High Performance**: Optimized bundle sizes with lazy loading
- 📱 **Responsive Design**: Mobile-first, works on all devices  
- 🎨 **Dark/Light Mode**: Automatic theme detection with manual toggle
- 🔍 **Interactive Search**: Keyboard shortcuts and fuzzy matching
- 🛝 **Live Playground**: Try hooks without installation
- ♿ **Accessibility**: WCAG 2.1 compliant
- 🎯 **SEO Optimized**: Meta tags, Open Graph, and semantic HTML

## Bundle Optimization

This project implements advanced bundle optimization strategies:

### Performance Metrics
- **Total Bundle Size**: 23.8 KB (gzipped)
- **JavaScript**: 19 KB (gzipped) - 38.9% of budget
- **CSS**: 4.8 KB (gzipped) - 49.0% of budget
- **Code Splitting**: 7 chunks with lazy loading
- **External Dependencies**: Minimized to 6 resources

### Optimization Features
- **Lazy Loading**: Features load on-demand using Intersection Observer
- **Code Splitting**: Modular architecture with dynamic imports
- **Tree Shaking**: Eliminates unused code automatically
- **Asset Optimization**: Minification, compression, and source maps

## Development

### Prerequisites

- Node.js 20+
- pnpm 9+

### Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Available Scripts

```bash
# Development
npm run dev          # Start dev server at http://localhost:3000
npm run preview      # Preview production build

# Building  
npm run build        # Production build
npm run build:docs   # Build for GitHub Pages
npm run build:check  # Build and check bundle budgets

# Analysis
npm run analyze      # Generate bundle analysis report
npm run budget:check # Check bundle size budgets  
npm run badge        # Generate bundle size badge
```

### Bundle Analysis

The project includes comprehensive bundle monitoring:

```bash
# Detailed bundle breakdown
npm run build:analyze

# Budget compliance check
npm run build:check
```

Output includes:
- File-by-file size breakdown
- Bundle budget status
- Optimization recommendations
- External dependency analysis

### From the workspace root

```bash
# Start development server
pnpm run dev:docs

# Build documentation site
pnpm run build:docs
```

## Deployment

The landing page is automatically deployed to GitHub Pages via GitHub Actions when changes are pushed to the main branch.

### Manual Deployment

1. Build the documentation site:
   ```bash
   pnpm run build:docs
   ```

2. The built site will be output to `/docs` in the repository root

3. Enable GitHub Pages in repository settings:
   - Go to Settings > Pages
   - Select "Deploy from a branch"
   - Choose "main" branch and "/docs" folder
   - Save settings

## Structure

```
packages/landing-page/
├── src/
│   ├── index.html          # Main HTML template
│   ├── styles/
│   │   └── main.css        # Comprehensive CSS with responsive design
│   ├── scripts/
│   │   └── main.js         # Interactive JavaScript features
│   ├── assets/            # Static assets (images, icons, etc.)
│   └── public/            # Public assets (favicon, etc.)
├── vite.config.js         # Vite configuration
├── package.json           # Package configuration
└── README.md              # This file
```

## Content Sections

The landing page includes the following sections:

1. **Hero Section** - Main value proposition and call-to-action
2. **Features** - Key benefits and capabilities
3. **Getting Started** - Step-by-step installation guide
4. **Documentation** - API reference and CLI commands
5. **Examples** - Real-world usage examples
6. **Call-to-Action** - Final conversion section

## Customization

### Updating Content

- Edit `/src/index.html` for content changes
- Modify `/src/styles/main.css` for styling changes
- Update `/src/scripts/main.js` for interactive features

### Configuration

- Update `vite.config.js` for build settings
- Modify `package.json` for dependencies and scripts
- Edit GitHub workflow in `/.github/workflows/pages.yml`

### Styling

The CSS uses modern CSS custom properties (CSS variables) for easy theming:

```css
:root {
  --color-primary: #3b82f6;
  --color-secondary: #64748b;
  --color-accent: #8b5cf6;
  /* ... more variables */
}
```

## Browser Support

- Chrome/Edge 88+
- Firefox 87+
- Safari 14+
- Mobile browsers with modern feature support

## Performance

- Optimized CSS with minimal unused styles
- Debounced scroll events for smooth performance
- Lazy loading for future image assets
- Efficient JavaScript with modern ES6+ features
- Gzip compression in production builds

## SEO Features

- Semantic HTML structure
- Proper heading hierarchy
- Meta tags for social sharing
- Structured data ready
- Performance optimized for Core Web Vitals

## Accessibility

- WCAG 2.1 AA compliant
- Keyboard navigation support
- Screen reader friendly
- High contrast mode support
- Reduced motion preferences respected
- Proper focus management

## License

MIT License - see the root repository LICENSE file for details.