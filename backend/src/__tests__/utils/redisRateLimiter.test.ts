import Redis from 'ioredis';
import {
  buildIpRateLimitKey,
  checkRateLimit,
  closeRedis,
  EnumerationRateLimiter,
  getRedis,
  initRedis,
  ipRateLimitResetPattern,
  RedisRateLimiter,
  resolveIpRateLimitScope,
} from '../../utils/redisRateLimiter';
import logger from '../../utils/logger';

jest.mock('ioredis');
jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

const RedisMock = Redis as unknown as jest.Mock;
const loggerMock = logger as unknown as {
  error: jest.Mock;
  info: jest.Mock;
};
const originalRedisUrl = process.env.REDIS_URL;
const originalCommandTimeout = process.env.REDIS_COMMAND_TIMEOUT_MS;

function createPipeline(
  results: unknown[] | null = [
    [null, 1],
    [null, 0],
    [null, 1],
    [null, 1],
  ]
) {
  const pipeline = {
    zremrangebyscore: jest.fn(),
    zcard: jest.fn(),
    zadd: jest.fn(),
    pexpire: jest.fn(),
    get: jest.fn(),
    incr: jest.fn(),
    exec: jest.fn().mockResolvedValue(results),
  };
  for (const method of [
    pipeline.zremrangebyscore,
    pipeline.zcard,
    pipeline.zadd,
    pipeline.pexpire,
    pipeline.get,
    pipeline.incr,
  ]) {
    method.mockReturnValue(pipeline);
  }
  return pipeline;
}

function createClient(overrides: Record<string, unknown> = {}) {
  const listeners = new Map<string, (...args: any[]) => void>();
  return {
    status: 'ready',
    on: jest.fn((event: string, listener: (...args: any[]) => void) => {
      listeners.set(event, listener);
    }),
    quit: jest.fn().mockResolvedValue('OK'),
    pipeline: jest.fn(() => createPipeline()),
    zremrangebyscore: jest.fn().mockResolvedValue(0),
    zcard: jest.fn().mockResolvedValue(0),
    del: jest.fn().mockResolvedValue(1),
    scan: jest.fn().mockResolvedValue(['0', []]),
    unlink: jest.fn().mockResolvedValue(0),
    listeners,
    ...overrides,
  };
}

function initializeClient(client = createClient()) {
  process.env.REDIS_URL = 'redis://localhost:6379';
  RedisMock.mockImplementationOnce(() => client);
  expect(initRedis()).toBe(client);
  return client;
}

function fakeResponse() {
  const response = {
    setHeader: jest.fn(),
    status: jest.fn(),
    json: jest.fn(),
  };
  response.status.mockReturnValue(response);
  return response;
}

