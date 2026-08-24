import { describe, it, expect, beforeEach, afterAll, jest } from '@jest/globals';
import {
  assertSafeCachePattern,
  cache,
  CACHE_KEY_PREFIX,
  CacheKeys,
  CacheTTL,
  deleteCache,
  getCache,
  getCacheKey,
  getCacheVersion,
  incrementCacheVersion,
  redisKey,
  setCache,
  setCacheIfVersion,
} from '../../utils/cache';
import { BadRequestError } from '../../utils/errors';
import { QueueContracts } from '../../jobs/queueContracts';
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

  it('normalizes invalid Redis versions and invalid increments', async () => {
    const redis = {
      get: jest.fn<() => Promise<string | null>>().mockResolvedValue('-3'),
      set: jest.fn<() => Promise<string>>().mockResolvedValue('OK'),
      incr: jest.fn<() => Promise<number>>().mockResolvedValue(0),
    } as any;
    mockedGetRedis.mockReturnValue(redis);

    await expect(getCacheVersion('feed:global')).resolves.toBe(1);
    await expect(incrementCacheVersion('feed:global')).resolves.toBe(2);
  });

  it('falls back to memory versions when Redis commands fail', async () => {
    const redis = {
      get: jest.fn<() => Promise<string>>().mockRejectedValue(new Error('get failed')),
      set: jest.fn<() => Promise<string>>().mockRejectedValue(new Error('set failed')),
      incr: jest.fn(),
    } as any;
    mockedGetRedis.mockReturnValue(redis);

    await expect(getCacheVersion('fallback-scope')).resolves.toBe(1);
    await expect(incrementCacheVersion('fallback-scope')).resolves.toBe(2);
    mockedGetRedis.mockReturnValue(null);
    await expect(getCacheVersion('fallback-scope')).resolves.toBe(2);
  });
});

