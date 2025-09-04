/**
 * Marketplace Integration Factories
 *
 * Utilities for integrating with hook marketplaces,
 * including search, rating, verification, and publishing features.
 */

import type {
  HookPlugin,
  HookMetadata,
  HookMarketplaceInfo,
  EnhancedHookPlugin,
} from '@sammons/claude-good-hooks-types';

/**
 * Search criteria for marketplace hooks
 */
export interface MarketplaceSearchCriteria {
  query?: string;
  category?: string;
  tags?: string[];
  publisher?: string;
  verified?: boolean;
  minRating?: number;
  sortBy?: 'popularity' | 'rating' | 'recent' | 'name';
  limit?: number;
  offset?: number;
}

/**
 * Search result from marketplace
 */
export interface MarketplaceSearchResult {
  hooks: MarketplaceHookInfo[];
  total: number;
  hasMore: boolean;
}

/**
 * Hook information from marketplace
 */
export interface MarketplaceHookInfo extends HookMetadata {
  marketplace: HookMarketplaceInfo;
  compatibility?: {
    claudeVersion?: string;
    nodeVersion?: string;
    platforms?: string[];
  };
}

/**
 * Hook rating and review information
 */
export interface HookRating {
  hookId: string;
  rating: number;
  review?: string;
  reviewer: string;
  timestamp: Date;
  helpful: number;
}

/**
 * Hook publishing information
 */
export interface PublishingInfo {
  readme?: string;
  changelog?: string;
  examples?: Array<{
    title: string;
    description: string;
    code: string;
  }>;
  keywords?: string[];
  maintainers?: string[];
}

/**
 * Creates a marketplace client for searching and managing hooks
 *
 * @param options - Marketplace configuration
 * @returns Marketplace client
 *
 * @example
 * ```typescript
 * import { createMarketplaceClient } from '@sammons/claude-good-hooks-factories';
 *
 * const marketplace = createMarketplaceClient({
 *   baseUrl: 'https://claude-hooks.dev/api',
 *   apiKey: 'your-api-key'
 * });
 *
 * const results = await marketplace.search({ query: 'linting' });
 * ```
 */
export function createMarketplaceClient(_options: {
  baseUrl?: string;
  apiKey?: string;
  timeout?: number;
}) {
  // These will be used for actual API calls in real implementation
  // const _baseUrl = _options.baseUrl || 'https://api.claude-good-hooks.dev';
  // const _timeout = _options.timeout || 30000;

  return {
    /**
     * Search for hooks in the marketplace
     */
    async search(criteria: MarketplaceSearchCriteria): Promise<MarketplaceSearchResult> {
      // Mock implementation - in real scenario, this would make HTTP requests
      return mockMarketplaceSearch(criteria);
    },

    /**
     * Get detailed information about a specific hook
     */
    async getHook(hookId: string): Promise<MarketplaceHookInfo | null> {
      // Mock implementation
      return mockGetHook(hookId);
    },

    /**
     * Install a hook from the marketplace
     */
    async install(
      hookId: string,
      version?: string
    ): Promise<{
      success: boolean;
      hook?: EnhancedHookPlugin;
      error?: string;
    }> {
      // Mock implementation
      return mockInstallHook(hookId, version);
    },

    /**
     * Publish a hook to the marketplace
     */
    async publish(
      plugin: HookPlugin,
      publishingInfo: PublishingInfo,
      marketplaceInfo: Partial<HookMarketplaceInfo>
    ): Promise<{
      success: boolean;
      hookId?: string;
      error?: string;
    }> {
      // Mock implementation
      return mockPublishHook(plugin, publishingInfo, marketplaceInfo);
    },

    /**
     * Rate a hook
     */
    async rateHook(
      hookId: string,
      rating: number,
      review?: string
    ): Promise<{ success: boolean; error?: string }> {
      // Mock implementation
      return mockRateHook(hookId, rating, review);
    },

    /**
     * Get ratings for a hook
     */
    async getRatings(hookId: string): Promise<HookRating[]> {
      // Mock implementation
      return mockGetRatings(hookId);
    },

    /**
     * Get featured hooks
     */
    async getFeatured(): Promise<MarketplaceHookInfo[]> {
      // Mock implementation
      return mockGetFeatured();
    },

    /**
     * Get hooks by category
     */
    async getByCategory(category: string): Promise<MarketplaceHookInfo[]> {
      // Mock implementation
      return mockGetByCategory(category);
    },
  };
}

