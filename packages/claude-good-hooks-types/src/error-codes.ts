/**
 * Central registry of error codes for claude-good-hooks
 * 
 * Format: CGH-{AREA}-{NUMBER}
 * - CGH: Claude Good Hooks
 * - AREA: Functional area (CLI, HOOK, CFG, etc.)
 * - NUMBER: Sequential number (001-999)
 * 
 * Number Ranges:
 * - 001-099: Common errors
 * - 100-199: Feature-specific errors  
 * - 200-299: Integration errors
 * - 900-999: Internal/debug errors
 */

export const ERROR_CODES = {
  // Command Line Interface Errors
  CLI: {
    // Common CLI errors (001-099)
    CONFIG_NOT_FOUND: 'CGH-CLI-001',
    INVALID_COMMAND: 'CGH-CLI-002', 
    MISSING_ARGUMENT: 'CGH-CLI-003',
    INVALID_ARGUMENT: 'CGH-CLI-004',
    COMMAND_FAILED: 'CGH-CLI-005',
    UNSUPPORTED_OPTION: 'CGH-CLI-006',
    CONFLICTING_OPTIONS: 'CGH-CLI-007',
    
    // Feature-specific CLI errors (100-199)
    INIT_FAILED: 'CGH-CLI-100',
    APPLY_FAILED: 'CGH-CLI-101',
    VALIDATE_FAILED: 'CGH-CLI-102',
    EXPORT_FAILED: 'CGH-CLI-103',
    IMPORT_FAILED: 'CGH-CLI-104',
    UPDATE_FAILED: 'CGH-CLI-105',
    DEBUG_FAILED: 'CGH-CLI-106',
    
    // Integration errors (200-299)
    GIT_INTEGRATION_FAILED: 'CGH-CLI-200',
    PACKAGE_MANAGER_FAILED: 'CGH-CLI-201',
    
    // Internal errors (900-999)
    INTERNAL_ERROR: 'CGH-CLI-900',
    UNEXPECTED_ERROR: 'CGH-CLI-901'
  },

  // Hook System Errors
  HOOK: {
    // Common hook errors (001-099)
    EXECUTION_FAILED: 'CGH-HOOK-001',
    NOT_FOUND: 'CGH-HOOK-002',
    INVALID_CONFIG: 'CGH-HOOK-003',
    LOAD_FAILED: 'CGH-HOOK-004',
    TIMEOUT: 'CGH-HOOK-005',
    PERMISSION_DENIED: 'CGH-HOOK-006',
    DEPENDENCY_MISSING: 'CGH-HOOK-007',
    
    // Feature-specific hook errors (100-199)
    PRE_COMMIT_FAILED: 'CGH-HOOK-100',
    PRE_PUSH_FAILED: 'CGH-HOOK-101',
    POST_COMMIT_FAILED: 'CGH-HOOK-102',
    POST_MERGE_FAILED: 'CGH-HOOK-103',
    CUSTOM_HOOK_FAILED: 'CGH-HOOK-104',
    
    // Integration errors (200-299)
    GIT_HOOK_CONFLICT: 'CGH-HOOK-200',
    PACKAGE_SCRIPT_CONFLICT: 'CGH-HOOK-201',
    
    // Internal errors (900-999)
    HOOK_INTERNAL_ERROR: 'CGH-HOOK-900'
  },

  // Configuration Errors
  CFG: {
    // Common config errors (001-099)
    FILE_NOT_FOUND: 'CGH-CFG-001',
    INVALID_JSON: 'CGH-CFG-002',
    INVALID_YAML: 'CGH-CFG-003',
    SCHEMA_VALIDATION_FAILED: 'CGH-CFG-004',
    MISSING_REQUIRED_FIELD: 'CGH-CFG-005',
    INVALID_FIELD_TYPE: 'CGH-CFG-006',
    FIELD_OUT_OF_RANGE: 'CGH-CFG-007',
    DUPLICATE_FIELD: 'CGH-CFG-008',
    
    // Feature-specific config errors (100-199)
    HOOK_CONFIG_INVALID: 'CGH-CFG-100',
    TRIGGER_CONFIG_INVALID: 'CGH-CFG-101',
    REMOTE_CONFIG_INVALID: 'CGH-CFG-102',
    LOCAL_CONFIG_INVALID: 'CGH-CFG-103',
    
    // Integration errors (200-299)
    CONFIG_MERGE_CONFLICT: 'CGH-CFG-200',
    
    // Internal errors (900-999)
    CONFIG_INTERNAL_ERROR: 'CGH-CFG-900'
  },

  // Network Errors
  NET: {
    // Common network errors (001-099)
    CONNECTION_FAILED: 'CGH-NET-001',
    TIMEOUT: 'CGH-NET-002',
    DNS_RESOLUTION_FAILED: 'CGH-NET-003',
    HTTP_ERROR: 'CGH-NET-004',
    AUTHENTICATION_FAILED: 'CGH-NET-005',
    RATE_LIMITED: 'CGH-NET-006',
    PROXY_ERROR: 'CGH-NET-007',
    
    // Feature-specific network errors (100-199)
    REMOTE_HOOK_DOWNLOAD_FAILED: 'CGH-NET-100',
    REMOTE_HOOK_UPLOAD_FAILED: 'CGH-NET-101',
    VERSION_CHECK_FAILED: 'CGH-NET-102',
    
    // Integration errors (200-299)
    GITHUB_API_ERROR: 'CGH-NET-200',
    NPM_REGISTRY_ERROR: 'CGH-NET-201',
    
    // Internal errors (900-999)
    NETWORK_INTERNAL_ERROR: 'CGH-NET-900'
  },

  // File System Errors
  FS: {
    // Common filesystem errors (001-099)
    FILE_NOT_FOUND: 'CGH-FS-001',
    DIRECTORY_NOT_FOUND: 'CGH-FS-002',
    PERMISSION_DENIED: 'CGH-FS-003',
    DISK_FULL: 'CGH-FS-004',
    READ_ERROR: 'CGH-FS-005',
    WRITE_ERROR: 'CGH-FS-006',
    DELETE_ERROR: 'CGH-FS-007',
    COPY_ERROR: 'CGH-FS-008',
    MOVE_ERROR: 'CGH-FS-009',
    
    // Feature-specific filesystem errors (100-199)
    HOOK_FILE_CORRUPTION: 'CGH-FS-100',
    CONFIG_FILE_CORRUPTION: 'CGH-FS-101',
    BACKUP_FAILED: 'CGH-FS-102',
    RESTORE_FAILED: 'CGH-FS-103',
    
    // Integration errors (200-299)
    GIT_DIR_ACCESS_DENIED: 'CGH-FS-200',
    NODE_MODULES_ACCESS_DENIED: 'CGH-FS-201',
    
    // Internal errors (900-999)
    FILESYSTEM_INTERNAL_ERROR: 'CGH-FS-900'
  },

  // Permission and Security Errors
  PERM: {
    // Common permission errors (001-099)
    ACCESS_DENIED: 'CGH-PERM-001',
    INSUFFICIENT_PRIVILEGES: 'CGH-PERM-002',
    SUDO_REQUIRED: 'CGH-PERM-003',
    FILE_LOCKED: 'CGH-PERM-004',
    DIRECTORY_PROTECTED: 'CGH-PERM-005',
    EXECUTABLE_PERMISSION_MISSING: 'CGH-PERM-006',
    
    // Feature-specific permission errors (100-199)
    HOOK_EXECUTION_BLOCKED: 'CGH-PERM-100',
    GIT_HOOK_INSTALL_DENIED: 'CGH-PERM-101',
    
    // Security errors (200-299)
    UNTRUSTED_SOURCE: 'CGH-PERM-200',
    SIGNATURE_VERIFICATION_FAILED: 'CGH-PERM-201',
    
    // Internal errors (900-999)
    PERMISSION_INTERNAL_ERROR: 'CGH-PERM-900'
  },

  // Validation Errors
  VAL: {
    // Common validation errors (001-099)
    INVALID_FORMAT: 'CGH-VAL-001',
    VALUE_OUT_OF_RANGE: 'CGH-VAL-002',
    REQUIRED_FIELD_MISSING: 'CGH-VAL-003',
    INVALID_EMAIL: 'CGH-VAL-004',
    INVALID_URL: 'CGH-VAL-005',
    INVALID_PATH: 'CGH-VAL-006',
    INVALID_REGEX: 'CGH-VAL-007',
    STRING_TOO_LONG: 'CGH-VAL-008',
    STRING_TOO_SHORT: 'CGH-VAL-009',
    
    // Feature-specific validation errors (100-199)
    HOOK_NAME_INVALID: 'CGH-VAL-100',
    TRIGGER_NAME_INVALID: 'CGH-VAL-101',
    SCRIPT_PATH_INVALID: 'CGH-VAL-102',
    VERSION_FORMAT_INVALID: 'CGH-VAL-103',
    
    // Integration errors (200-299)
    GIT_REFERENCE_INVALID: 'CGH-VAL-200',
    PACKAGE_NAME_INVALID: 'CGH-VAL-201',
    
    // Internal errors (900-999)
    VALIDATION_INTERNAL_ERROR: 'CGH-VAL-900'
  },

  // Internal System Errors
  INT: {
    // Common internal errors (001-099)
    UNEXPECTED_STATE: 'CGH-INT-001',
    NULL_REFERENCE: 'CGH-INT-002',
    ASSERTION_FAILED: 'CGH-INT-003',
    MEMORY_ALLOCATION_FAILED: 'CGH-INT-004',
    THREAD_ERROR: 'CGH-INT-005',
    RESOURCE_LEAK: 'CGH-INT-006',
    
    // System errors (100-199)
    PROCESS_SPAWN_FAILED: 'CGH-INT-100',
    SIGNAL_HANDLER_ERROR: 'CGH-INT-101',
    EVENT_LOOP_ERROR: 'CGH-INT-102',
    
    // Debug errors (900-999)
    DEBUG_INFO_UNAVAILABLE: 'CGH-INT-900',
    STACK_TRACE_UNAVAILABLE: 'CGH-INT-901'
  }
} as const;

