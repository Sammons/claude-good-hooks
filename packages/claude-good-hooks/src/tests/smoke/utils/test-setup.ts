import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { testConfiguration } from '../fixtures/import-export-test-config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const testDir = path.join(__dirname, '../../../static-test-assets/backups');
export const configPath = path.join(testDir, 'test-config.json');
export const exportedPath = path.join(testDir, 'exported-config.json');
export const reimportPath = path.join(testDir, 'reimported-config.json');

export async function setupTestFiles() {
  // Create temporary directory for tests
  await fs.mkdir(testDir, { recursive: true });

  // Write the test configuration to a file
  await fs.writeFile(configPath, JSON.stringify(testConfiguration, null, 2), 'utf8');
}

export async function cleanupTestFiles() {
  // Clean up temporary directory
  try {
    await fs.rm(testDir, { recursive: true, force: true });
  } catch (error) {
    console.warn('Failed to clean up import/export test directory:', error);
  }

  // Also clean up any .claude directories that might have been created
  try {
    await fs.rm('.claude', { recursive: true, force: true });
  } catch {
    // Ignore - directory might not exist
  }
}
