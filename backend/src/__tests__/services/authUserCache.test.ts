import { afterAll, afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockQuery = jest.fn<(...args: unknown[]) => Promise<any>>();
const mockGetCache = jest.fn<(key: string) => Promise<unknown>>();
const mockGetCacheVersion = jest.fn<(scope: string) => Promise<number>>();
const mockIncrementCacheVersion = jest.fn<(scope: string) => Promise<number>>();
const mockSetCacheIfVersion = jest.fn<
  (key: string, value: unknown, ttl: number, scope: string, version: number) => Promise<boolean>
>();
const mockDeleteCache = jest.fn<(key: string) => Promise<void>>();

jest.mock('../../utils/redisRateLimiter', () => ({
  getRedis: jest.fn(() => null),
}));

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    getInstance: () => ({
      query: (...args: unknown[]) => mockQuery(...args),
    }),
  },
}));

jest.mock('../../utils/cache', () => {
  const actual = jest.requireActual('../../utils/cache') as typeof import('../../utils/cache');
  return {
    ...actual,
    getCache: (...args: unknown[]) => mockGetCache(args[0] as string),
    getCacheVersion: (...args: unknown[]) => mockGetCacheVersion(args[0] as string),
    incrementCacheVersion: (...args: unknown[]) => mockIncrementCacheVersion(args[0] as string),
    setCacheIfVersion: (...args: unknown[]) =>
      mockSetCacheIfVersion(
        args[0] as string,
        args[1],
        args[2] as number,
        args[3] as string,
        args[4] as number
      ),
    deleteCache: (...args: unknown[]) => mockDeleteCache(args[0] as string),
  };
});

import {
  AUTH_USER_ALLOWLIST,
  AUTH_USER_CACHE_DEFAULT_TTL_SEC,
  AUTH_USER_CACHE_MAX_TTL_SEC,
  getAuthUser,
  getAuthUserCacheTtlSec,
  invalidateAuthUserCache,
  projectAuthUser,
} from '../../services/user/authUserCache';
import { cache, CacheKeys, redisKey } from '../../utils/cache';

const USER_ID = 'user-123';
const dbRow = {
  id: USER_ID,
  username: 'testuser',
  is_active: true,
  is_admin: false,
  is_premium: true,
  email: 'secret@example.com',
  first_name: 'Secret',
  last_name: 'Name',
  date_of_birth: '1990-01-01',
  password_hash: 'should-never-be-selected',
};

const snapshot = {
  id: USER_ID,
  isActive: true,
  isAdmin: false,
  isPremium: true,
  username: 'testuser',
};

