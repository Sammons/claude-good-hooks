/**
 * Marketplace information for hooks
 */
export interface HookMarketplaceInfo {
  id: string;
  publisher: string;
  verified?: boolean;
  rating?: number;
  downloads?: number;
  tags?: string[];
  category?: string;
  homepage?: string;
  repository?: string;
  license?: string;
  lastUpdated?: Date;
}