/**
 * Type for all possible error codes
 */
export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES][keyof typeof ERROR_CODES[keyof typeof ERROR_CODES]];

/**
 * Get error code by area and name
 */
export function getErrorCode(area: keyof typeof ERROR_CODES, name: string): string {
  const areaObj = ERROR_CODES[area] as Record<string, string>;
  return areaObj[name] || `CGH-${area}-000`;
}

/**
 * Parse error code to extract area and number
 */
export function parseErrorCode(code: string): { area: string; number: number } | null {
  const match = code.match(/^CGH-([A-Z]+)-(\d+)$/);
  if (!match) return null;
  
  return {
    area: match[1],
    number: parseInt(match[2], 10)
  };
}

/**
 * Check if an error code is valid
 */
export function isValidErrorCode(code: string): boolean {
  return Object.values(ERROR_CODES)
    .flatMap(area => Object.values(area))
    .includes(code as ErrorCode);
}

/**
 * Get all error codes for a specific area
 */
export function getAreaErrorCodes(area: keyof typeof ERROR_CODES): string[] {
  return Object.values(ERROR_CODES[area]);
}

/**
 * Find error code by searching for partial matches
 */
export function findErrorCode(searchTerm: string): ErrorCode[] {
  const results: ErrorCode[] = [];
  
  Object.values(ERROR_CODES).forEach(area => {
    Object.entries(area).forEach(([name, code]) => {
      if (name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          code.toLowerCase().includes(searchTerm.toLowerCase())) {
        results.push(code);
      }
    });
  });
  
  return results;
}