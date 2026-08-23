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
import { checkRateLimit, getRedis } from '../../utils/redisRateLimiter';

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

  it('uses the in-memory fallback for sensitive paths when Redis is unavailable', async () => {
    await rateLimit(15 * 60 * 1000, 1)(req, res, next);
    await rateLimit(15 * 60 * 1000, 1)(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(status).toHaveBeenCalledWith(429);
    expect(json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests, please try again later',
      },
    });
  });

  it('allows non-critical paths to use the in-memory fallback', async () => {
    req.ip = '203.0.113.20';
    req.socket.remoteAddress = '203.0.113.20';
    req.path = '/bands';
    req.originalUrl = '/api/bands';

    await rateLimit(15 * 60 * 1000, 10)(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(status).not.toHaveBeenCalled();
  });

  it('falls back instead of blocking when Redis check throws for a sensitive path', async () => {
    req.ip = '203.0.113.30';
    req.socket.remoteAddress = '203.0.113.30';
    (getRedis as jest.Mock).mockReturnValue({});
    (checkRateLimit as jest.Mock).mockRejectedValue(new Error('Redis command timed out') as never);

    await rateLimit(15 * 60 * 1000, 10)(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(status).not.toHaveBeenCalled();
    expect(setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '10');
  });
});
