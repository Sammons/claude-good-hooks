/**
 * Simple YAML parser for basic structures (not production-ready)
 */

import { AppError, ERROR_CODES } from '../../../errors/index.js';

export function parseSimpleYaml(content: string): any {
  // This is a very basic YAML parser
  // In production, use a proper YAML library like js-yaml
  try {
    // Convert basic YAML to JSON
    const lines = content.split('\n');
    let json = '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      if (trimmed.includes(':')) {
        const [key, ...valueParts] = trimmed.split(':');
        const value = valueParts.join(':').trim();

        if (value) {
          json += `"${key?.trim()}": ${JSON.stringify(value)},`;
        } else {
          json += `"${key?.trim()}": {`;
        }
      }
    }

    return JSON.parse('{' + json.slice(0, -1) + '}');
  } catch {
    throw new AppError('Failed to parse YAML content', {
      code: ERROR_CODES.CONFIG_INVALID,
      suggestion: 'Consider using a JSON file or simplifying the YAML structure',
    });
  }
}
