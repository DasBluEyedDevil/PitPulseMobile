import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import express, { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import { buildErrorResponseForStatus } from '../../middleware/validate';

const mockGetWrappedStats = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockGetWrappedDetailStats = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockGetAuthUser = jest.fn<(...args: unknown[]) => Promise<unknown>>();

jest.mock('../../services/WrappedService', () => ({
  WrappedService: jest.fn().mockImplementation(() => ({
    getWrappedStats: (...args: unknown[]) => mockGetWrappedStats(...args),
    getWrappedDetailStats: (...args: unknown[]) => mockGetWrappedDetailStats(...args),
  })),
}));

jest.mock('../../services/ShareCardService', () => ({
  ShareCardService: jest.fn().mockImplementation(() => ({
    generateWrappedCard: jest.fn(),
    generateWrappedStatCard: jest.fn(),
  })),
}));

jest.mock('../../services/user/authUserCache', () => ({
  getAuthUser: (...args: unknown[]) => mockGetAuthUser(...args),
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
}));

jest.mock('../../utils/redisRateLimiter', () => ({
  getRedis: jest.fn().mockReturnValue(null),
  checkRateLimit: jest.fn(),
}));

import wrappedRoutes from '../../routes/wrappedRoutes';

const year = new Date().getFullYear();
const stats = {
  meetsThreshold: true,
  totalShows: 12,
  uniqueBands: 8,
  uniqueVenues: 5,
  topGenre: 'Rock',
  topGenrePercentage: 60,
  topArtistName: 'The Band',
  topArtistTimesSeen: 4,
  homeVenueName: 'The Hall',
  homeVenueVisits: 3,
};

function baseUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
    isVerified: true,
    isActive: true,
    isAdmin: false,
    isPremium: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

function createApp(): express.Express {
  const app = express();
  app.use(express.json());
  app.use('/api/wrapped', wrappedRoutes.api);
  app.use(
    (error: Error & { statusCode?: number }, _req: Request, res: Response, _next: NextFunction) => {
      const statusCode = error.statusCode || 500;
      const message = statusCode >= 500 ? 'Internal server error' : error.message;
      res.status(statusCode).json(buildErrorResponseForStatus(statusCode, message));
    }
  );
  return app;
}

describe('wrappedRoutes premium gates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetWrappedStats.mockResolvedValue(stats);
    mockGetWrappedDetailStats.mockResolvedValue({ ...stats, shows: [{ id: 'checkin-1' }] });
  });

  it('returns 403 for GET /:year/detail when isPremium is false', async () => {
    mockGetAuthUser.mockResolvedValue(baseUser({ isPremium: false }));

    const response = await request(createApp())
      .get(`/api/wrapped/${year}/detail`)
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(403);
    expect(typeof response.body.error).toBe('object');
    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'SoundCheck Pro subscription required',
      },
    });
    expect(mockGetWrappedDetailStats).not.toHaveBeenCalled();
  });

  it('returns 200 for GET /:year/detail when isPremium is true', async () => {
    mockGetAuthUser.mockResolvedValue(baseUser({ isPremium: true }));
    const detail = { ...stats, shows: [{ id: 'checkin-1' }] };
    mockGetWrappedDetailStats.mockResolvedValue(detail);

    const response = await request(createApp())
      .get(`/api/wrapped/${year}/detail`)
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, data: detail });
    expect(mockGetWrappedDetailStats).toHaveBeenCalledWith('user-123', year);
  });

  it('still serves free GET /:year without premium', async () => {
    mockGetAuthUser.mockResolvedValue(baseUser({ isPremium: false }));

    const response = await request(createApp())
      .get(`/api/wrapped/${year}`)
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, data: stats });
    expect(mockGetWrappedStats).toHaveBeenCalledWith('user-123', year);
  });

  it('returns 403 for POST /:year/card/:statType when isPremium is false', async () => {
    mockGetAuthUser.mockResolvedValue(baseUser({ isPremium: false }));

    const response = await request(createApp())
      .post(`/api/wrapped/${year}/card/top-artist`)
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'SoundCheck Pro subscription required',
      },
    });
  });
});
