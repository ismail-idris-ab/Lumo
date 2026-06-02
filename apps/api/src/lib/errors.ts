import { ErrorCode } from '@lumo/shared';

// Application error carrying an HTTP status + envelope code (CLAUDE.md error shape).
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  static badRequest(message: string, details?: unknown) {
    return new AppError(400, ErrorCode.VALIDATION, message, details);
  }
  static unauthorized(message = 'Authentication required') {
    return new AppError(401, ErrorCode.UNAUTHORIZED, message);
  }
  static forbidden(message = 'Forbidden') {
    return new AppError(403, ErrorCode.FORBIDDEN, message);
  }
  static notFound(message = 'Not found') {
    return new AppError(404, ErrorCode.NOT_FOUND, message);
  }
  static conflict(message: string, details?: unknown) {
    return new AppError(409, ErrorCode.CONFLICT, message, details);
  }
  static rateLimited(message = 'Too many requests') {
    return new AppError(429, ErrorCode.RATE_LIMITED, message);
  }
}
