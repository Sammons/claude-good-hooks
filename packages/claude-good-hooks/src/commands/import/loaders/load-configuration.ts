/**
 * Load configuration from file or URL
 */

import { readFileSync, existsSync } from 'fs';
import { extname } from 'path';
import { AppError, ERROR_CODES } from '../../../errors/index.js';
import type { ClaudeSettings } from '../../../types/index.js';
import { isClaudeSettings } from '../../../types/index.js';
import { parseSimpleYaml } from './parse-simple-yaml.js';

export interface ImportedConfiguration {
  version?: string;
  metadata?: {
    exported?: string;
    source?: string[];
    generator?: string;
    description?: string;
  };
  settings: ClaudeSettings | Record<string, ClaudeSettings>;
}

export async function loadConfiguration(source: string): Promise<ImportedConfiguration> {
  let content: string;

  if (source.startsWith('http://') || source.startsWith('https://')) {
    // Load from URL
    try {
      const response = await fetch(source);
      if (!response.ok) {
        throw new AppError(`HTTP ${response.status}: ${response.statusText}`, {
          code: ERROR_CODES.NETWORK_ERROR,
        });
      }
      content = await response.text();
    } catch (error) {
      throw new AppError(`Failed to fetch from URL: ${error}`, {
        code: ERROR_CODES.NETWORK_ERROR,
        cause: error instanceof Error ? error : undefined,
      });
    }
  } else {
    // Load from file
    if (!existsSync(source)) {
      throw new AppError(`File not found: ${source}`, {
        code: ERROR_CODES.FILE_NOT_FOUND,
        suggestion: 'Check that the file path is correct and the file exists',
      });
    }

    try {
      content = readFileSync(source, 'utf8');
    } catch (error) {
      throw new AppError(`Failed to read file: ${error}`, {
        code: ERROR_CODES.FILE_READ_FAILED,
        cause: error instanceof Error ? error : undefined,
      });
    }
  }

  // Parse content based on file extension or detect format
  const ext = extname(source).toLowerCase();
  let parsed: any;

  try {
    if (ext === '.json' || content.trim().startsWith('{')) {
      parsed = JSON.parse(content);
    } else if (ext === '.yaml' || ext === '.yml') {
      // Simple YAML parsing for basic structure
      // In production, you'd use a proper YAML parser
      parsed = parseSimpleYaml(content);
    } else {
      // Try JSON first, then YAML
      try {
        parsed = JSON.parse(content);
      } catch {
        parsed = parseSimpleYaml(content);
      }
    }
  } catch (error) {
    throw new AppError(`Failed to parse configuration: ${error}`, {
      code: ERROR_CODES.CONFIG_INVALID,
      cause: error instanceof Error ? error : undefined,
    });
  }

  // Normalize configuration structure
  if (isClaudeSettings(parsed)) {
    // Direct settings object
    return {
      version: '1.0.0',
      settings: parsed,
    };
  } else if (parsed.settings) {
    // Full export format
    return parsed as ImportedConfiguration;
  } else {
    throw new AppError('Invalid configuration format', {
      code: ERROR_CODES.CONFIG_INVALID,
      suggestion: 'Ensure the configuration file is valid JSON or YAML',
    });
  }
}
