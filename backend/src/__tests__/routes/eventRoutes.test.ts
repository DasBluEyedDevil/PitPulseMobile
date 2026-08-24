import express, { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { buildErrorResponseForStatus } from '../../middleware/validate';

const mockQuery = jest.fn();

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    getInstance: () => ({
      query: mockQuery,
      getClient: jest.fn(),
    }),
  },
}));

jest.mock('../../utils/cache', () => ({
  cache: {
    get: jest.fn(),
    set: jest.fn(),
    getOrSet: jest.fn(async (_key: string, fn: () => Promise<unknown>) => fn()),
  },
  CacheKeys: {},
  CacheTTL: {},
}));

jest.mock('../../middleware/auth', () => ({
  authenticateToken: (req: Request, _res: Response, next: NextFunction) => {
    (req as any).user = {
      id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      isAdmin: false,
    };
    next();
  },
}));

jest.mock('../../middleware/perUserRateLimit', () => ({
  createPerUserRateLimit: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  RateLimitPresets: { write: {}, expensive: {}, read: {} },
}));

import eventRoutes from '../../routes/eventRoutes';

const UNKNOWN_EVENT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const BAND_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/events', eventRoutes);
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

describe('eventRoutes validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockReset();
  });

  it('returns 400 for GET /api/events/:id with a non-UUID id', async () => {
    const response = await request(createApp()).get('/api/events/not-a-uuid');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.message).toBe('Validation failed');
    expect(response.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: expect.stringContaining('params.id') }),
      ])
    );
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('returns 404 NotFoundError for an unknown event UUID', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    const response = await request(createApp()).get(`/api/events/${UNKNOWN_EVENT_ID}`);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Event not found',
      },
    });
    expect(mockQuery).toHaveBeenCalled();
  });

  it('returns 400 when creating an event without a venue UUID', async () => {
    const response = await request(createApp())
      .post('/api/events')
      .send({ bandId: BAND_ID, eventDate: '2026-08-01T20:00:00.000Z' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('returns 400 when creating an event with a non-UUID venueId', async () => {
    const response = await request(createApp()).post('/api/events').send({
      venueId: 'venue-1',
      bandId: BAND_ID,
      eventDate: '2026-08-01T20:00:00.000Z',
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('returns 400 when deleting with a non-UUID id', async () => {
    const response = await request(createApp()).delete('/api/events/event-1');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });
});
