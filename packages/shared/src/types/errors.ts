export class RepoDocError extends Error {
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, code = 'INTERNAL_ERROR', details?: unknown) {
    super(message);
    this.name = 'RepoDocError';
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class PermissionDeniedError extends RepoDocError {
  constructor(message: string, details?: unknown) {
    super(message, 'PERMISSION_DENIED', details);
    this.name = 'PermissionDeniedError';
  }
}

export class ConfigurationError extends RepoDocError {
  constructor(message: string, details?: unknown) {
    super(message, 'CONFIGURATION_ERROR', details);
    this.name = 'ConfigurationError';
  }
}

export class PersistenceError extends RepoDocError {
  constructor(message: string, details?: unknown) {
    super(message, 'PERSISTENCE_ERROR', details);
    this.name = 'PersistenceError';
  }
}

export class ValidationError extends RepoDocError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}
