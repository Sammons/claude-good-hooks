export function isNpmPackage(packageName: string): boolean {
  // Basic npm package name validation
  // Supports scoped packages like @scope/package-name
  const npmPackageRegex = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
  return typeof packageName === 'string' && npmPackageRegex.test(packageName);
}