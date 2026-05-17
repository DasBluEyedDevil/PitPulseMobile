import { describe, expect, it, jest, beforeEach } from '@jest/globals';
jest.mock('../../utils/redisRateLimiter', () => ({
  getRedis: jest.fn(() => null),
  checkRateLimit: jest.fn(),
}));

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

import { rateLimit } from '../../middleware/auth';

describe('rateLimit security behavior', () => {
  let json: jest.Mock;
  let setHeader: jest.Mock;
  let status: jest.Mock;
  let req: any;
  let res: any;
  let next: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    json = jest.fn();
    setHeader = jest.fn().mockReturnThis();
    status = jest.fn().mockReturnValue({ setHeader, json });
    req = {
      ip: '203.0.113.10',
      path: '/refresh',
      originalUrl: '/api/tokens/refresh',
      socket: { remoteAddress: '203.0.113.10' } as any,
    };
    res = { status, setHeader, json };
    next = jest.fn();
  });

  it('fails closed for mounted token refresh paths when Redis is unavailable', async () => {
    await rateLimit(15 * 60 * 1000, 10)(req, res, next);

    expect(status).toHaveBeenCalledWith(503);
    expect(setHeader).toHaveBeenCalledWith('Retry-After', '60');
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'Service temporarily unavailable',
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('allows non-critical paths to use the in-memory fallback', async () => {
    req.path = '/bands';
    req.originalUrl = '/api/bands';

    await rateLimit(15 * 60 * 1000, 10)(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(status).not.toHaveBeenCalled();
  });
});
