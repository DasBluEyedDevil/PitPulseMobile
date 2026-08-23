import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import express, { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import { createPerUserRateLimit } from '../../middleware/perUserRateLimit';
import { buildErrorResponseForStatus } from '../../middleware/validate';
import { authenticateToken, rateLimit, requireAdmin, requirePremium } from '../../middleware/auth';
import { dailyCheckinRateLimit } from '../../middleware/checkinRateLimit';
import adminController from '../../controllers/AdminController';

const mockDbQuery = jest.fn<(...args: unknown[]) => Promise<unknown>>();

jest.mock('../../utils/redisRateLimiter', () => ({
  getRedis: jest.fn().mockReturnValue(null),
  checkRateLimit: jest.fn(),
}));

jest.mock('../../utils/auth', () => ({
  AuthUtils: {
    extractTokenFromHeader: jest.fn((authHeader?: string) => {
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
      }
      return authHeader.substring(7);
    }),
    verifyToken: jest.fn((token: string) => {
      if (!token || token === 'invalid-token') {
        return null;
      }
      return { userId: 'user-123', email: 'test@example.com', username: 'testuser' };
    }),
  },
  revokeAllUserTokens: jest.fn(),
}));

jest.mock('../../services/UserService', () => ({
  UserService: jest.fn().mockImplementation(() => ({
    findById: jest.fn(async () => null),
  })),
}));

jest.mock('../../services/user/authUserCache', () => ({
  getAuthUser: jest.fn(async () => null),
  invalidateAuthUserCache: jest.fn(),
}));

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    getInstance: () => ({
      query: (...args: unknown[]) => mockDbQuery(...args),
    }),
  },
}));

jest.mock('../../utils/cache', () => ({
  cache: { delPattern: jest.fn(), clear: jest.fn() },
}));

jest.mock('../../utils/websocket', () => ({
  getWebSocketStats: jest.fn(),
  disconnectUser: jest.fn(),
  WebSocketEvents: { DISCONNECTED: 'disconnected' },
}));

function expectObjectEnvelope(
  response: request.Response,
  status: number,
  code: string,
  message: string
): void {
  expect(response.status).toBe(status);
  expect(typeof response.body.error).toBe('object');
  expect(response.body.error).not.toEqual(message);
  expect(response.body).toEqual({
    success: false,
    error: { code, message },
  });
}

describe('API error contract', () => {
  let app: express.Express;

  beforeEach(() => {
    mockDbQuery.mockReset();
    app = express();
    app.use(express.json());
    app.get('/boom', () => {
      const error = new Error('database password leaked detail') as Error & { statusCode?: number };
      error.statusCode = 500;
      throw error;
    });
    app.get('/limited', createPerUserRateLimit({ maxRequests: 1, windowMs: 60_000 }));
    app.get('/protected', authenticateToken, (_req, res) => {
      res.status(200).json({ success: true });
    });
    app.get('/admin-only', requireAdmin(), (_req, res) => {
      res.status(200).json({ success: true });
    });
    app.get(
      '/premium-only',
      (req, _res, next) => {
        (req as any).user = { id: 'user-123', isPremium: false };
        next();
      },
      requirePremium(),
      (_req, res) => {
        res.status(200).json({ success: true });
      }
    );
    app.get('/ip-limited', rateLimit(60_000, 1), (_req, res) => {
      res.status(200).json({ success: true });
    });
    app.post(
      '/checkins-limited',
      (req, _res, next) => {
        (req as any).user = { id: 'user-123' };
        next();
      },
      dailyCheckinRateLimit,
      (_req, res) => {
        res.status(200).json({ success: true });
      }
    );
    app.post('/admin/moderate', adminController.moderateContent);
    app.get('/admin/user-activity', adminController.getUserActivity);
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

    expectObjectEnvelope(response, 404, 'NOT_FOUND', 'Route /missing not found');
  });

  it('returns sanitized canonical server-error envelopes', async () => {
    const response = await request(app).get('/boom');

    expectObjectEnvelope(response, 500, 'INTERNAL_ERROR', 'Internal server error');
  });

  it('returns canonical rate-limit envelopes', async () => {
    await request(app).get('/limited');
    const response = await request(app).get('/limited');

    expectObjectEnvelope(
      response,
      429,
      'RATE_LIMITED',
      'Too many requests. Please try again later.'
    );
  });

  it('returns object envelopes from real authenticateToken, not legacy strings', async () => {
    const missing = await request(app).get('/protected');
    expectObjectEnvelope(missing, 401, 'UNAUTHORIZED', 'Access token required');

    const invalid = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer invalid-token');
    expectObjectEnvelope(invalid, 401, 'UNAUTHORIZED', 'Invalid or expired token');
  });

  it('returns object envelopes from requireAdmin', async () => {
    const response = await request(app).get('/admin-only');
    expectObjectEnvelope(response, 401, 'UNAUTHORIZED', 'Authentication required');
  });

  it('returns object envelopes from requirePremium', async () => {
    const response = await request(app).get('/premium-only');
    expectObjectEnvelope(response, 403, 'FORBIDDEN', 'SoundCheck Pro subscription required');
  });

  it('returns object envelopes from the IP rate limiter', async () => {
    await request(app).get('/ip-limited');
    const response = await request(app).get('/ip-limited');
    expectObjectEnvelope(
      response,
      429,
      'RATE_LIMITED',
      'Too many requests, please try again later'
    );
  });

  it('returns object envelopes from the daily check-in limiter', async () => {
    mockDbQuery.mockResolvedValue({ rows: [{ cnt: 10 }] });
    const response = await request(app).post('/checkins-limited');
    expectObjectEnvelope(
      response,
      429,
      'RATE_LIMITED',
      'Daily check-in limit reached (10 per day)'
    );
  });

  it('returns object envelopes from admin validation', async () => {
    const missingFields = await request(app).post('/admin/moderate').send({});
    expectObjectEnvelope(
      missingFields,
      400,
      'BAD_REQUEST',
      'action, targetType, and targetId are required'
    );

    const missingUserId = await request(app).get('/admin/user-activity');
    expectObjectEnvelope(missingUserId, 400, 'BAD_REQUEST', 'userId is required');
  });
});