/**
 * Creates a hook verification utility for marketplace submissions
 *
 * @param options - Verification configuration
 * @returns Verification utility
 *
 * @example
 * ```typescript
 * import { createHookVerifier } from '@sammons/claude-good-hooks-factories';
 *
 * const verifier = createHookVerifier({
 *   checkSecurity: true,
 *   validateMetadata: true,
 *   testExecution: true
 * });
 *
 * const result = await verifier.verify(hookPlugin);
 * ```
 */
export function createHookVerifier(options: {
  checkSecurity?: boolean;
  validateMetadata?: boolean;
  testExecution?: boolean;
  customChecks?: Array<(plugin: HookPlugin) => Promise<{ valid: boolean; message?: string }>>;
}) {
  return {
    /**
     * Verify a hook for marketplace submission
     */
    async verify(plugin: HookPlugin): Promise<{
      valid: boolean;
      score: number;
      issues: Array<{
        severity: 'error' | 'warning' | 'info';
        category: string;
        message: string;
      }>;
    }> {
      const issues: Array<{
        severity: 'error' | 'warning' | 'info';
        category: string;
        message: string;
      }> = [];

      let score = 100;

      // Metadata validation
      if (options.validateMetadata !== false) {
        if (!plugin.name || plugin.name.length < 3) {
          issues.push({
            severity: 'error',
            category: 'metadata',
            message: 'Hook name must be at least 3 characters long',
          });
          score -= 20;
        }

        if (!plugin.description || plugin.description.length < 10) {
          issues.push({
            severity: 'warning',
            category: 'metadata',
            message: 'Hook description should be more descriptive',
          });
          score -= 5;
        }

        if (!plugin.version) {
          issues.push({
            severity: 'error',
            category: 'metadata',
            message: 'Hook version is required',
          });
          score -= 15;
        }
      }

      // Security checks
      if (options.checkSecurity !== false) {
        const securityIssues = await performSecurityChecks(plugin);
        issues.push(...securityIssues);
        score -= securityIssues.filter(i => i.severity === 'error').length * 25;
        score -= securityIssues.filter(i => i.severity === 'warning').length * 10;
      }

      // Test execution
      if (options.testExecution !== false) {
        const testIssues = await performExecutionTests(plugin);
        issues.push(...testIssues);
        score -= testIssues.filter(i => i.severity === 'error').length * 30;
      }

      // Custom checks
      if (options.customChecks) {
        for (const check of options.customChecks) {
          try {
            const result = await check(plugin);
            if (!result.valid) {
              issues.push({
                severity: 'warning',
                category: 'custom',
                message: result.message || 'Custom validation failed',
              });
              score -= 10;
            }
          } catch (error) {
            issues.push({
              severity: 'error',
              category: 'custom',
              message: `Custom check failed: ${error}`,
            });
            score -= 15;
          }
        }
      }

      return {
        valid: issues.filter(i => i.severity === 'error').length === 0,
        score: Math.max(0, score),
        issues,
      };
    },
  };
}

/**
 * Creates a hook popularity tracker
 *
 * @param options - Tracking configuration
 * @returns Popularity tracker
 *
 * @example
 * ```typescript
 * import { createPopularityTracker } from '@sammons/claude-good-hooks-factories';
 *
 * const tracker = createPopularityTracker({
 *   trackDownloads: true,
 *   trackUsage: true,
 *   reportingInterval: 86400000 // 24 hours
 * });
 *
 * tracker.trackDownload('my-hook', '1.0.0');
 * ```
 */
