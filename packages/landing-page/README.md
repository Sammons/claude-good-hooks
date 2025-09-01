# Claude Good Hooks Landing Page

This package contains the professional landing page and documentation site for Claude Good Hooks, built with Vite and designed for GitHub Pages deployment.

## Features

- 🚀 Fast static site generation with Vite
- 📱 Fully responsive design with modern CSS
- ♿ Accessible navigation and keyboard support
- 🎨 Professional design with clean typography
- 📋 Copy-to-clipboard functionality for code examples
- 🔍 SEO optimized with proper meta tags
- ⚡ Performance optimized with lazy loading and debounced scroll events
- 🌙 Print-friendly styles

## Development

### Prerequisites

- Node.js 20+
- pnpm 9+

### Getting Started

```bash
# Install dependencies
pnpm install

# Start development server
pnpm run dev

# Build for production
pnpm run build

# Build for GitHub Pages (outputs to ../../docs)
pnpm run build:docs

# Preview production build
pnpm run preview
```

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
- Edit GitHub workflow in `/.github/workflows/deploy-docs.yml`

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