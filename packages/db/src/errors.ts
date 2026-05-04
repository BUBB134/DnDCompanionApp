export class DatabaseConfigurationError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "DatabaseConfigurationError";
  }
}

export class DatabaseConnectionError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "DatabaseConnectionError";
  }
}

export function toDatabaseConnectionError(error: unknown) {
  if (
    error instanceof DatabaseConfigurationError ||
    error instanceof DatabaseConnectionError
  ) {
    return error;
  }

  if (error instanceof Error) {
    return new DatabaseConnectionError(`Unable to connect to Postgres. ${error.message}`, {
      cause: error,
    });
  }

  return new DatabaseConnectionError("Unable to connect to Postgres.");
}

export function formatDatabaseError(error: unknown) {
  if (
    error instanceof DatabaseConfigurationError ||
    error instanceof DatabaseConnectionError
  ) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unknown database error occurred.";
}
