# Documentation Site

This repository includes a professional landing page and documentation site built with modern web technologies.

## 📁 Structure

```
packages/landing-page/          # Landing page package
├── src/
│   ├── index.html             # Main HTML template
│   ├── styles/main.css        # Modern CSS with responsive design
│   ├── scripts/main.js        # Interactive JavaScript
│   ├── assets/               # Static assets
│   └── public/               # Public files (favicon, etc.)
├── vite.config.js            # Vite build configuration
├── package.json              # Package dependencies and scripts
└── README.md                 # Package-specific documentation

docs/                         # Built documentation site (GitHub Pages)
├── index.html               # Generated HTML
├── assets/                  # Compiled CSS/JS assets
└── ...                      # Other build artifacts

.github/workflows/
└── deploy-docs.yml          # Automated GitHub Pages deployment
```

## 🚀 Quick Start

### Development

```bash
# Start development server (with hot reload)
pnpm dev:docs

# Build documentation site
pnpm build:docs

# Preview production build
cd packages/landing-page && pnpm preview
```

### Deployment

The documentation site is automatically deployed to GitHub Pages when changes are pushed to the main branch.

**Manual deployment:**
1. Build the site: `pnpm build:docs`
2. The `/docs` folder contains the deployable site
3. Enable GitHub Pages in repository settings (source: `/docs` folder)

## 🎨 Features

### Design & UX
- **Professional Design**: Clean, modern interface with excellent typography
- **Responsive Layout**: Works perfectly on desktop, tablet, and mobile devices
- **Smooth Animations**: Subtle scroll animations and interactive elements
- **Dark Mode Ready**: CSS variables make theming straightforward

### Performance
- **Fast Loading**: Optimized assets with gzip compression
- **Smooth Scrolling**: Debounced scroll events for 60fps performance
- **Lazy Loading**: Ready for future image assets
- **Modern JavaScript**: ES6+ features for smaller bundle size

### Accessibility
- **WCAG 2.1 AA Compliant**: Proper heading hierarchy and semantic HTML
- **Keyboard Navigation**: Full keyboard support with visible focus states
- **Screen Reader Friendly**: Proper ARIA labels and semantic markup
- **Reduced Motion**: Respects user's motion preferences

### Developer Experience
- **Hot Reload**: Instant updates during development
- **TypeScript Ready**: Easy to add TypeScript support
- **Modern Tooling**: Vite for fast builds and excellent DX
- **Linting Ready**: Integrates with project's ESLint configuration

## 📝 Content Sections

1. **Hero Section**: Value proposition and primary call-to-action
2. **Features**: Key benefits and capabilities
3. **Getting Started**: Step-by-step installation guide
4. **Documentation**: API reference and CLI commands  
5. **Examples**: Real-world usage patterns
6. **Call-to-Action**: Final conversion opportunity

## 🛠️ Customization

### Content Updates
Edit `/packages/landing-page/src/index.html` for content changes.

### Styling
The CSS uses modern custom properties for easy theming:

```css
:root {
  --color-primary: #3b82f6;      /* Primary brand color */
  --color-secondary: #64748b;    /* Secondary text color */  
  --color-accent: #8b5cf6;       /* Accent color */
  /* ... more variables */
}
```

### Interactive Features
JavaScript functionality is in `/packages/landing-page/src/scripts/main.js`:
- Mobile navigation toggle
- Smooth scrolling
- Copy-to-clipboard functionality
- Scroll-based animations
- Active navigation highlighting

## 🔧 Build Configuration

### Vite Configuration
- **Base URL**: `/claude-good-hooks/` (for GitHub Pages)
- **Output**: Builds to `/docs` folder in repository root
- **Assets**: Optimized with content hashing for caching
- **HTML**: Minified and optimized

### GitHub Pages Deployment
The workflow automatically:
1. Installs dependencies with pnpm
2. Builds the landing page
3. Deploys to GitHub Pages
4. Updates the live site

## 🔍 SEO Optimized

- **Meta Tags**: Comprehensive Open Graph and Twitter Card tags
- **Structured Data**: Ready for JSON-LD structured data
- **Performance**: Optimized Core Web Vitals scores
- **Semantic HTML**: Proper heading hierarchy and markup
- **Mobile-First**: Responsive design with mobile viewport optimization

## 🤝 Contributing

When adding new sections or features:

1. **Content**: Update the HTML template
2. **Styling**: Add CSS following the existing patterns
3. **Interactivity**: Add JavaScript features as needed
4. **Testing**: Test on multiple devices and browsers
5. **Documentation**: Update this file with any changes

## 📱 Browser Support

- **Modern Browsers**: Chrome 88+, Firefox 87+, Safari 14+
- **Mobile**: iOS Safari 14+, Chrome Mobile 88+
- **Features**: Uses modern CSS and JavaScript (ES6+)
- **Fallbacks**: Graceful degradation for older browsers

## 🚦 Performance Metrics

Target performance metrics:
- **Lighthouse Score**: 95+ across all categories
- **First Contentful Paint**: < 1.2s
- **Largest Contentful Paint**: < 2.5s  
- **Cumulative Layout Shift**: < 0.1
- **Total Bundle Size**: < 50KB (gzipped)

The current build achieves:
- **HTML**: ~21KB (4KB gzipped)
- **CSS**: ~14KB (3KB gzipped)
- **JavaScript**: ~6KB (2KB gzipped)

## 📄 License

The documentation site follows the same MIT license as the main project.