describe('redis rate limiter connection lifecycle', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    delete process.env.REDIS_URL;
    delete process.env.REDIS_COMMAND_TIMEOUT_MS;
    await closeRedis();
  });

  afterEach(async () => {
    await closeRedis();
  });

  afterAll(() => {
    if (originalRedisUrl === undefined) {
      delete process.env.REDIS_URL;
    } else {
      process.env.REDIS_URL = originalRedisUrl;
    }
    if (originalCommandTimeout === undefined) {
      delete process.env.REDIS_COMMAND_TIMEOUT_MS;
    } else {
      process.env.REDIS_COMMAND_TIMEOUT_MS = originalCommandTimeout;
    }
  });

  it('returns null without REDIS_URL and only exposes ready clients', () => {
    expect(initRedis()).toBeNull();
    expect(getRedis()).toBeNull();

    const client = initializeClient(createClient({ status: 'connecting' }));
    expect(getRedis()).toBeNull();
    client.status = 'ready';
    expect(getRedis()).toBe(client);
  });

  it('uses the configured command timeout and records connection events', () => {
    process.env.REDIS_COMMAND_TIMEOUT_MS = '2500';
    const client = initializeClient();

    expect(RedisMock).toHaveBeenCalledWith(
      'redis://localhost:6379',
      expect.objectContaining({
        commandTimeout: 2500,
        connectTimeout: 2500,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 3,
      })
    );

    client.listeners.get('connect')?.();
    client.listeners.get('ready')?.();
    client.listeners.get('close')?.();
    client.listeners.get('error')?.(new Error('socket reset'));
    expect(loggerMock.info).toHaveBeenCalledWith('Redis connected');
    expect(loggerMock.info).toHaveBeenCalledWith('Redis ready');
    expect(loggerMock.error).toHaveBeenCalledWith('Redis connection error', {
      error: 'socket reset',
    });
  });

  it('falls back to the safe default for an invalid command timeout', () => {
    process.env.REDIS_COMMAND_TIMEOUT_MS = '25';
    initializeClient();

    expect(RedisMock).toHaveBeenCalledWith(
      'redis://localhost:6379',
      expect.objectContaining({
        commandTimeout: 1000,
        connectTimeout: 1000,
      })
    );
  });

  it('returns null when constructing the Redis client fails', () => {
    process.env.REDIS_URL = 'redis://localhost:6379';
    RedisMock.mockImplementationOnce(() => {
      throw new Error('invalid URL');
    });

    expect(initRedis()).toBeNull();
    expect(getRedis()).toBeNull();
    expect(loggerMock.error).toHaveBeenCalledWith(
      'Failed to initialize Redis',
      expect.objectContaining({ error: 'invalid URL' })
    );
  });

  it('closes a client and clears it even when quit rejects', async () => {
    const client = initializeClient(
      createClient({ quit: jest.fn().mockRejectedValue(new Error('already closed')) })
    );

    await closeRedis();

    expect(client.quit).toHaveBeenCalledTimes(1);
    expect(getRedis()).toBeNull();
    expect(loggerMock.error).toHaveBeenCalledWith(
      'Error closing Redis connection',
      expect.objectContaining({ error: 'already closed' })
    );
  });
});

