export interface SchemaValidationError {
  path: string;
  message: string;
  value?: unknown;
  expected?: string;
}