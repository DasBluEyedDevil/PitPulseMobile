import express, { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { buildErrorResponseForStatus } from '../../middleware/validate';

const mockGetFriendsFeed = jest.fn();
const mockGetGlobalFeed = jest.fn();
const mockGetEventFeed = jest.fn();
const mockGetHappeningNow = jest.fn();
const mockGetUnseenCounts = jest.fn();
const mockMarkFeedRead = jest.fn();

jest.mock('../../services/FeedService', () => {
  const actual = jest.requireActual('../../services/FeedService');
  return {
    ...actual,
    FeedService: jest.fn().mockImplementation(() => ({
      getFriendsFeed: mockGetFriendsFeed,
      getGlobalFeed: mockGetGlobalFeed,
      getEventFeed: mockGetEventFeed,
      getHappeningNow: mockGetHappeningNow,
      getUnseenCounts: mockGetUnseenCounts,
      markFeedRead: mockMarkFeedRead,
    })),
  };
});

jest.mock('../../middleware/auth', () => ({
  authenticateToken: (req: Request, _res: Response, next: NextFunction) => {
    (req as any).user = {
      id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    };
    next();
  },
}));

jest.mock('../../middleware/perUserRateLimit', () => ({
  createPerUserRateLimit: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  RateLimitPresets: { write: {}, expensive: {}, read: {} },
}));

import feedRoutes from '../../routes/feedRoutes';

const EVENT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/feed', feedRoutes);
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

describe('feedRoutes validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetFriendsFeed.mockResolvedValue({ items: [], nextCursor: null, hasMore: false });
    mockGetEventFeed.mockResolvedValue({ items: [], nextCursor: null, hasMore: false });
  });

  it('returns 400 for a non-numeric friends-feed limit', async () => {
    const response = await request(createApp()).get('/api/feed/friends?limit=not-a-number');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockGetFriendsFeed).not.toHaveBeenCalled();
  });

  it('returns 400 for a malformed friends-feed cursor', async () => {
    const response = await request(createApp()).get('/api/feed/friends?cursor=not-a-cursor');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockGetFriendsFeed).not.toHaveBeenCalled();
  });

  it('returns 400 for GET /api/feed/events/:eventId with a non-UUID event id', async () => {
    const response = await request(createApp()).get('/api/feed/events/event-1');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: expect.stringContaining('params.eventId') }),
      ])
    );
    expect(mockGetEventFeed).not.toHaveBeenCalled();
  });

  it('passes a valid event UUID through to the event feed', async () => {
    const response = await request(createApp()).get(`/api/feed/events/${EVENT_ID}?limit=12`);

    expect(response.status).toBe(200);
    expect(mockGetEventFeed).toHaveBeenCalledWith(
      EVENT_ID,
      'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      undefined,
      12
    );
  });
});
