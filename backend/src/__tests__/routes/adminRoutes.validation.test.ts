import express, { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { buildErrorResponseForStatus } from '../../middleware/validate';

const mockQuery = jest.fn();

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    getInstance: () => ({
      query: mockQuery,
      healthCheck: jest.fn(),
    }),
  },
}));

jest.mock('../../utils/cache', () => ({
  cache: {
    getStats: jest.fn(),
    delPattern: jest.fn(),
    clear: jest.fn(),
  },
}));

jest.mock('../../utils/websocket', () => ({
  getWebSocketStats: jest.fn(() => ({})),
}));

jest.mock('../../middleware/auth', () => ({
  authenticateToken: (req: Request, _res: Response, next: NextFunction) => {
    (req as any).user = {
      id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      isAdmin: true,
    };
    next();
  },
  requireAdmin: () => (_req: Request, _res: Response, next: NextFunction) => next(),
}));

import adminRoutes from '../../routes/adminRoutes';

const USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/admin', adminRoutes);
  app.use(
    (
      error: { statusCode?: number; message?: string },
      _req: Request,
      res: Response,
      _next: NextFunction
    ) => {
      const statusCode = error.statusCode || 500;
      const message =
        statusCode >= 500 ? 'Internal server error' : error.message || 'Request failed';
      res.status(statusCode).json(buildErrorResponseForStatus(statusCode, message));
    }
  );
  return app;
}

describe('adminRoutes GET-param and moderate validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockReset();
  });

  it('returns 400 when user-activity userId is not a UUID', async () => {
    const response = await request(createApp()).get('/api/admin/user-activity?userId=not-a-uuid');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('returns 400 when user-activity userId is missing', async () => {
    const response = await request(createApp()).get('/api/admin/user-activity');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('returns 400 when moderate targetId is not a UUID', async () => {
    const response = await request(createApp()).post('/api/admin/moderate').send({
      action: 'ban_user',
      targetType: 'user',
      targetId: 'user-1',
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('returns 400 when moderate targetType does not match action', async () => {
    const response = await request(createApp()).post('/api/admin/moderate').send({
      action: 'ban_user',
      targetType: 'venue',
      targetId: USER_ID,
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('returns 400 when moderate is missing required fields', async () => {
    const response = await request(createApp()).post('/api/admin/moderate').send({});

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });
});