describe('cache values and cache-aside behavior', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockedGetRedis.mockReturnValue(null);
    await cache.clear();
  });

  afterAll(async () => {
    await cache.close();
  });

  it('sets, reads, checks, and deletes memory fallback entries', async () => {
    await setCache('profile:user-1', { username: 'alice' }, 30);

    await expect(getCache('profile:user-1')).resolves.toEqual({ username: 'alice' });
    await expect(cache.has('profile:user-1')).resolves.toBe(true);
    expect(cache.getStats()).toEqual({ size: 1, type: 'memory' });

    await deleteCache('profile:user-1');
    await expect(getCache('profile:user-1')).resolves.toBeNull();
    await expect(cache.has('profile:user-1')).resolves.toBe(false);
  });

  it('rejects stale conditional writes after a memory generation increment', async () => {
    await expect(setCacheIfVersion('auth:user-1', { isActive: true }, 60, 'auth:user:1', 1)).resolves.toBe(
      true
    );

    await expect(incrementCacheVersion('auth:user:1')).resolves.toBe(2);
    await expect(
      setCacheIfVersion('auth:user-1', { isActive: true }, 60, 'auth:user:1', 1)
    ).resolves.toBe(false);
    await expect(getCache('auth:user-1')).resolves.toEqual({ isActive: true });
  });

  it('evicts expired memory entries on get and has', async () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(1_000);
    await cache.set('expired-on-get', 'value', 1);
    await cache.set('expired-on-has', 'value', 1);
    now.mockReturnValue(2_001);

    await expect(cache.get('expired-on-get')).resolves.toBeNull();
    await expect(cache.has('expired-on-has')).resolves.toBe(false);
    now.mockRestore();
  });

  it('uses the cache-aside factory only on a miss', async () => {
    const factory = jest.fn<() => Promise<string>>().mockResolvedValue('computed');

    await expect(cache.getOrSet('aside', factory, 60)).resolves.toBe('computed');
    await expect(cache.getOrSet('aside', factory, 60)).resolves.toBe('computed');

    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('deletes matching memory keys without deleting unrelated entries', async () => {
    await cache.set('feed:user-1:one', 1);
    await cache.set('feed:user-1:two', 2);
    await cache.set('feed:user-2:one', 3);

    await cache.delPattern('feed:user-1:*');

    await expect(cache.get('feed:user-1:one')).resolves.toBeNull();
    await expect(cache.get('feed:user-1:two')).resolves.toBeNull();
    await expect(cache.get('feed:user-2:one')).resolves.toBe(3);
  });

  it('uses Redis value commands and distributed cache statistics when available', async () => {
    const redis = {
      get: jest.fn<() => Promise<string | null>>().mockResolvedValue('{"username":"bob"}'),
      setex: jest.fn<() => Promise<string>>().mockResolvedValue('OK'),
      del: jest.fn<() => Promise<number>>().mockResolvedValue(1),
      exists: jest.fn<() => Promise<number>>().mockResolvedValue(1),
      scan: jest
        .fn<() => Promise<[string, string[]]>>()
        .mockResolvedValue(['0', ['cache:profile:user-2', 'bull:badge-eval:1']]),
      unlink: jest.fn<() => Promise<number>>().mockResolvedValue(1),
      flushdb: jest.fn<() => Promise<string>>().mockResolvedValue('OK'),
    } as any;
    mockedGetRedis.mockReturnValue(redis);

    await expect(getCache('profile:user-2')).resolves.toEqual({ username: 'bob' });
    await setCache('profile:user-2', { username: 'bob' }, 90);
    await expect(cache.has('profile:user-2')).resolves.toBe(true);
    expect(cache.getStats().type).toBe('redis');
    await deleteCache('profile:user-2');
    await cache.clear();

    expect(redis.get).toHaveBeenCalledWith('cache:profile:user-2');
    expect(redis.setex).toHaveBeenCalledWith(
      'cache:profile:user-2',
      90,
      JSON.stringify({ username: 'bob' })
    );
    expect(redis.exists).toHaveBeenCalledWith('cache:profile:user-2');
    expect(redis.del).toHaveBeenCalledWith('cache:profile:user-2');
    expect(redis.scan).toHaveBeenCalledWith('0', 'MATCH', 'cache:*', 'COUNT', 100);
    expect(redis.unlink).toHaveBeenCalledWith('cache:profile:user-2');
    expect(redis.unlink).not.toHaveBeenCalledWith('bull:badge-eval:1');
    expect(redis.flushdb).not.toHaveBeenCalled();
  });

  it('uses an atomic Redis generation check for conditional writes', async () => {
    const redis = {
      eval: jest.fn<(...args: unknown[]) => Promise<number>>().mockResolvedValue(1),
    } as any;
    mockedGetRedis.mockReturnValue(redis);

    await expect(
      setCacheIfVersion('auth:user-1', { isPremium: false }, 45, 'auth:user:1', 3)
    ).resolves.toBe(true);

    expect(redis.eval).toHaveBeenCalledWith(
      expect.stringContaining("redis.call('GET', KEYS[1])"),
      2,
      'cache:version:auth:user:1',
      'cache:auth:user-1',
      '3',
      JSON.stringify({ isPremium: false }),
      '45',
      'auth:user-1'
    );
  });

  it('scans and unlinks Redis pattern matches across cursor pages', async () => {
    const redis = {
      scan: jest
        .fn<() => Promise<[string, string[]]>>()
        .mockResolvedValueOnce(['9', ['cache:feed:one']])
        .mockResolvedValueOnce(['0', ['cache:feed:two', 'cache:feed:three']]),
      unlink: jest.fn<() => Promise<number>>().mockResolvedValue(1),
    } as any;
    mockedGetRedis.mockReturnValue(redis);

    await cache.delPattern('feed:*');

    expect(redis.scan).toHaveBeenNthCalledWith(1, '0', 'MATCH', 'cache:feed:*', 'COUNT', 100);
    expect(redis.scan).toHaveBeenNthCalledWith(2, '9', 'MATCH', 'cache:feed:*', 'COUNT', 100);
    expect(redis.unlink).toHaveBeenNthCalledWith(1, 'cache:feed:one');
    expect(redis.unlink).toHaveBeenNthCalledWith(2, 'cache:feed:two', 'cache:feed:three');
  });

  it('matches Redis-style question marks and interior stars in memory fallback', async () => {
    await cache.set('feed:a:one', 1);
    await cache.set('feed:b:one', 2);
    await cache.set('feed:ab:one', 3);
    await cache.set('feed:a:two', 4);

    await cache.delPattern('feed:?:one');

    await expect(cache.get('feed:a:one')).resolves.toBeNull();
    await expect(cache.get('feed:b:one')).resolves.toBeNull();
    await expect(cache.get('feed:ab:one')).resolves.toBe(3);
    await expect(cache.get('feed:a:two')).resolves.toBe(4);

    await cache.delPattern('feed:*:two');
    await expect(cache.get('feed:a:two')).resolves.toBeNull();
  });

  it('falls back to memory for Redis value and pattern failures', async () => {
    const redis = {
      setex: jest.fn<() => Promise<string>>().mockRejectedValue(new Error('set failed')),
      get: jest.fn<() => Promise<string>>().mockRejectedValue(new Error('get failed')),
      exists: jest.fn<() => Promise<number>>().mockRejectedValue(new Error('exists failed')),
      del: jest.fn<() => Promise<number>>().mockRejectedValue(new Error('delete failed')),
      scan: jest
        .fn<() => Promise<[string, string[]]>>()
        .mockRejectedValue(new Error('scan failed')),
      unlink: jest.fn<() => Promise<number>>().mockRejectedValue(new Error('unlink failed')),
      flushdb: jest.fn<() => Promise<string>>().mockRejectedValue(new Error('flush failed')),
    } as any;
    mockedGetRedis.mockReturnValue(redis);

    await setCache('fallback:one', 'one', 60);
    await expect(getCache('fallback:one')).resolves.toBe('one');
    await expect(cache.has('fallback:one')).resolves.toBe(true);
    await cache.set('fallback:two', 'two', 60);
    await cache.delPattern('fallback:*');
    await expect(cache.get('fallback:one')).resolves.toBeNull();
    await expect(cache.get('fallback:two')).resolves.toBeNull();

    await setCache('fallback:clear', 'value', 60);
    await cache.clear();
    expect(redis.flushdb).not.toHaveBeenCalled();
    mockedGetRedis.mockReturnValue(null);
    await expect(cache.get('fallback:clear')).resolves.toBeNull();

    await setCache('fallback:delete', 'value', 60);
    mockedGetRedis.mockReturnValue(redis);
    await deleteCache('fallback:delete');
    mockedGetRedis.mockReturnValue(null);
    await expect(getCache('fallback:delete')).resolves.toBeNull();
  });

  it('builds stable normalized keys and exposes versioned TTLs', () => {
    expect(getCacheKey('user:1')).toMatch(/^v[^:]*:user:1$/);
    expect(CacheKeys.user('1')).toBe('user:1');
    expect(CacheKeys.searchVenues('  Radio   City ')).toBe('search:venues:radio city');
    expect(CacheKeys.searchBands('  The   Tests ')).toBe('search:bands:the tests');
    expect(CacheKeys.nearbyEvents(40.7128, -74.006, 25)).toBe('events:nearby:40.71:-74.01:25');
    expect(CacheKeys.trendingEvents(40.7128, -74.006)).toBe('events:trending:40.71:-74.01');
    expect(CacheKeys.genreEvents('PUNK')).toBe('events:genre:punk');
    expect(CacheTTL).toEqual({ SHORT: 60, MEDIUM: 300, LONG: 3600, DAY: 86400 });
  });
});

