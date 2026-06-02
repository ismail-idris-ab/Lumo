import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
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
  }

  // Log 5xx with stack; 4xx are client errors, log at debug.
  const log = req.log ?? console;
  if (status >= 500) log.error({ err }, 'Unhandled error');
  else log.debug({ err: { message: (err as Error)?.message } }, 'Request error');

  res.status(status).json(body);
};
