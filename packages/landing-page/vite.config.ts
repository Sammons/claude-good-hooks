import { defineConfig, UserConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(async ({ command, mode }) => {
  const config: UserConfig = {
    root: 'src',
    build: {
      outDir: '../dist',
      emptyOutDir: true,
      sourcemap: true,
      rollupOptions: {
        input: {
          main: resolve(fileURLToPath(new URL('.', import.meta.url)), 'src/index.html'),
        },
        output: {
          manualChunks(id) {
            // Create separate chunks for vendor libraries
            if (id.includes('node_modules')) {
              return 'vendor';
            }
            // Separate large custom modules
            if (id.includes('main.js') && id.includes('src/scripts')) {
              return 'main';
            }
          },
        },
      },
    },
    server: {
      port: 3000,
      open: true,
    },
    base: '/claude-good-hooks/',
    define: {
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },
  };

  // Add bundle analyzer in analyze mode
  if (mode === 'analyze') {
    try {
      const { analyzer } = await import('rollup-plugin-analyzer');
      config.build.rollupOptions.plugins = [
        analyzer({
          summaryOnly: false,
          limit: 20,
          writeTo: () => {
            console.log('Bundle analysis complete. Check the output above.');
          },
        }),
      ];
    } catch (error) {
      console.warn('Could not load rollup-plugin-analyzer:', error.message);
    }
  }

  return config;
});
