import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import express, { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import { createPerUserRateLimit } from '../../middleware/perUserRateLimit';
import { buildErrorResponseForStatus } from '../../middleware/validate';

jest.mock('../../utils/redisRateLimiter', () => ({
  getRedis: jest.fn().mockReturnValue(null),
}));

describe('API error contract', () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    app.get('/boom', () => {
      const error = new Error('database password leaked detail') as Error & { statusCode?: number };
      error.statusCode = 500;
      throw error;
    });
    app.get('/limited', createPerUserRateLimit({ maxRequests: 1, windowMs: 60_000 }));
    app.use((req, res) => {
      res.status(404).json(buildErrorResponseForStatus(404, `Route ${req.originalUrl} not found`));
    });
    app.use((error: any, _req: Request, res: Response, _next: NextFunction) => {
      const statusCode = error.statusCode || error.status || 500;
      const message =
        statusCode >= 500 ? 'Internal server error' : error.message || 'Request failed';
      res.status(statusCode).json(buildErrorResponseForStatus(statusCode, message, error.details));
    });
  });

  it('returns canonical not-found envelopes', async () => {
    const response = await request(app).get('/missing');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Route /missing not found',
      },
    });
  });

  it('returns sanitized canonical server-error envelopes', async () => {
    const response = await request(app).get('/boom');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
  });

  it('returns canonical rate-limit envelopes', async () => {
    await request(app).get('/limited');
    const response = await request(app).get('/limited');

    expect(response.status).toBe(429);
    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests. Please try again later.',
      },
    });
  });
});
