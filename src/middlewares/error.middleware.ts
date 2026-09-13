import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { ApiError } from '../utils/apiError';
import { HttpStatus } from '../constants/httpStatus';
import { logger } from '../utils/logger';
import { env } from '../config/env';
import { formatZodErrors } from '../utils/formatValidation';

export const errorHandler = (
  err: Error | ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  let statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR;
  let message = 'Internal Server Error';
  let errors: unknown[] | undefined;

  // Handle custom ApiError
  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
  }
  // Handle Zod Validation Errors
  else if (err instanceof ZodError) {
    statusCode = HttpStatus.BAD_REQUEST;
    const formatted = formatZodErrors(err);
    message = formatted.firstErrorMessage;
    errors = formatted.errors;
  }
  // Handle Prisma Known Request Errors
  else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      statusCode = HttpStatus.CONFLICT;
      const target = (err.meta?.target as string[]) || [];
      message = `A record with this ${target.join(', ')} already exists`;
    } else if (err.code === 'P2025') {
      statusCode = HttpStatus.NOT_FOUND;
      message = (err.meta?.cause as string) || 'Record not found';
    } else {
      statusCode = HttpStatus.BAD_REQUEST;
      message = `Database query error [${err.code}]`;
    }
  }
  // Handle Prisma Validation Errors
  else if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = HttpStatus.BAD_REQUEST;
    message = 'Invalid database query parameters';
  }
  // Fallback Error
  else if (err instanceof Error) {
    message = err.message;
  }

  // Log non-operational errors or 500 errors
  if (statusCode >= 500) {
    logger.error(`[Unhandled Error] ${err.message}`, {
      stack: err.stack,
    });
  } else {
    logger.warn(`[Client Error ${statusCode}]: ${message}`);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(errors && { errors }),
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
    timestamp: new Date().toISOString(),
  });
};