describe('transparent cache prefix and pattern safety', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockedGetRedis.mockReturnValue(null);
    await cache.clear();
  });

  afterAll(async () => {
    await cache.close();
  });

  it('prefixes caller keys iff they are missing cache:', () => {
    expect(CACHE_KEY_PREFIX).toBe('cache:');
    expect(redisKey('feed:x')).toBe('cache:feed:x');
    expect(redisKey('cache:feed:x')).toBe('cache:feed:x');
    expect(redisKey('user:1')).toBe('cache:user:1');
  });

  it('writes cache:feed:x for setCache(feed:x) and does not double-prefix', async () => {
    const redis = {
      setex: jest.fn<() => Promise<string>>().mockResolvedValue('OK'),
      del: jest.fn<() => Promise<number>>().mockResolvedValue(1),
      exists: jest.fn<() => Promise<number>>().mockResolvedValue(1),
    } as any;
    mockedGetRedis.mockReturnValue(redis);

    await setCache('feed:x', { n: 1 }, 60);
    await expect(cache.has('feed:x')).resolves.toBe(true);

    expect(redis.setex).toHaveBeenCalledWith('cache:feed:x', 60, JSON.stringify({ n: 1 }));
    expect(redis.setex).not.toHaveBeenCalledWith(
      'cache:cache:feed:x',
      60,
      JSON.stringify({ n: 1 })
    );
    expect(redis.exists).toHaveBeenCalledWith('cache:feed:x');

    await setCache('cache:feed:x', { n: 2 }, 60);
    expect(redis.setex).toHaveBeenCalledWith('cache:feed:x', 60, JSON.stringify({ n: 2 }));
    expect(redis.setex).not.toHaveBeenCalledWith(
      'cache:cache:feed:x',
      expect.any(Number),
      expect.any(String)
    );
  });

  it('dual-reads leftover unprefixed keys on GET miss', async () => {
    const redis = {
      get: jest
        .fn<() => Promise<string | null>>()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce('{"legacy":true}'),
    } as any;
    mockedGetRedis.mockReturnValue(redis);

    await expect(getCache('feed:x')).resolves.toEqual({ legacy: true });
    expect(redis.get).toHaveBeenNthCalledWith(1, 'cache:feed:x');
    expect(redis.get).toHaveBeenNthCalledWith(2, 'feed:x');
  });

  it('disables legacy Redis reads after prefix-wide clear without scanning unprefixed keys', async () => {
    let legacyReadsDisabled = false;
    const redis = {
      get: jest.fn<() => Promise<string | null>>().mockResolvedValue(null),
      set: jest.fn<(key: string) => Promise<string>>().mockImplementation(async (key: string) => {
        if (key === 'cache:legacy-read-disabled') legacyReadsDisabled = true;
        return 'OK';
      }),
      exists: jest.fn<(key: string) => Promise<number>>().mockImplementation(async (key: string) =>
        key === 'cache:legacy-read-disabled' && legacyReadsDisabled ? 1 : 0
      ),
      scan: jest
        .fn<() => Promise<[string, string[]]>>()
        .mockResolvedValue(['0', ['cache:feed:one']]),
      unlink: jest.fn<() => Promise<number>>().mockResolvedValue(1),
    } as any;
    mockedGetRedis.mockReturnValue(redis);

    await cache.clear();
    await expect(getCache('feed:one')).resolves.toBeNull();

    expect(redis.scan).toHaveBeenCalledWith('0', 'MATCH', 'cache:*', 'COUNT', 100);
    expect(redis.get).toHaveBeenCalledWith('cache:feed:one');
    expect(redis.get).not.toHaveBeenCalledWith('feed:one');
    expect(redis.scan).not.toHaveBeenCalledWith('0', 'MATCH', '*', 'COUNT', 100);
  });

  it('rejects unbounded and protected patterns before SCAN', async () => {
    const redis = {
      scan: jest.fn<() => Promise<[string, string[]]>>(),
      unlink: jest.fn<() => Promise<number>>(),
      flushdb: jest.fn<() => Promise<string>>(),
    } as any;
    mockedGetRedis.mockReturnValue(redis);

    await expect(cache.delPattern('*')).rejects.toBeInstanceOf(BadRequestError);
    await expect(cache.delPattern('?*')).rejects.toBeInstanceOf(BadRequestError);
    await expect(cache.delPattern('')).rejects.toBeInstanceOf(BadRequestError);
    await expect(cache.delPattern('rate_limit:*')).rejects.toBeInstanceOf(BadRequestError);
    await expect(cache.delPattern('bull:*')).rejects.toBeInstanceOf(BadRequestError);
    await expect(cache.delPattern('cache:*')).rejects.toBeInstanceOf(BadRequestError);
    await expect(cache.delPattern('feed:[ab]*')).rejects.toBeInstanceOf(BadRequestError);

    for (const contract of Object.values(QueueContracts)) {
      await expect(cache.delPattern(`${contract.queueName}*`)).rejects.toBeInstanceOf(
        BadRequestError
      );
    }

    expect(redis.scan).not.toHaveBeenCalled();
    expect(redis.unlink).not.toHaveBeenCalled();
    expect(redis.flushdb).not.toHaveBeenCalled();
    expect(() => assertSafeCachePattern('feed:*')).not.toThrow();
    expect(() => assertSafeCachePattern('rate_limitish:*')).not.toThrow();
  });

  it('disables legacy Redis reads after pattern clear without scanning unprefixed keys', async () => {
    let legacyReadsDisabled = false;
    const redis = {
      get: jest.fn<() => Promise<string | null>>().mockResolvedValue(null),
      set: jest.fn<(key: string) => Promise<string>>().mockImplementation(async (key: string) => {
        if (key === 'cache:legacy-read-disabled') legacyReadsDisabled = true;
        return 'OK';
      }),
      exists: jest.fn<(key: string) => Promise<number>>().mockImplementation(async (key: string) =>
        key === 'cache:legacy-read-disabled' && legacyReadsDisabled ? 1 : 0
      ),
      scan: jest
        .fn<() => Promise<[string, string[]]>>()
        .mockResolvedValue(['0', ['cache:feed:one']]),
      unlink: jest.fn<() => Promise<number>>().mockResolvedValue(1),
    } as any;
    mockedGetRedis.mockReturnValue(redis);

    await cache.delPattern('feed:*');
    await expect(getCache('feed:one')).resolves.toBeNull();

    expect(redis.scan).toHaveBeenCalledWith('0', 'MATCH', 'cache:feed:*', 'COUNT', 100);
    expect(redis.get).toHaveBeenCalledWith('cache:feed:one');
    expect(redis.get).not.toHaveBeenCalledWith('feed:one');
    expect(redis.scan).not.toHaveBeenCalledWith('0', 'MATCH', 'feed:*', 'COUNT', 100);
  });

  it('does not unlink BullMQ-shaped keys during prefix clear', async () => {
    const redis = {
      scan: jest
        .fn<() => Promise<[string, string[]]>>()
        .mockResolvedValue(['0', ['cache:feed:one', 'bull:event-sync:1', 'rate_limit:1.1.1.1']]),
      unlink: jest.fn<() => Promise<number>>().mockResolvedValue(1),
      flushdb: jest.fn<() => Promise<string>>().mockResolvedValue('OK'),
    } as any;
    mockedGetRedis.mockReturnValue(redis);

    await cache.clear();

    expect(redis.scan).toHaveBeenCalledWith('0', 'MATCH', 'cache:*', 'COUNT', 100);
    expect(redis.unlink).toHaveBeenCalledWith('cache:feed:one');
    expect(redis.unlink).not.toHaveBeenCalledWith('bull:event-sync:1');
    expect(redis.unlink).not.toHaveBeenCalledWith('rate_limit:1.1.1.1');
    expect(redis.flushdb).not.toHaveBeenCalled();
  });
});
