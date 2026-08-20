export class AppError extends Error {
  public readonly statusCode: number;
  public readonly details: any;

  constructor(message: string, statusCode = 500, details: any = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  public static from(err: any): AppError {
    if (err instanceof AppError) return err;
    return new InternalServerError(err?.message || 'Internal Server Error', err);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details: any = null) {
    super(message, 400, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access. Session token required or expired.', details: any = null) {
    super(message, 401, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden. Insufficient permissions.', details: any = null) {
    super(message, 403, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found.', details: any = null) {
    super(message, 404, details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details: any = null) {
    super(message, 409, details);
  }
}

export class InternalServerError extends AppError {
  constructor(message = 'Internal Server Error.', details: any = null) {
    super(message, 500, details);
  }
}
