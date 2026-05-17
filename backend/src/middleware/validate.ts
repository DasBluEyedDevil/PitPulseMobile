import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import logger from '../utils/logger';

/**
 * Canonical error response shape.
 * All error responses across validation, global handler, and controllers
 * should use this format for consistency (CFR-API-013).
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * Helper to build a canonical error response.
 */
export function buildErrorResponse(code: string, message: string, details?: any): ErrorResponse {
  const response: ErrorResponse = {
    success: false,
    error: { code, message },
  };
  if (details !== undefined) {
    response.error.details = details;
  }
  return response;
}

export function statusToErrorCode(status: number): string {
  switch (status) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 422:
      return 'VALIDATION_ERROR';
    case 429:
      return 'RATE_LIMITED';
    case 503:
      return 'SERVICE_UNAVAILABLE';
    case 500:
    default:
      return 'INTERNAL_ERROR';
  }
}

export function buildErrorResponseForStatus(
  status: number,
  message: string,
  details?: any
): ErrorResponse {
  return buildErrorResponse(statusToErrorCode(status), message, details);
}

/**
 * Middleware factory for Zod schema validation
 */
export const validate = (schema: z.ZodType<unknown>) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      if (parsed && typeof parsed === 'object') {
        // Write the Zod-parsed (and potentially coerced/stripped) values back
        // onto the request so downstream handlers see the validated shape.
        //
        const p = parsed as { body?: unknown; query?: unknown; params?: unknown };
        if ('body' in p) req.body = p.body as Request['body'];
        if ('query' in p) {
          Object.defineProperty(req, 'query', {
            value: p.query as Request['query'],
            configurable: true,
            enumerable: true,
            writable: true,
          });
        }
        if ('params' in p) req.params = p.params as Request['params'];
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const fieldErrors = error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        res
          .status(400)
          .json(buildErrorResponse('VALIDATION_ERROR', 'Validation failed', fieldErrors));
        return;
      }

      logger.error('Validation middleware unexpected error', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      res.status(500).json(buildErrorResponse('INTERNAL_ERROR', 'Internal server error'));
    }
  };
};