describe('sliding-window rate limiting', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await closeRedis();
    delete process.env.REDIS_URL;
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await closeRedis();
  });

  it('fails open when Redis is unavailable', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_000);

    await expect(checkRateLimit('rate:test', 5, 10_000)).resolves.toEqual({
      allowed: true,
      remaining: 5,
      resetAt: 11_000,
    });
  });

  it('allows a request below the limit and writes the full pipeline', async () => {
    const pipeline = createPipeline([
      [null, 1],
      [null, 2],
      [null, 1],
      [null, 1],
    ]);
    initializeClient(createClient({ pipeline: jest.fn(() => pipeline) }));
    jest.spyOn(Date, 'now').mockReturnValue(20_000);

    await expect(checkRateLimit('rate:test', 5, 10_000)).resolves.toEqual({
      allowed: true,
      remaining: 2,
      resetAt: 30_000,
    });
    expect(pipeline.zremrangebyscore).toHaveBeenCalledWith('rate:test', 0, 10_000);
    expect(pipeline.zcard).toHaveBeenCalledWith('rate:test');
    expect(pipeline.zadd).toHaveBeenCalledWith('rate:test', 20_000, expect.any(String));
    expect(pipeline.pexpire).toHaveBeenCalledWith('rate:test', 10_000);
  });

  it('blocks a request at the limit', async () => {
    const pipeline = createPipeline([
      [null, 1],
      [null, 5],
      [null, 1],
      [null, 1],
    ]);
    initializeClient(createClient({ pipeline: jest.fn(() => pipeline) }));
    jest.spyOn(Date, 'now').mockReturnValue(30_000);

    await expect(checkRateLimit('rate:test', 5, 10_000)).resolves.toEqual({
      allowed: false,
      remaining: 0,
      resetAt: 40_000,
    });
  });

  it('throws when the Redis pipeline is empty or rejects so callers can fail-closed', async () => {
    const pipeline = createPipeline(null);
    const client = initializeClient(createClient({ pipeline: jest.fn(() => pipeline) }));
    jest.spyOn(Date, 'now').mockReturnValue(40_000);

    await expect(checkRateLimit('rate:test', 5, 10_000)).rejects.toThrow(
      'Redis rate limit pipeline returned no results'
    );

    const failingPipeline = createPipeline();
    failingPipeline.exec.mockRejectedValue(new Error('timeout'));
    client.pipeline.mockReturnValue(failingPipeline);
    await expect(checkRateLimit('rate:test', 5, 10_000)).rejects.toThrow('timeout');
  });

  it('throws when a Redis pipeline tuple reports a command error', async () => {
    const pipeline = createPipeline([
      [null, 1],
      [new Error('zcard failed'), 0],
      [null, 1],
      [null, 1],
    ]);
    initializeClient(createClient({ pipeline: jest.fn(() => pipeline) }));

    await expect(checkRateLimit('rate:test', 5, 10_000)).rejects.toThrow('zcard failed');
  });

  it('sets response headers and returns the canonical 429 envelope', async () => {
    const pipeline = createPipeline([
      [null, 1],
      [null, 1],
      [null, 1],
      [null, 1],
    ]);
    const client = initializeClient(createClient({ pipeline: jest.fn(() => pipeline) }));
    const limiter = new RedisRateLimiter(10_000, 1);
    const response = fakeResponse();
    const next = jest.fn();

    await limiter.middleware()({ ip: '203.0.113.1', socket: {} } as any, response as any, next);

    expect(response.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 1);
    expect(response.status).toHaveBeenCalledWith(429);
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      error: 'Too many requests, please try again later',
    });
    expect(next).not.toHaveBeenCalled();

    const scopedKey = buildIpRateLimitKey('general', '203.0.113.1', 10_000);
    expect(pipeline.zremrangebyscore).toHaveBeenCalledWith(scopedKey, 0, expect.any(Number));

    client.zcard.mockResolvedValue(4);
    await expect(limiter.getRequestCount('203.0.113.1')).resolves.toBe(4);
    await limiter.reset('203.0.113.1');
    expect(client.scan).toHaveBeenCalledWith(
      '0',
      'MATCH',
      ipRateLimitResetPattern('203.0.113.1'),
      'COUNT',
      100
    );
    expect(client.unlink).toHaveBeenCalledWith(scopedKey);
    expect(client.del).not.toHaveBeenCalledWith('rate_limit:203.0.113.1');
  });

  it('reset unlinks every scoped key for an IP', async () => {
    const client = initializeClient(
      createClient({
        scan: jest
          .fn()
          .mockResolvedValueOnce([
            '0',
            ['rate_limit:login:203.0.113.9:900000', 'rate_limit:bands:203.0.113.9:900000'],
          ]),
      })
    );
    const limiter = new RedisRateLimiter(900_000, 5, 'login');

    await limiter.reset('203.0.113.9');

    expect(client.scan).toHaveBeenCalledWith(
      '0',
      'MATCH',
      'rate_limit:*:203.0.113.9:*',
      'COUNT',
      100
    );
    const deleted = (client.unlink as jest.Mock).mock.calls.flat();
    expect(deleted).toEqual(
      expect.arrayContaining([
        'rate_limit:login:203.0.113.9:900000',
        'rate_limit:bands:203.0.113.9:900000',
      ])
    );
  });

  it('maps login separately from /api/bands', () => {
    expect(resolveIpRateLimitScope('/api/users/login')).toBe('login');
    expect(resolveIpRateLimitScope('/api/bands')).toBe('bands');
    expect(buildIpRateLimitKey('login', '203.0.113.1', 900000)).toBe(
      'rate_limit:login:203.0.113.1:900000'
    );
  });

  it('returns safe defaults when count and reset commands fail', async () => {
    const client = initializeClient(
      createClient({
        zremrangebyscore: jest.fn().mockRejectedValue(new Error('timeout')),
        scan: jest.fn().mockRejectedValue(new Error('timeout')),
      })
    );
    const limiter = new RedisRateLimiter();

    await expect(limiter.getRequestCount('203.0.113.2')).resolves.toBe(0);
    await expect(limiter.reset('203.0.113.2')).resolves.toBeUndefined();
    expect(client.scan).toHaveBeenCalled();
  });
});

