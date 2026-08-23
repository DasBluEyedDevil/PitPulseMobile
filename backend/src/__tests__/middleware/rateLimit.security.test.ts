import { describe, expect, it, jest, beforeEach } from '@jest/globals';

jest.mock('../../utils/redisRateLimiter', () => {
  const actual = jest.requireActual(
    '../../utils/redisRateLimiter'
  ) as typeof import('../../utils/redisRateLimiter');
  return {
    ...actual,
    getRedis: jest.fn(() => null),
    checkRateLimit: jest.fn(),
  };
});

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

import {
  IN_MEMORY_RATE_LIMIT_MAX_ENTRIES,
  rateLimit,
  resetInMemoryRateLimitStoreForTests,
  seedInMemoryRateLimitStoreForTests,
} from '../../middleware/auth';
import {
  buildIpRateLimitKey,
  checkRateLimit,
  getRedis,
  resolveIpRateLimitScope,
} from '../../utils/redisRateLimiter';

const WINDOW_MS = 15 * 60 * 1000;

function rateLimitedEnvelope() {
  return {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests, please try again later',
    },
  };
}

describe('rateLimit security behavior', () => {
  let json: jest.Mock;
  let setHeader: jest.Mock;
  let status: jest.Mock;
  let req: any;
  let res: any;
  let next: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    resetInMemoryRateLimitStoreForTests();
    (getRedis as jest.Mock).mockReturnValue(null);
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
    await rateLimit(WINDOW_MS, 1)(req, res, next);
    await rateLimit(WINDOW_MS, 1)(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(status).toHaveBeenCalledWith(429);
    expect(json).toHaveBeenCalledWith(rateLimitedEnvelope());
  });

  it('allows non-critical paths to use the in-memory fallback', async () => {
    req.ip = '203.0.113.20';
    req.socket.remoteAddress = '203.0.113.20';
    req.path = '/bands';
    req.originalUrl = '/api/bands';

    await rateLimit(WINDOW_MS, 10)(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(status).not.toHaveBeenCalled();
  });

  it('increments distinct Redis keys for login vs /api/bands on the same IP', async () => {
    const ip = '203.0.113.40';
    (getRedis as jest.Mock).mockReturnValue({});
    (checkRateLimit as jest.Mock).mockResolvedValue({
      allowed: true,
      remaining: 4,
      resetAt: Date.now() + WINDOW_MS,
    } as never);

    const loginReq = {
      ip,
      path: '/login',
      originalUrl: '/api/users/login',
      socket: { remoteAddress: ip },
    };
    const bandsReq = {
      ip,
      path: '/bands',
      originalUrl: '/api/bands',
      socket: { remoteAddress: ip },
    };

    await rateLimit(WINDOW_MS, 5)(loginReq as any, res, next);
    await rateLimit(WINDOW_MS, 100)(bandsReq as any, res, next);

    expect(checkRateLimit).toHaveBeenNthCalledWith(
      1,
      buildIpRateLimitKey('login', ip, WINDOW_MS),
      5,
      WINDOW_MS
    );
    expect(checkRateLimit).toHaveBeenNthCalledWith(
      2,
      buildIpRateLimitKey('bands', ip, WINDOW_MS),
      100,
      WINDOW_MS
    );
    expect(buildIpRateLimitKey('login', ip, WINDOW_MS)).toBe(`rate_limit:login:${ip}:${WINDOW_MS}`);
    expect(buildIpRateLimitKey('bands', ip, WINDOW_MS)).toBe(`rate_limit:bands:${ip}:${WINDOW_MS}`);
    expect(next).toHaveBeenCalledTimes(2);
    expect(status).not.toHaveBeenCalled();
  });

  it('does not spend the login budget on /api/bands traffic from the same IP', async () => {
    const ip = '203.0.113.50';
    const bandsReq = {
      ip,
      path: '/bands',
      originalUrl: '/api/bands',
      socket: { remoteAddress: ip },
    };
    const loginReq = {
      ip,
      path: '/login',
      originalUrl: '/api/users/login',
      socket: { remoteAddress: ip },
    };

    // Five band hits would exhaust a shared 5/15min login counter.
    for (let i = 0; i < 5; i += 1) {
      await rateLimit(WINDOW_MS, 5)(bandsReq as any, res, next);
    }
    await rateLimit(WINDOW_MS, 5)(loginReq as any, res, next);

    expect(next).toHaveBeenCalledTimes(6);
    expect(status).not.toHaveBeenCalled();
  });

  it('tracks login in-memory when Redis throws instead of fail-opening the login path', async () => {
    req.ip = '203.0.113.30';
    req.socket.remoteAddress = '203.0.113.30';
    req.path = '/login';
    req.originalUrl = '/api/users/login';
    (getRedis as jest.Mock).mockReturnValue({});
    (checkRateLimit as jest.Mock).mockRejectedValue(new Error('Redis command timed out') as never);

    const limiter = rateLimit(WINDOW_MS, 1);
    await limiter(req, res, next);
    await limiter(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(status).toHaveBeenCalledWith(429);
    expect(json).toHaveBeenCalledWith(rateLimitedEnvelope());
  });

  it('fail-closes a new login IP when the in-memory store is at capacity after purge', async () => {
    seedInMemoryRateLimitStoreForTests(IN_MEMORY_RATE_LIMIT_MAX_ENTRIES);

    req.ip = '203.0.113.99';
    req.socket.remoteAddress = '203.0.113.99';
    req.path = '/login';
    req.originalUrl = '/api/users/login';

    await rateLimit(WINDOW_MS, 5)(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(429);
    expect(json).toHaveBeenCalledWith(rateLimitedEnvelope());
  });

  it('still fail-opens a new non-critical IP when the in-memory store is at capacity', async () => {
    seedInMemoryRateLimitStoreForTests(IN_MEMORY_RATE_LIMIT_MAX_ENTRIES);

    req.ip = '203.0.113.100';
    req.socket.remoteAddress = '203.0.113.100';
    req.path = '/bands';
    req.originalUrl = '/api/bands';

    await rateLimit(WINDOW_MS, 10)(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(status).not.toHaveBeenCalled();
  });
});

describe('IP rate-limit scope mapping', () => {
  it('maps auth families separately from catalog browse', () => {
    expect(resolveIpRateLimitScope('/api/users/login')).toBe('login');
    expect(resolveIpRateLimitScope('/api/users/register')).toBe('register');
    expect(resolveIpRateLimitScope('/api/tokens/refresh')).toBe('token');
    expect(resolveIpRateLimitScope('/api/bands')).toBe('bands');
    expect(resolveIpRateLimitScope('/api/bands?limit=10')).toBe('bands');
  });
});
