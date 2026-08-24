/**
 * Caching Layer
 *
 * Provides caching with Redis backend (preferred) or in-memory fallback.
 *
 * FEATURES:
 * - Redis caching for distributed systems (when REDIS_URL is set)
 * - In-memory fallback (automatic when Redis unavailable)
 * - TTL support
 * - Automatic cleanup
 * - Type-safe cache keys
 *
 * USAGE:
 * import { cache, getCache, setCache, deleteCache } from './utils/cache';
 *
 * // Caller keys never include `cache:`; Redis stores `cache:user:123`.
 * await setCache('user:123', userData, 3600); // 1 hour TTL
 * const user = await getCache('user:123');
 * await deleteCache('user:123');
 *
 * // Using cache service
 * await cache.set('user:123', userData, 3600);
 * const user = await cache.get('user:123');
 */

import { getRedis } from './redisRateLimiter';
import { QueueContracts } from '../jobs/queueContracts';
import { BadRequestError } from './errors';
import logger from './logger';

// Cache versioning - bump this to invalidate all caches on deploy
const CACHE_VERSION = process.env.CACHE_VERSION || 'v1';

/** Redis namespace for application cache. Callers must not include this prefix. */
export const CACHE_KEY_PREFIX = 'cache:';

const LEGACY_CACHE_READ_DISABLED_KEY = `${CACHE_KEY_PREFIX}legacy-read-disabled`;

const BULLMQ_QUEUE_NAMES = Object.values(QueueContracts).map((contract) => contract.queueName);

type CacheRedis = NonNullable<ReturnType<typeof getRedis>>;

/**
 * Prefix cache key with version for global cache invalidation on deploy
 */
export function getCacheKey(key: string): string {
  return `${CACHE_VERSION}:${key}`;
}

/**
 * Map a caller key (`feed:…`) to the Redis key (`cache:feed:…`).
 * Prefixes iff missing so `cache:feed:x` is not stored as `cache:cache:feed:x`.
 */
export function redisKey(key: string): string {
  return key.startsWith(CACHE_KEY_PREFIX) ? key : `${CACHE_KEY_PREFIX}${key}`;
}

function callerShapedPattern(pattern: string): string {
  return pattern.startsWith(CACHE_KEY_PREFIX) ? pattern.slice(CACHE_KEY_PREFIX.length) : pattern;
}

function isUnboundedCachePattern(pattern: string): boolean {
  const callerShaped = callerShapedPattern(pattern);
  return (
    !callerShaped ||
    callerShaped === '*' ||
    callerShaped === '?*' ||
    callerShaped.startsWith('*') ||
    callerShaped.startsWith('?')
  );
}

function isProtectedCachePattern(pattern: string): boolean {
  const callerShaped = callerShapedPattern(pattern).toLowerCase();
  if (callerShaped.startsWith('rate_limit:')) {
    return true;
  }
  if (
    callerShaped === 'bull' ||
    callerShaped.startsWith('bull:')
  ) {
    return true;
  }
  return BULLMQ_QUEUE_NAMES.some((queueName) => {
    const name = queueName.toLowerCase();
    return callerShaped === name || callerShaped.startsWith(name);
  });
}

/**
 * Reject unbounded or shared-Redis patterns before they are prefixed or SCAN'd.
 */
export function assertSafeCachePattern(pattern: string): void {
  const trimmed = typeof pattern === 'string' ? pattern.trim() : '';
  if (!trimmed) {
    throw new BadRequestError('Cache pattern is required');
  }
  if (isUnboundedCachePattern(trimmed)) {
    throw new BadRequestError('Unbounded cache pattern is not allowed');
  }
  const callerShaped = callerShapedPattern(trimmed);
  if (callerShaped.includes('[') || callerShaped.includes(']') || callerShaped.includes('\\')) {
    throw new BadRequestError('Unsupported cache pattern syntax');
  }
  if (isProtectedCachePattern(trimmed)) {
    throw new BadRequestError('Protected cache pattern is not allowed');
  }
}

