/**
 * Version compatibility checker configuration
 */
export interface VersionCompatibility {
  minimumVersion?: string;
  maximumVersion?: string;
  excludedVersions?: string[];
  requiredFeatures?: string[];
}