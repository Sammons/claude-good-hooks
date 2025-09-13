/**
 * Version information for hooks with semantic versioning support
 */
export interface HookVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  build?: string;
}