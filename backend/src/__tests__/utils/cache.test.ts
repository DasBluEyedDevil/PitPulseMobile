import { describe, it, expect, beforeEach, afterAll, jest } from '@jest/globals';
import { cache, getCacheVersion, incrementCacheVersion } from '../../utils/cache';
import { getRedis } from '../../utils/redisRateLimiter';

jest.mock('../../utils/redisRateLimiter', () => ({
  getRedis: jest.fn(),
}));

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), debug: jest.fn(), info: jest.fn() },
}));

const mockedGetRedis = getRedis as jest.MockedFunction<typeof getRedis>;

describe('cache version helpers', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockedGetRedis.mockReturnValue(null);
    await cache.clear();
  });

  afterAll(async () => {
    await cache.close();
  });

  it('defaults missing memory fallback versions to 1 and increments from 1 to 2', async () => {
    await expect(getCacheVersion('feed:global')).resolves.toBe(1);
    await expect(incrementCacheVersion('feed:global')).resolves.toBe(2);
    await expect(getCacheVersion('feed:global')).resolves.toBe(2);
  });

  it('uses Redis get, set NX, and incr when Redis is available', async () => {
    const redis = {
      get: jest
        .fn<() => Promise<string | null>>()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce('2'),
      set: jest.fn<() => Promise<string>>().mockResolvedValue('OK'),
      incr: jest.fn<() => Promise<number>>().mockResolvedValue(2),
    } as any;
    mockedGetRedis.mockReturnValue(redis);

    await expect(getCacheVersion('feed:friends:user-1')).resolves.toBe(1);
    await expect(incrementCacheVersion('feed:friends:user-1')).resolves.toBe(2);
    await expect(getCacheVersion('feed:friends:user-1')).resolves.toBe(2);

    expect(redis.get).toHaveBeenCalledWith('cache:version:feed:friends:user-1');
    expect(redis.set).toHaveBeenCalledWith('cache:version:feed:friends:user-1', '1', 'NX');
    expect(redis.incr).toHaveBeenCalledWith('cache:version:feed:friends:user-1');
  });
});