describe('enumeration rate limiting', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await closeRedis();
    delete process.env.REDIS_URL;
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await closeRedis();
  });

  it('fails open without Redis', async () => {
    const limiter = new EnumerationRateLimiter(10_000, 5, 3);

    await expect(limiter.checkLimit('203.0.113.3', '/availability')).resolves.toEqual(
      expect.objectContaining({
        allowed: true,
        remaining: 5,
        requiresCaptcha: false,
      })
    );
  });

  it('returns CAPTCHA state below the limit and blocks at the limit', async () => {
    const belowLimit = createPipeline([
      [null, 1],
      [null, 2],
      [null, 1],
      [null, 1],
      [null, '3'],
      [null, 4],
      [null, 1],
    ]);
    const client = initializeClient(createClient({ pipeline: jest.fn(() => belowLimit) }));
    const limiter = new EnumerationRateLimiter(10_000, 5, 3);

    await expect(limiter.checkLimit('203.0.113.4', '/availability')).resolves.toEqual(
      expect.objectContaining({
        allowed: true,
        remaining: 2,
        requiresCaptcha: true,
      })
    );

    const atLimit = createPipeline([
      [null, 1],
      [null, 5],
      [null, 1],
      [null, 1],
      [null, '1'],
      [null, 2],
      [null, 1],
    ]);
    client.pipeline.mockReturnValue(atLimit);
    await expect(limiter.checkLimit('203.0.113.4', '/availability')).resolves.toEqual(
      expect.objectContaining({
        allowed: false,
        remaining: 0,
        requiresCaptcha: true,
      })
    );
  });

  it('fails open for an empty or failed pipeline', async () => {
    const pipeline = createPipeline(null);
    const client = initializeClient(createClient({ pipeline: jest.fn(() => pipeline) }));
    const limiter = new EnumerationRateLimiter(10_000, 5, 3);

    await expect(limiter.checkLimit('203.0.113.5', '/availability')).resolves.toEqual(
      expect.objectContaining({
        allowed: true,
        remaining: 5,
        requiresCaptcha: false,
      })
    );

    const failed = createPipeline();
    failed.exec.mockRejectedValue(new Error('timeout'));
    client.pipeline.mockReturnValue(failed);
    await expect(limiter.checkLimit('203.0.113.5', '/availability')).resolves.toEqual(
      expect.objectContaining({
        allowed: true,
        remaining: 5,
        requiresCaptcha: false,
      })
    );
  });

  it('resets one endpoint or scans and unlinks all enumeration keys', async () => {
    const client = initializeClient(
      createClient({
        scan: jest
          .fn()
          .mockResolvedValueOnce(['8', ['enum-check:203.0.113.6:a']])
          .mockResolvedValueOnce(['0', ['enum-captcha:203.0.113.6']]),
      })
    );
    const limiter = new EnumerationRateLimiter();

    await limiter.reset('203.0.113.6', '/availability');
    expect(client.del).toHaveBeenCalledWith('enum-check:203.0.113.6:/availability');

    await limiter.reset('203.0.113.6');
    expect(client.scan).toHaveBeenNthCalledWith(
      1,
      '0',
      'MATCH',
      'enum-*:203.0.113.6*',
      'COUNT',
      100
    );
    expect(client.unlink).toHaveBeenCalledWith(
      'enum-check:203.0.113.6:a',
      'enum-captcha:203.0.113.6'
    );
  });

  it('sets CAPTCHA headers and the canonical blocked response', async () => {
    const limiter = new EnumerationRateLimiter(10_000, 5, 3);
    jest.spyOn(limiter, 'checkLimit').mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: 50_000,
      requiresCaptcha: true,
    });
    const response = fakeResponse();
    const next = jest.fn();

    await limiter.middleware()(
      { ip: '203.0.113.7', path: '/availability', socket: {} } as any,
      response as any,
      next
    );

    expect(response.setHeader).toHaveBeenCalledWith('X-Requires-Captcha', 'true');
    expect(response.status).toHaveBeenCalledWith(429);
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      error: 'Too many requests. Please complete CAPTCHA verification to continue.',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('stores the CAPTCHA requirement and continues an allowed request', async () => {
    const limiter = new EnumerationRateLimiter();
    jest.spyOn(limiter, 'checkLimit').mockResolvedValue({
      allowed: true,
      remaining: 2,
      resetAt: 50_000,
      requiresCaptcha: true,
    });
    const request = {
      ip: '203.0.113.8',
      path: '/availability',
      socket: {},
    } as any;
    const response = fakeResponse();
    const next = jest.fn();

    await limiter.middleware()(request, response as any, next);

    expect(request.requiresCaptcha).toBe(true);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
