/**
 * Atomic file operations for safe configuration management
 */

import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  unlinkSync,
  renameSync,
  copyFileSync,
} from 'fs';
import { join, dirname, basename } from 'path';
import { randomBytes } from 'crypto';
import type { VersionedClaudeSettings } from './schemas/index.js';
import { validateSettingsComprehensive } from './validation.js';

export interface AtomicOperationOptions {
  backup?: boolean;
  validateBeforeWrite?: boolean;
  createDirectories?: boolean;
  encoding?: BufferEncoding;
}

export interface AtomicOperationResult {
  success: boolean;
  backupPath?: string;
  error?: Error;
  validationErrors?: Array<{
    path: string;
    message: string;
    value?: unknown;
  }>;
}

/**
 * Generates a unique temporary file path
 */
function generateTempPath(originalPath: string): string {
  const dir = dirname(originalPath);
  const ext = basename(originalPath);
  const timestamp = Date.now();
  const random = randomBytes(4).toString('hex');
  return join(dir, `.${ext}.tmp.${timestamp}.${random}`);
}

/**
 * Generates a backup file path
 */
function generateBackupPath(originalPath: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${originalPath}.backup.${timestamp}`;
}

/**
 * Ensures directory exists, creating it if necessary
 */
function ensureDirectoryExists(filePath: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * Safely reads a file with error handling
 */
export function atomicReadFile(
  filePath: string,
  options: { encoding?: BufferEncoding; defaultValue?: string } = {}
): { success: boolean; content?: string; error?: Error } {
  try {
    if (!existsSync(filePath)) {
      return {
        success: true,
        content: options.defaultValue || '{}',
      };
    }

    const content = readFileSync(filePath, options.encoding || 'utf-8');
    return { success: true, content };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}

/**
 * Atomically writes content to a file using a temporary file strategy
 */
export function atomicWriteFile(
  filePath: string,
  content: string,
  options: AtomicOperationOptions = {}
): AtomicOperationResult {
  const {
    backup = true,
    validateBeforeWrite = true,
    createDirectories = true,
    encoding = 'utf-8',
  } = options;

  let tempPath: string | undefined;
  let backupPath: string | undefined;

  try {
    // Create directories if needed
    if (createDirectories) {
      ensureDirectoryExists(filePath);
    }

    // Validate content if requested
    if (validateBeforeWrite) {
      try {
        const parsed = JSON.parse(content);
        const validation = validateSettingsComprehensive(parsed);

        if (!validation.valid) {
          return {
            success: false,
            validationErrors: validation.errors,
            error: new Error(
              `Validation failed: ${validation.errors.map(e => e.message).join(', ')}`
            ),
          };
        }
      } catch (parseError) {
        return {
          success: false,
          error: new Error(`Invalid JSON: ${(parseError as Error).message}`),
        };
      }
    }

    // Create backup if file exists and backup is requested
    if (backup && existsSync(filePath)) {
      backupPath = generateBackupPath(filePath);
      copyFileSync(filePath, backupPath);
    }

    // Write to temporary file first
    tempPath = generateTempPath(filePath);
    writeFileSync(tempPath, content, encoding);

    // Validate the written file by reading it back
    const readBack = readFileSync(tempPath, encoding);
    if (readBack !== content) {
      throw new Error('Written content does not match expected content');
    }

    // Atomically move temporary file to target location
    renameSync(tempPath, filePath);

    const result: AtomicOperationResult = { success: true };
    if (backupPath) {
      result.backupPath = backupPath;
    }
    return result;
  } catch (error) {
    // Clean up temporary file if it exists
    if (tempPath && existsSync(tempPath)) {
      try {
        unlinkSync(tempPath);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
    }

    const result: AtomicOperationResult = {
      success: false,
      error: error as Error,
    };
    if (backupPath) {
      result.backupPath = backupPath;
    }
    return result;
  }
}

/**
 * Atomically writes JSON settings with proper formatting
 */
export function atomicWriteSettings(
  filePath: string,
  settings: VersionedClaudeSettings,
  options: AtomicOperationOptions = {}
): AtomicOperationResult {
  try {
    const content = JSON.stringify(settings, null, 2);
    return atomicWriteFile(filePath, content, options);
  } catch (error) {
    return {
      success: false,
      error: new Error(`Failed to serialize settings: ${(error as Error).message}`),
    };
  }
}

/**
 * Atomically updates settings by reading, modifying, and writing back
 */
export function atomicUpdateSettings(
  filePath: string,
  updateFn: (settings: VersionedClaudeSettings) => VersionedClaudeSettings,
  options: AtomicOperationOptions = {}
): AtomicOperationResult {
  try {
    // Read current settings
    const readResult = atomicReadFile(filePath);
    if (!readResult.success) {
      return {
        success: false,
        error: new Error(`Failed to read settings: ${readResult.error?.message}`),
      };
    }

    // Parse current settings
    let currentSettings: VersionedClaudeSettings;
    try {
      currentSettings = JSON.parse(readResult.content || '{}');
    } catch (parseError) {
      return {
        success: false,
        error: new Error(`Invalid JSON in settings file: ${(parseError as Error).message}`),
      };
    }

    // Apply update function
    const updatedSettings = updateFn(currentSettings);

    // Update the modification timestamp
    if (!updatedSettings.meta) {
      updatedSettings.meta = {};
    }
    updatedSettings.meta.updatedAt = new Date().toISOString();

    // Write updated settings
    return atomicWriteSettings(filePath, updatedSettings, options);
  } catch (error) {
    return {
      success: false,
      error: error as Error,
    };
  }
}

/**
 * Rollback to a backup file
 */
export function rollbackFromBackup(filePath: string, backupPath: string): AtomicOperationResult {
  try {
    if (!existsSync(backupPath)) {
      return {
        success: false,
        error: new Error(`Backup file does not exist: ${backupPath}`),
      };
    }

    copyFileSync(backupPath, filePath);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error as Error,
    };
  }
}

/**
 * Clean up old backup files (keep only the most recent N backups)
 */
export function cleanupBackups(filePath: string, keepCount: number = 5): void {
  const dir = dirname(filePath);
  const baseName = basename(filePath);

  try {
    if (!existsSync(dir)) {
      return;
    }

    const { readdirSync, statSync } = require('fs');
    const files = readdirSync(dir)
      .filter((file: string) => file.startsWith(`${baseName}.backup.`))
      .map((file: string) => ({
        name: file,
        path: join(dir, file),
        mtime: statSync(join(dir, file)).mtime,
      }))
      .sort((a: { mtime: Date }, b: { mtime: Date }) => b.mtime.getTime() - a.mtime.getTime()); // Sort by newest first

    // Remove old backups beyond keepCount
    const filesToDelete = files.slice(keepCount);
    for (const file of filesToDelete) {
      try {
        unlinkSync(file.path);
      } catch (error) {
        // Ignore individual deletion errors
      }
    }
  } catch (error) {
    // Ignore cleanup errors
  }
}

/**
 * Verify file integrity by checking if it's valid JSON and can be parsed
 */
export function verifyFileIntegrity(filePath: string): {
  valid: boolean;
  error?: Error;
  settings?: VersionedClaudeSettings;
} {
  try {
    if (!existsSync(filePath)) {
      return { valid: false, error: new Error('File does not exist') };
    }

    const content = readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(content);
    const validation = validateSettingsComprehensive(parsed);

    if (!validation.valid) {
      return {
        valid: false,
        error: new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`),
      };
    }

    const result: { valid: boolean; error?: Error; settings?: VersionedClaudeSettings } = {
      valid: true,
    };
    if (validation.settings) {
      result.settings = validation.settings;
    }
    return result;
  } catch (error) {
    return { valid: false, error: error as Error };
  }
}