function matchesGlob(key: string, globPattern: string): boolean {
  // Match the Redis-supported `*` and `?` wildcards without compiling admin input into RegExp.
  let keyIndex = 0;
  let patternIndex = 0;
  let starIndex = -1;
  let starMatchIndex = 0;

  while (keyIndex < key.length) {
    const patternCharacter = globPattern[patternIndex];
    if (
      patternCharacter === '?' ||
      patternCharacter === key[keyIndex]
    ) {
      keyIndex += 1;
      patternIndex += 1;
      continue;
    }

    if (patternCharacter === '*') {
      starIndex = patternIndex;
      starMatchIndex = keyIndex;
      patternIndex += 1;
      continue;
    }

    if (starIndex !== -1) {
      patternIndex = starIndex + 1;
      starMatchIndex += 1;
      keyIndex = starMatchIndex;
      continue;
    }

    return false;
  }

  while (globPattern[patternIndex] === '*') {
    patternIndex += 1;
  }

  return patternIndex === globPattern.length;
}

async function unlinkPrefixedMatches(redis: CacheRedis, match: string): Promise<number> {
  let cursor = '0';
  let deleted = 0;
  do {
    const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', match, 'COUNT', 100);
    cursor = nextCursor;
    const safeKeys = keys.filter(
      (key) => key.startsWith(CACHE_KEY_PREFIX) && key !== LEGACY_CACHE_READ_DISABLED_KEY
    );
    if (safeKeys.length > 0) {
      await redis.unlink(...safeKeys);
      deleted += safeKeys.length;
    }
  } while (cursor !== '0');
  return deleted;
}

// In-memory fallback cache
const memoryCache = new Map<string, { value: any; expiresAt: number }>();
const memoryCacheVersions = new Map<string, number>();
let legacyCacheReadDisabled = false;

