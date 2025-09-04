import type { SettingsScope } from '../../services/settings.service.js';

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

export interface ApplyOptions {
  global?: boolean;
  local?: boolean;
  help?: boolean;
  regenerate?: boolean;
  parent?: {
    json?: boolean;
  };
}

export interface ApplyHookResult {
  success: boolean;
  hook?: string;
  scope?: string;
  args?: Record<string, unknown>;
  error?: string;
}

export interface ShowHookHelpParams {
  hookName: string;
  global: boolean;
  isJson: boolean;
}

export interface HandleRegenerateParams {
  hookName?: string;
  scope?: SettingsScope;
  isJson?: boolean;
}