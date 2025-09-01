import { defineConfig, defineProject } from 'vitest/config';

export default defineConfig({
  projects: [
    // Main packages
    defineProject({
      test: {
        name: 'claude-good-hooks-cli',
        root: './packages/claude-good-hooks-cli',
        globals: true,
        environment: 'node',
        include: ['src/**/*.{scenario.test,test}.{ts,js}'],
        coverage: {
          provider: 'v8',
          reporter: ['text', 'json', 'html'],
          include: ['src/**/*'],
          exclude: ['src/**/*.test.ts', 'src/**/*.scenario.test.ts'],
        },
      },
    }),
    defineProject({
      test: {
        name: 'claude-good-hooks-types',
        root: './packages/claude-good-hooks-types',
        globals: true,
        environment: 'node',
        include: ['src/**/*.{scenario.test,test}.{ts,js}'],
        coverage: {
          provider: 'v8',
          reporter: ['text', 'json', 'html'],
          include: ['src/**/*'],
          exclude: ['src/**/*.test.ts', 'src/**/*.scenario.test.ts'],
        },
        typecheck: {
          enabled: true,
          tsconfig: './tsconfig.json',
        },
      },
    }),
    defineProject({
      test: {
        name: 'claude-good-hooks-factories',
        root: './packages/claude-good-hooks-factories',
        globals: true,
        environment: 'node',
        include: ['src/**/*.{scenario.test,test}.{ts,js}'],
        coverage: {
          provider: 'v8',
          reporter: ['text', 'json', 'html'],
          include: ['src/**/*'],
          exclude: ['src/**/*.test.ts', 'src/**/*.scenario.test.ts'],
        },
      },
    }),
    // Testing packages
    defineProject({
      test: {
        name: 'smoke-tests',
        root: './packages/claude-good-hooks-smoke-tests',
        globals: true,
        environment: 'node',
        include: ['src/**/*.{scenario.test,test}.{ts,js}'],
        testTimeout: 30000,
      },
    }),
    // Integration tests
    defineProject({
      test: {
        name: 'integration-tests',
        root: './integration-tests',
        globals: true,
        environment: 'node',
        include: ['**/*.{scenario.test,test}.{ts,js}'],
        testTimeout: 15000,
      },
    }),
  ],
  test: {
    // Global test configuration
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
    },
  },
});
