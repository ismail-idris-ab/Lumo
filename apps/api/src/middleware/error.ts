import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { ErrorCode, type ApiErrorBody } from '@lumo/shared';
import { AppError } from '../lib/errors';

// 404 for unmatched routes.
export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(AppError.notFound('Route not found'));
};

// Central error middleware — emits the standard envelope { error: { code, message, details } }.
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  let status = 500;
  let body: ApiErrorBody = {
    error: { code: ErrorCode.INTERNAL, message: 'Something went wrong' },
  };

  if (err instanceof AppError) {
    status = err.statusCode;
    body = { error: { code: err.code, message: err.message, details: err.details } };
  } else if (err instanceof ZodError) {
    status = 400;
    body = {
      error: {
        code: ErrorCode.VALIDATION,
        message: 'Validation failed',
        details: err.flatten(),
      },
    };
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // P2002 = unique constraint, P2025 = record not found, etc.
    status = err.code === 'P2025' ? 404 : err.code === 'P2002' ? 409 : 500;
    body = {
      error: {
        code: err.code === 'P2025' ? ErrorCode.NOT_FOUND : err.code === 'P2002' ? ErrorCode.CONFLICT : ErrorCode.INTERNAL,
        message: err.code === 'P2025' ? 'Record not found' : err.code === 'P2002' ? 'Duplicate entry' : 'Database error',
      },
    };
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    status = 400;
    body = { error: { code: ErrorCode.VALIDATION, message: 'Invalid data sent to database' } };
  } else if (err instanceof Prisma.PrismaClientInitializationError) {
    status = 503;
    body = { error: { code: ErrorCode.INTERNAL, message: 'Database temporarily unavailable. Please try again shortly.' } };
  } else if (err instanceof Prisma.PrismaClientUnknownRequestError) {
    status = 500;
    body = { error: { code: ErrorCode.INTERNAL, message: 'An unexpected database error occurred.' } };
  }

  // Log 5xx with stack; 4xx are client errors, log at debug.
  const log = req.log ?? console;
  if (status >= 500) log.error({ err }, 'Unhandled error');
  else log.debug({ err: { message: (err as Error)?.message } }, 'Request error');

  res.status(status).json(body);
};
