/**
 * Common error attributes for all CLI error types
 */
export interface CommonErrorAttributes {
  /**
   * Error code identifier
   */
  code: string;

  /**
   * Human-readable error message
   */
  message: string;

  /**
   * Exit code for the CLI process
   */
  exitCode: number;

  /**
   * Whether this error should be formatted in JSON output
   */
  isUserFacing: boolean;

  /**
   * Optional actionable advice for the user
   */
  suggestion?: string;

  /**
   * Timestamp when error was created
   */
  timestamp: Date;

  /**
   * Stack trace from where error was created
   */
  stack?: string;

  /**
   * Original error that caused this error
   */
  cause?: Error;

  /**
   * Additional context information
   */
  context?: Record<string, unknown>;
}

/**
 * Default values for common error attributes
 */
export const DEFAULT_ERROR_ATTRIBUTES: Pick<
  CommonErrorAttributes,
  'exitCode' | 'isUserFacing' | 'timestamp'
> = {
  exitCode: 1,
  isUserFacing: true,
  timestamp: new Date(),
};

/**
 * Create common error attributes with defaults
 */
export function createCommonErrorAttributes(
  code: string,
  message: string,
  options: Partial<CommonErrorAttributes> = {}
): CommonErrorAttributes {
  const error = new Error();

  return {
    code,
    message,
    ...DEFAULT_ERROR_ATTRIBUTES,
    timestamp: new Date(),
    stack: error.stack,
    ...options,
  };
}
