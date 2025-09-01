# Bundle Optimization Guide

This document outlines the bundle optimization strategies implemented for the Claude Good Hooks landing page and provides guidance for maintaining optimal bundle sizes.

## Current Bundle Status

After optimization, the bundle has been significantly improved:

### Before Optimization
- **Total Size**: ~34 KB (gzipped: ~8.8 KB)
- **JavaScript**: ~4.8 KB (gzipped)
- **CSS**: ~4 KB (gzipped)
- **External Dependencies**: 8 CDN resources
- **Code Splitting**: None

### After Optimization
- **Total Size**: ~24 KB (gzipped)
- **JavaScript**: ~19 KB (gzipped)
- **CSS**: ~4.8 KB (gzipped)
- **External Dependencies**: 6 resources (reduced Google Fonts + Prism bundled)
- **Code Splitting**: 7 chunks with lazy loading

## Optimization Strategies Implemented

### 1. Code Splitting and Lazy Loading

#### Module Organization
The JavaScript codebase has been split into focused modules:

- `main.js` - Core entry point with lazy loading orchestration
- `navigation.js` - Mobile navigation and smooth scrolling
- `search.js` - Search functionality (loaded on first interaction)
- `theme.js` - Dark/light mode switching (loaded immediately)
- `playground.js` - Interactive playground (loaded when section is visible)
- `utils.js` - Utility functions and GitHub stats
- `prism-setup.js` - Syntax highlighting (loaded when code blocks are visible)

#### Lazy Loading Strategy
Features are loaded on-demand using several triggers:

```javascript
// Intersection Observer for viewport-based loading
const observer = new IntersectionObserver(async (entries) => {
  entries.forEach(async (entry) => {
    if (entry.isIntersecting && !loaded) {
      await initializeFeature('playground');
      loaded = true;
    }
  });
}, { rootMargin: '100px' });

// Event-based loading
element.addEventListener('click', async () => {
  if (!loaded) {
    await initializeFeature('search');
    loaded = true;
  }
});
```

### 2. External Dependency Optimization

#### Before
- Prism.js loaded from CDN (3 files)
- Google Fonts (3 requests)
- No bundling optimization

#### After
- Prism.js bundled locally with tree shaking
- Google Fonts optimized with `display=swap`
- Critical features loaded immediately, non-critical lazily

### 3. Bundle Splitting Configuration

```javascript
// vite.config.js
rollupOptions: {
  output: {
    manualChunks(id) {
      // Separate vendor libraries
      if (id.includes('node_modules')) {
        return 'vendor';
      }
      // Separate large custom modules
      if (id.includes('main.js') && id.includes('src/scripts')) {
        return 'main';
      }
    },
  },
}
```

### 4. Asset Optimization

- **Source maps**: Generated for development, optimized for production
- **Compression**: Gzip enabled for all assets
- **Tree shaking**: Enabled for unused code elimination
- **Minification**: Automatic for production builds

## Bundle Size Budgets

### Budget Configuration
Located in `bundle-budget.json`:

```json
{
  "budgets": {
    "javascript": { "budget": 50000 },
    "css": { "budget": 10000 },
    "total": { "budget": 100000 },
    "individual": {
      "javascript": 20000,
      "css": 15000
    }
  },
  "warnings": {
    "javascript": 40000,
    "css": 8000,
    "total": 80000
  }
}
```

### Current Status
✅ **JavaScript**: 19 KB / 48.8 KB (38.9%)
✅ **CSS**: 4.8 KB / 9.8 KB (49.0%)
✅ **Total**: 23.8 KB / 97.7 KB (24.4%)

## Monitoring and CI Integration

### Automated Checks
- **GitHub Actions**: Bundle size checked on every PR
- **Budget Enforcement**: Build fails if budgets are exceeded
- **Trend Tracking**: Bundle size reports generated for each build

### Scripts Available
```bash
# Build and analyze bundle
npm run build:analyze

# Check against budgets
npm run build:check

# Only check budgets (requires existing build)
npm run budget:check
```

### Bundle Analysis Output
The bundle analyzer provides:
- File-by-file breakdown
- Gzip size comparisons
- Budget status indicators
- Optimization recommendations
- External dependency analysis

## Performance Impact

### Loading Performance
- **Initial Load**: Only critical CSS and navigation JavaScript
- **Interactive Features**: Loaded on-demand when needed
- **Code Highlighting**: Loaded when code blocks come into view
- **Search**: Loaded on first search interaction

### User Experience Improvements
- **No Flash of Unstyled Content**: Theme loads immediately
- **Progressive Enhancement**: Core functionality works without JavaScript
- **Smooth Interactions**: Features pre-load before user needs them

## Maintenance Guidelines

### Adding New Features
1. **Assess criticality**: Is this needed for initial page load?
2. **Consider lazy loading**: Can this be loaded when needed?
3. **Check bundle impact**: Run `npm run build:check` after changes
4. **Update budgets**: Adjust if necessary with justification

### Monitoring Bundle Growth
1. **Review PR comments**: CI posts bundle size reports
2. **Watch for warnings**: Budget warnings indicate approaching limits
3. **Regular analysis**: Run `npm run build:analyze` periodically
4. **Investigate large files**: Files >10KB should be reviewed

### External Dependencies
- **Minimize CDN requests**: Bundle critical dependencies
- **Optimize font loading**: Use `display=swap` for web fonts
- **Consider alternatives**: Lighter libraries when possible

## Optimization Techniques Used

### 1. Dynamic Imports
```javascript
// Load modules only when needed
const { SearchManager } = await import('./search.js');
```

### 2. Intersection Observer
```javascript
// Load features when elements become visible
const observer = new IntersectionObserver(callback, {
  rootMargin: '100px' // Pre-load slightly before needed
});
```

### 3. Event-Based Loading
```javascript
// Load on first user interaction
element.addEventListener('click', async () => {
  if (!loaded) {
    manager = await loadFeature();
  }
});
```

### 4. Tree Shaking Optimization
```javascript
// Import only what's needed
import { SearchManager } from './search.js';
// Not: import * from './search.js';
```

## Future Optimization Opportunities

### 1. Critical CSS Extraction
- Extract above-the-fold CSS
- Inline critical styles
- Load remaining CSS asynchronously

### 2. Image Optimization
- Add WebP support with fallbacks
- Implement lazy loading for images
- Use appropriate sizing and compression

### 3. Service Worker
- Cache static assets
- Enable offline functionality
- Pre-cache critical resources

### 4. HTTP/2 Push
- Push critical resources
- Optimize request prioritization

## Troubleshooting

### Bundle Size Regression
1. Check `git diff` for new dependencies
2. Run bundle analyzer to identify growth areas
3. Review recent commits for large additions
4. Consider code splitting for new features

### Build Failures
1. Verify all imports are correct
2. Check for circular dependencies
3. Ensure all dynamic imports are awaited
4. Review bundle budget limits

### Performance Issues
1. Check network tab for loading sequence
2. Verify lazy loading is working
3. Monitor Core Web Vitals
4. Test on slower connections

---

*This guide should be updated whenever significant changes are made to the bundle optimization strategy.*