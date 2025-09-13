export type ValidationResult<T> =
  | {
      valid: false;
      errors: string[];
    }
  | {
      valid: true;
      result: T;
    };
