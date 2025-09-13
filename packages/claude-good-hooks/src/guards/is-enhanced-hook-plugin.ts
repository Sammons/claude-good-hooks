import type { EnhancedHookPlugin } from '../types/hooks/enhanced-hook-plugin.js';
import { isHookPlugin } from './is-hook-plugin.js';

export function isEnhancedHookPlugin(obj: unknown): obj is EnhancedHookPlugin {
  return isHookPlugin(obj);
}