import type { PackageManagerHelper } from '../helpers/package-manager-helper.js';

export async function getInstalledHookModules(
  packageManagerHelper: PackageManagerHelper,
  global: boolean = false
): Promise<string[]> {
  try {
    const data = await packageManagerHelper.listModules({
      global,
      depth: 0,
    });

    const dependencies = data.dependencies || {};
    return Object.keys(dependencies).filter(
      name => name.includes('claude') && name.includes('hook')
    );
  } catch (error) {
    throw new Error(`Failed to get installed hook modules (global: ${global}): ${String(error)}`);
  }
}