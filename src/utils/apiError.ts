import { HttpStatusCode, HttpStatus } from '../constants/httpStatus';

export class ApiError extends Error {
  public readonly statusCode: HttpStatusCode;
  public readonly isOperational: boolean;
  public readonly errors?: unknown[];

  constructor(
    statusCode: HttpStatusCode,
    message: string,
    errors?: unknown[],
    isOperational = true,
    stack = '',
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errors = errors;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  static badRequest(message: string, errors?: unknown[]): ApiError {
    return new ApiError(HttpStatus.BAD_REQUEST, message, errors);
  }

  static unauthorized(message = 'Unauthorized'): ApiError {
    return new ApiError(HttpStatus.UNAUTHORIZED, message);
  }

  static forbidden(message = 'Forbidden'): ApiError {
    return new ApiError(HttpStatus.FORBIDDEN, message);
  }

  static notFound(message = 'Resource not found'): ApiError {
    return new ApiError(HttpStatus.NOT_FOUND, message);
  }

  static conflict(message: string): ApiError {
    return new ApiError(HttpStatus.CONFLICT, message);
  }

  static locked(message: string, errors?: unknown[]): ApiError {
    return new ApiError(HttpStatus.LOCKED, message, errors);
  }

  static internal(message = 'Internal Server Error'): ApiError {
    return new ApiError(HttpStatus.INTERNAL_SERVER_ERROR, message, undefined, false);
  }
}