export function createPopularityTracker(options: {
  trackDownloads?: boolean;
  trackUsage?: boolean;
  reportingInterval?: number;
}) {
  const downloadCounts = new Map<string, number>();
  const usageCounts = new Map<string, number>();

  return {
    /**
     * Track a hook download
     */
    trackDownload(hookName: string, version: string): void {
      if (!options.trackDownloads) return;

      const key = `${hookName}@${version}`;
      downloadCounts.set(key, (downloadCounts.get(key) || 0) + 1);
    },

    /**
     * Track hook usage
     */
    trackUsage(hookName: string): void {
      if (!options.trackUsage) return;

      usageCounts.set(hookName, (usageCounts.get(hookName) || 0) + 1);
    },

    /**
     * Get popularity metrics
     */
    getMetrics(): {
      downloads: Map<string, number>;
      usage: Map<string, number>;
      popular: string[];
    } {
      const popular = Array.from(usageCounts.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([hook]) => hook);

      return {
        downloads: new Map(downloadCounts),
        usage: new Map(usageCounts),
        popular,
      };
    },

    /**
     * Generate popularity report
     */
    generateReport(): string {
      const metrics = this.getMetrics();
      let report = '📊 Hook Popularity Report\n';
      report += '='.repeat(30) + '\n\n';

      report += '🔥 Most Popular Hooks:\n';
      metrics.popular.forEach((hook, index) => {
        const usage = metrics.usage.get(hook) || 0;
        report += `${index + 1}. ${hook} (${usage} uses)\n`;
      });

      return report;
    },
  };
}

/**
 * Creates a hook recommendation engine
 *
 * @param options - Recommendation configuration
 * @returns Recommendation engine
 *
 * @example
 * ```typescript
 * import { createRecommendationEngine } from '@sammons/claude-good-hooks-factories';
 *
 * const recommender = createRecommendationEngine({
 *   algorithm: 'collaborative',
 *   maxRecommendations: 5
 * });
 *
 * const recommendations = await recommender.recommend('user123');
 * ```
 */
export function createRecommendationEngine(_options: {
  algorithm?: 'collaborative' | 'content' | 'hybrid';
  maxRecommendations?: number;
}) {
  return {
    /**
     * Get hook recommendations for a user
     */
    async recommend(
      userId: string,
      userHooks?: string[],
      preferences?: {
        categories?: string[];
        tags?: string[];
        complexity?: 'beginner' | 'intermediate' | 'advanced';
      }
    ): Promise<MarketplaceHookInfo[]> {
      // Mock implementation
      return mockGetRecommendations(userId, userHooks, preferences);
    },

    /**
     * Get similar hooks to a given hook
     */
    async getSimilar(hookId: string, limit?: number): Promise<MarketplaceHookInfo[]> {
      // Mock implementation
      return mockGetSimilar(hookId, limit);
    },
  };
}

// Mock implementations for demonstration (would be replaced with real API calls)

async function mockMarketplaceSearch(
  criteria: MarketplaceSearchCriteria
): Promise<MarketplaceSearchResult> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100));

  const mockHooks: MarketplaceHookInfo[] = [
    {
      name: 'eslint-formatter',
      description: 'Automatically format code with ESLint',
      version: '1.2.0',
      source: 'remote',
      packageName: '@hooks/eslint-formatter',
      installed: false,
      marketplace: {
        id: 'eslint-formatter',
        publisher: 'claude-tools',
        verified: true,
        rating: 4.8,
        downloads: 15420,
        tags: ['linting', 'javascript', 'formatting'],
        category: 'Development Tools',
        lastUpdated: new Date('2024-01-15'),
      },
    },
    {
      name: 'git-committer',
      description: 'Smart Git commit message generator',
      version: '2.1.0',
      source: 'remote',
      packageName: '@hooks/git-committer',
      installed: false,
      marketplace: {
        id: 'git-committer',
        publisher: 'dev-community',
        verified: false,
        rating: 4.2,
        downloads: 8930,
        tags: ['git', 'automation', 'commits'],
        category: 'Version Control',
        lastUpdated: new Date('2024-02-01'),
      },
    },
  ];

  return {
    hooks: mockHooks.filter(hook => {
      if (
        criteria.query &&
        !hook.name.includes(criteria.query) &&
        !hook.description.includes(criteria.query)
      ) {
        return false;
      }
      if (criteria.category && hook.marketplace.category !== criteria.category) {
        return false;
      }
      if (criteria.verified !== undefined && hook.marketplace.verified !== criteria.verified) {
        return false;
      }
      return true;
    }),
    total: mockHooks.length,
    hasMore: false,
  };
}

