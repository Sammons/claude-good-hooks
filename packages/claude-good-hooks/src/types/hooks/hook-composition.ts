/**
 * Composition configuration for combining multiple hooks
 */
export interface HookComposition {
  name: string;
  description: string;
  hooks: Array<{
    hookName: string;
    enabled?: boolean;
    args?: Record<string, unknown>;
    order?: number;
  }>;
  conditionalLogic?: {
    type: 'and' | 'or' | 'custom';
    customCondition?: string;
  };
}