async function disableLegacyCacheReads(redis?: CacheRedis): Promise<void> {
  legacyCacheReadDisabled = true;
  if (!redis || typeof redis.set !== 'function') return;

  try {
    await redis.set(LEGACY_CACHE_READ_DISABLED_KEY, '1');
  } catch (error) {
    logger.error('Redis legacy cache invalidation marker error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}

async function canReadLegacyCache(redis?: CacheRedis): Promise<boolean> {
  if (legacyCacheReadDisabled) return false;
  if (!redis || typeof redis.exists !== 'function') return true;

  try {
    if ((await redis.exists(LEGACY_CACHE_READ_DISABLED_KEY)) > 0) {
      legacyCacheReadDisabled = true;
      return false;
    }
  } catch (error) {
    logger.error('Redis legacy cache invalidation marker read error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }

  return true;
}

function getMemoryEntry(key: string): { value: any; expiresAt: number } | undefined {
  const entry = memoryCache.get(key);
  if (!entry) return undefined;

  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return undefined;
  }

  return entry;
}

function getCacheVersionKey(scope: string): string {
  return `cache:version:${scope}`;
}

/**
 * Get cache version for a scope. Missing versions start at 1.
 */
export async function getCacheVersion(scope: string): Promise<number> {
  const redis = getRedis();
  const versionKey = getCacheVersionKey(scope);

  if (redis) {
    try {
      const value = await redis.get(versionKey);
      const version = value ? Number.parseInt(value, 10) : 1;
      return Number.isFinite(version) && version > 0 ? version : 1;
    } catch (error) {
      logger.error('Redis cache version get error', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        scope,
      });
      // Fall through to memory version fallback
    }
  }

  return memoryCacheVersions.get(scope) ?? 1;
}

/**
 * Increment cache version for a scope. Missing versions advance from 1 to 2.
 */
export async function incrementCacheVersion(scope: string): Promise<number> {
  const redis = getRedis();
  const versionKey = getCacheVersionKey(scope);

  if (redis) {
    try {
      await redis.set(versionKey, '1', 'NX');
      const version = await redis.incr(versionKey);
      return typeof version === 'number' && version > 0 ? version : 2;
    } catch (error) {
      logger.error('Redis cache version increment error', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        scope,
      });
      // Fall through to memory version fallback
    }
  }

  const nextVersion = (memoryCacheVersions.get(scope) ?? 1) + 1;
  memoryCacheVersions.set(scope, nextVersion);
  return nextVersion;
}

/**
 * Get value from cache (Redis or memory fallback).
 * Dual-reads leftover unprefixed keys for one TTL generation after the prefix deploy.
 */
export async function getCache<T>(key: string): Promise<T | null> {
  const prefixed = redisKey(key);
  const redis = getRedis();

  if (redis) {
    try {
      const value = await redis.get(prefixed);
      if (value) return JSON.parse(value);
      if (prefixed !== key && (await canReadLegacyCache(redis))) {
        const legacy = await redis.get(key);
        return legacy ? JSON.parse(legacy) : null;
      }
      return null;
    } catch (error) {
      logger.error('Redis get error', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      // Fall through to memory cache
    }
  }

  const entry =
    getMemoryEntry(prefixed) ??
    (prefixed !== key && (await canReadLegacyCache()) ? getMemoryEntry(key) : undefined);
  return entry ? entry.value : null;
}

/**
 * Set value in cache with TTL (Redis or memory fallback)
 */
export async function setCache<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  const prefixed = redisKey(key);
  const redis = getRedis();

  if (redis) {
    try {
      await redis.setex(prefixed, ttlSeconds, JSON.stringify(value));
      // Drop leftover unprefixed keys so dual-read cannot return a longer-TTL stale value.
      if (prefixed !== key) {
        await redis.del(key);
      }
      return;
    } catch (error) {
      logger.error('Redis setex error', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      // Fall through to memory cache
    }
  }

  memoryCache.set(prefixed, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
  if (prefixed !== key) {
    memoryCache.delete(key);
  }
}

/**
 * Delete value from cache
 */
export async function deleteCache(key: string): Promise<void> {
  const prefixed = redisKey(key);
  const redis = getRedis();

  if (redis) {
    try {
      await redis.del(prefixed);
      if (prefixed !== key) {
        await redis.del(key);
      }
      return;
    } catch (error) {
      logger.error('Redis del error', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      // Fall through to memory cache
    }
  }

  memoryCache.delete(prefixed);
  if (prefixed !== key) {
    memoryCache.delete(key);
  }
}

/**
 * Cache service class with extended functionality
 */
class CacheService {
  private cleanupInterval?: ReturnType<typeof setInterval>;

  constructor() {
    // Start cleanup interval for in-memory cache
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, 60000); // Every minute
    this.cleanupInterval.unref();
  }

  /**
   * Set value in cache with TTL (seconds)
   */
  async set<T>(key: string, value: T, ttl: number = 3600): Promise<void> {
    await setCache(key, value, ttl);
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    return getCache<T>(key);
  }

  /**
   * Delete value from cache
   */
  async del(key: string): Promise<void> {
    await deleteCache(key);
  }

  /**
   * Check if key exists
   */
  async has(key: string): Promise<boolean> {
    const prefixed = redisKey(key);
    const redis = getRedis();

    if (redis) {
      try {
        if ((await redis.exists(prefixed)) > 0) return true;
        if (prefixed !== key && (await canReadLegacyCache(redis)) && (await redis.exists(key)) > 0) {
          return true;
        }
        return false;
      } catch (error) {
        logger.error('Redis exists error', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        // Fall through to memory cache
      }
    }

    return Boolean(
      getMemoryEntry(prefixed) ?? (prefixed !== key ? getMemoryEntry(key) : undefined)
    );
  }

  /**
   * Clear application cache keys only. Never FLUSHDB — Redis is shared with BullMQ.
   */
  async clear(): Promise<void> {
    const redis = getRedis();
    await disableLegacyCacheReads(redis ?? undefined);

    if (redis) {
      try {
        const deleted = await unlinkPrefixedMatches(redis, `${CACHE_KEY_PREFIX}*`);
        logger.info('Cleared cache prefix keys', { deleted });
        memoryCache.clear();
        memoryCacheVersions.clear();
        return;
      } catch (error) {
        logger.error('Redis cache prefix clear error', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
      }
    }

    memoryCache.clear();
    memoryCacheVersions.clear();
    if (!redis) {
      legacyCacheReadDisabled = false;
    }
  }

  /**
   * Get or set value (cache-aside pattern)
   */
  async getOrSet<T>(key: string, factory: () => Promise<T>, ttl: number = 3600): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Generate value
    const value = await factory();

    // Store in cache
    await this.set(key, value, ttl);

    return value;
  }

  /**
   * Delete keys by caller-shaped pattern (`feed:*` → SCAN `cache:feed:*`).
   * Rejects unbounded and protected patterns before prefixing.
   */
  async delPattern(pattern: string): Promise<void> {
    assertSafeCachePattern(pattern);
    const callerPattern = pattern.trim();
    const prefixedPattern = redisKey(callerPattern);
    const redis = getRedis();
    await disableLegacyCacheReads(redis ?? undefined);

    if (redis) {
      try {
        await unlinkPrefixedMatches(redis, prefixedPattern);
      } catch (error) {
        logger.error('Redis del pattern error', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
      }
      this.deleteMatchingMemoryKeys(prefixedPattern);
      this.deleteMatchingMemoryKeys(callerPattern);
      return;
    }

    this.deleteMatchingMemoryKeys(prefixedPattern);
    this.deleteMatchingMemoryKeys(callerPattern);
  }

  private deleteMatchingMemoryKeys(prefixedPattern: string): void {
    const keysToDelete: string[] = [];

    Array.from(memoryCache.keys()).forEach((key) => {
      if (matchesGlob(key, prefixedPattern)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => {
      memoryCache.delete(key);
    });
  }

  /**
   * Cleanup expired entries (in-memory only)
   */
  private cleanupExpired(): void {
    const redis = getRedis();
    if (redis) return; // Redis handles its own expiration

    const now = Date.now();
    const keysToDelete: string[] = [];

    Array.from(memoryCache.entries()).forEach(([key, entry]) => {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => {
      memoryCache.delete(key);
    });

    if (keysToDelete.length > 0) {
      logger.debug(`Cleaned up ${keysToDelete.length} expired cache entries`);
    }
  }

  /**
   * Get cache stats
   */
  getStats(): { size: number; type: 'memory' | 'redis' } {
    const redis = getRedis();
    return {
      size: memoryCache.size,
      type: redis ? 'redis' : 'memory',
    };
  }

  /**
   * Close cache connections
   */
  async close(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }
}

// Export singleton instance
export const cache = new CacheService();

// Export cache key builders for type safety
export const CacheKeys = {
  user: (id: string) => `user:${id}`,
  venue: (id: string) => `venue:${id}`,
  band: (id: string) => `band:${id}`,
  review: (id: string) => `review:${id}`,
  venueReviews: (venueId: string, page: number) => `venue:${venueId}:reviews:${page}`,
  bandReviews: (bandId: string, page: number) => `band:${bandId}:reviews:${page}`,
  userReviews: (userId: string) => `user:${userId}:reviews`,
  searchVenues: (query: string) => {
    const normalized = query.toLowerCase().trim().replace(/\s+/g, ' ');
    return `search:venues:${normalized}`;
  },
  searchBands: (query: string) => {
    const normalized = query.toLowerCase().trim().replace(/\s+/g, ' ');
    return `search:bands:${normalized}`;
  },
  concertCred: (userId: string) => `stats:concert-cred:${userId}`,
  bandAggregate: (bandId: string) => `band:aggregate:${bandId}`,
  venueAggregate: (venueId: string) => `venue:aggregate:${venueId}`,
  nearbyEvents: (lat: number, lon: number, radius: number) =>
    `events:nearby:${lat.toFixed(2)}:${lon.toFixed(2)}:${radius}`,
  trendingEvents: (lat: number, lon: number) =>
    `events:trending:${lat.toFixed(2)}:${lon.toFixed(2)}`,
  genreEvents: (genre: string) => `events:genre:${genre.toLowerCase()}`,
  recommendations: (userId: string) => `events:recs:${userId}`,
};

// Export TTL constants
export const CacheTTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
  DAY: 86400, // 24 hours
};