async function mockGetHook(_hookId: string): Promise<MarketplaceHookInfo | null> {
  // Mock implementation
  return null;
}

async function mockInstallHook(
  _hookId: string,
  _version?: string
): Promise<{
  success: boolean;
  hook?: EnhancedHookPlugin;
  error?: string;
}> {
  return { success: true };
}

async function mockPublishHook(
  plugin: HookPlugin,
  _publishingInfo: PublishingInfo,
  _marketplaceInfo: Partial<HookMarketplaceInfo>
): Promise<{ success: boolean; hookId?: string; error?: string }> {
  return { success: true, hookId: `${plugin.name}-${Date.now()}` };
}

async function mockRateHook(
  _hookId: string,
  _rating: number,
  _review?: string
): Promise<{ success: boolean; error?: string }> {
  return { success: true };
}

async function mockGetRatings(_hookId: string): Promise<HookRating[]> {
  return [];
}

async function mockGetFeatured(): Promise<MarketplaceHookInfo[]> {
  return [];
}

async function mockGetByCategory(_category: string): Promise<MarketplaceHookInfo[]> {
  return [];
}

async function mockGetRecommendations(
  _userId: string,
  _userHooks?: string[],
  _preferences?: any
): Promise<MarketplaceHookInfo[]> {
  return [];
}

async function mockGetSimilar(_hookId: string, _limit?: number): Promise<MarketplaceHookInfo[]> {
  return [];
}

// Helper functions

async function performSecurityChecks(plugin: HookPlugin): Promise<
  Array<{
    severity: 'error' | 'warning' | 'info';
    category: string;
    message: string;
  }>
> {
  const issues: Array<{
    severity: 'error' | 'warning' | 'info';
    category: string;
    message: string;
  }> = [];

  // Check for dangerous commands
  const dangerousPatterns = [/rm\s+-rf/, /sudo/, /curl.*sh/, /wget.*sh/, /eval/];

  try {
    const hooks = plugin.makeHook({}, { settingsDirectoryPath: '/tmp' });
    for (const [_eventType, configurations] of Object.entries(hooks)) {
      for (const config of configurations || []) {
        for (const hook of config.hooks || []) {
          if (hook.type === 'command') {
            for (const pattern of dangerousPatterns) {
              if (pattern.test(hook.command)) {
                issues.push({
                  severity: 'warning',
                  category: 'security',
                  message: `Potentially dangerous command detected: ${pattern.source}`,
                });
              }
            }
          }
        }
      }
    }
  } catch (error) {
    issues.push({
      severity: 'error',
      category: 'security',
      message: `Failed to analyze hook security: ${error}`,
    });
  }

  return issues;
}

async function performExecutionTests(plugin: HookPlugin): Promise<
  Array<{
    severity: 'error' | 'warning' | 'info';
    category: string;
    message: string;
  }>
> {
  const issues: Array<{
    severity: 'error' | 'warning' | 'info';
    category: string;
    message: string;
  }> = [];

  try {
    // Test hook generation
    const hooks = plugin.makeHook({}, { settingsDirectoryPath: '/tmp' });

    if (!hooks || typeof hooks !== 'object') {
      issues.push({
        severity: 'error',
        category: 'execution',
        message: 'Hook makeHook function must return an object',
      });
    }

    // Test with different arguments
    const testArgs = [{}, { test: true }, { value: 'test' }];

    for (const args of testArgs) {
      try {
        const result = plugin.makeHook(args, { settingsDirectoryPath: '/tmp' });
        if (!result) {
          issues.push({
            severity: 'warning',
            category: 'execution',
            message: `Hook returns null/undefined for args: ${JSON.stringify(args)}`,
          });
        }
      } catch (error) {
        issues.push({
          severity: 'error',
          category: 'execution',
          message: `Hook throws error for args ${JSON.stringify(args)}: ${error}`,
        });
      }
    }
  } catch (error) {
    issues.push({
      severity: 'error',
      category: 'execution',
      message: `Failed to test hook execution: ${error}`,
    });
  }

  return issues;
}
