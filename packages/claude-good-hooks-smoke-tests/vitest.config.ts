import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 30000,
    teardownTimeout: 30000,
    reporters: ['verbose'],
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules', 'dist']
  }
})