describe('auth user cache', () => {
  const originalTtl = process.env.AUTH_USER_CACHE_TTL_SEC;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCache.mockResolvedValue(null);
    mockGetCacheVersion.mockResolvedValue(1);
    mockIncrementCacheVersion.mockResolvedValue(2);
    mockSetCacheIfVersion.mockResolvedValue(true);
    mockDeleteCache.mockResolvedValue(undefined);
    mockQuery.mockResolvedValue({ rows: [dbRow] });
    delete process.env.AUTH_USER_CACHE_TTL_SEC;
  });

  afterEach(() => {
    if (originalTtl === undefined) {
      delete process.env.AUTH_USER_CACHE_TTL_SEC;
    } else {
      process.env.AUTH_USER_CACHE_TTL_SEC = originalTtl;
    }
  });

  afterAll(async () => {
    await cache.close();
  });

  it('uses caller key user:{id} and never passes cache:user: into setCache', async () => {
    expect(CacheKeys.user(USER_ID)).toBe(`user:${USER_ID}`);
    expect(redisKey(CacheKeys.user(USER_ID))).toBe(`cache:user:${USER_ID}`);

    await getAuthUser(USER_ID);

    expect(mockGetCache).toHaveBeenCalledWith(`user:${USER_ID}`);
    expect(mockSetCacheIfVersion).toHaveBeenCalledWith(
      `user:${USER_ID}`,
      snapshot,
      AUTH_USER_CACHE_DEFAULT_TTL_SEC,
      `auth:user:${USER_ID}`,
      1
    );
    expect(mockSetCacheIfVersion.mock.calls[0][0].startsWith('cache:')).toBe(false);
    expect(mockQuery.mock.calls[0][0]).toContain(
      'SELECT id, username, is_active, is_admin, is_premium'
    );
    expect(mockQuery.mock.calls[0][0]).not.toMatch(/email|date_of_birth|password_hash|first_name/i);
  });

  it('does not cache email, names, DOB, or password hashes', async () => {
    const user = await getAuthUser(USER_ID);
    const stored = mockSetCacheIfVersion.mock.calls[0][1] as Record<string, unknown>;

    expect(user).toEqual(snapshot);
    expect(Object.keys(stored).sort()).toEqual([...AUTH_USER_ALLOWLIST].sort());
    expect(stored).not.toHaveProperty('email');
    expect(stored).not.toHaveProperty('dateOfBirth');
    expect(stored).not.toHaveProperty('date_of_birth');
    expect(stored).not.toHaveProperty('firstName');
    expect(stored).not.toHaveProperty('lastName');
    expect(stored).not.toHaveProperty('passwordHash');
    expect(stored).not.toHaveProperty('password_hash');
  });

  it('strips PII if a dirty object is already in cache', async () => {
    mockGetCache.mockResolvedValue({
      ...snapshot,
      email: 'leaked@example.com',
      dateOfBirth: '1990-01-01',
      firstName: 'Leaked',
      passwordHash: 'hash',
    });

    const user = await getAuthUser(USER_ID);

    expect(user).toEqual(snapshot);
    expect(user).not.toHaveProperty('email');
    expect(user).not.toHaveProperty('dateOfBirth');
    expect(mockQuery).not.toHaveBeenCalled();
    expect(mockSetCacheIfVersion).not.toHaveBeenCalled();
  });

  it('projectAuthUser allowlists only authz fields', () => {
    const projected = projectAuthUser({
      id: USER_ID,
      username: 'testuser',
      isActive: true,
      isAdmin: false,
      isPremium: true,
      email: 'secret@example.com',
      dateOfBirth: '1990-01-01',
      firstName: 'Secret',
      passwordHash: 'hash',
    });

    expect(projected).toEqual(snapshot);
    expect(projected).not.toHaveProperty('email');
    expect(projected).not.toHaveProperty('dateOfBirth');
  });

  it('skips Redis when AUTH_USER_CACHE_TTL_SEC=0', async () => {
    process.env.AUTH_USER_CACHE_TTL_SEC = '0';

    const user = await getAuthUser(USER_ID);

    expect(user).toEqual(snapshot);
    expect(mockGetCache).not.toHaveBeenCalled();
    expect(mockSetCacheIfVersion).not.toHaveBeenCalled();
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it('parses AUTH_USER_CACHE_TTL_SEC and clamps to 60s', () => {
    process.env.AUTH_USER_CACHE_TTL_SEC = '30';
    expect(getAuthUserCacheTtlSec()).toBe(30);

    process.env.AUTH_USER_CACHE_TTL_SEC = '90';
    expect(getAuthUserCacheTtlSec()).toBe(AUTH_USER_CACHE_MAX_TTL_SEC);

    process.env.AUTH_USER_CACHE_TTL_SEC = '0';
    expect(getAuthUserCacheTtlSec()).toBe(0);
  });

  it('returns cached allowlisted snapshots without hitting Postgres', async () => {
    mockGetCache.mockResolvedValue(snapshot);

    await expect(getAuthUser(USER_ID)).resolves.toEqual(snapshot);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('invalidates via deleteCache(CacheKeys.user(id))', async () => {
    await invalidateAuthUserCache(USER_ID);

    expect(mockIncrementCacheVersion).toHaveBeenCalledWith(`auth:user:${USER_ID}`);
    expect(mockDeleteCache).toHaveBeenCalledWith(CacheKeys.user(USER_ID));
    expect(mockDeleteCache).toHaveBeenCalledWith(`user:${USER_ID}`);
    expect(mockDeleteCache.mock.calls[0][0].startsWith('cache:')).toBe(false);
  });

  it('does not repopulate a banned snapshot after invalidation wins the race', async () => {
    let generation = 1;
    mockGetCacheVersion.mockImplementation(async () => generation);
    mockIncrementCacheVersion.mockImplementation(async () => ++generation);

    const bannedSnapshot = { ...snapshot, isActive: false };
    let releaseDbRead!: () => void;
    let queryStarted!: () => void;
    const dbReadStarted = new Promise<void>((resolve) => {
      queryStarted = resolve;
    });
    const staleDbRead = new Promise<void>((resolve) => {
      releaseDbRead = resolve;
    });
    mockQuery.mockImplementationOnce(async () => {
      queryStarted();
      await staleDbRead;
      return { rows: [dbRow] };
    });

    const stored = new Map<string, unknown>();
    mockSetCacheIfVersion.mockImplementation(async (key, value, _ttl, _scope, version) => {
      if (version !== generation) return false;
      stored.set(key, value);
      return true;
    });

    const inFlight = getAuthUser(USER_ID);
    await dbReadStarted;
    await invalidateAuthUserCache(USER_ID);
    releaseDbRead();
    await inFlight;

    expect(stored.has(`user:${USER_ID}`)).toBe(false);
    expect(mockSetCacheIfVersion).toHaveBeenCalledWith(
      `user:${USER_ID}`,
      snapshot,
      AUTH_USER_CACHE_DEFAULT_TTL_SEC,
      `auth:user:${USER_ID}`,
      1
    );

    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          ...dbRow,
          is_active: false,
        },
      ],
    });
    await expect(getAuthUser(USER_ID)).resolves.toEqual(bannedSnapshot);
    expect(stored.get(`user:${USER_ID}`)).toEqual(bannedSnapshot);
  });

  it('does not repopulate a premium snapshot after revocation wins the race', async () => {
    let generation = 1;
    mockGetCacheVersion.mockImplementation(async () => generation);
    mockIncrementCacheVersion.mockImplementation(async () => ++generation);

    const revokedSnapshot = { ...snapshot, isPremium: false };
    let releaseDbRead!: () => void;
    let queryStarted!: () => void;
    const dbReadStarted = new Promise<void>((resolve) => {
      queryStarted = resolve;
    });
    const staleDbRead = new Promise<void>((resolve) => {
      releaseDbRead = resolve;
    });
    mockQuery.mockImplementationOnce(async () => {
      queryStarted();
      await staleDbRead;
      return { rows: [dbRow] };
    });

    const stored = new Map<string, unknown>();
    mockSetCacheIfVersion.mockImplementation(async (key, value, _ttl, _scope, version) => {
      if (version !== generation) return false;
      stored.set(key, value);
      return true;
    });

    const inFlight = getAuthUser(USER_ID);
    await dbReadStarted;
    await invalidateAuthUserCache(USER_ID);
    releaseDbRead();
    await inFlight;

    expect(stored.has(`user:${USER_ID}`)).toBe(false);
    expect(mockSetCacheIfVersion).toHaveBeenCalledWith(
      `user:${USER_ID}`,
      snapshot,
      AUTH_USER_CACHE_DEFAULT_TTL_SEC,
      `auth:user:${USER_ID}`,
      1
    );

    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          ...dbRow,
          is_premium: false,
        },
      ],
    });
    await expect(getAuthUser(USER_ID)).resolves.toEqual(revokedSnapshot);
    expect(stored.get(`user:${USER_ID}`)).toEqual(revokedSnapshot);
  });
});
