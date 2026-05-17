import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { FeedService } from '../../services/FeedService';
import { getCache, getCacheVersion, incrementCacheVersion, setCache } from '../../utils/cache';

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn(() => ({
      query: jest.fn<() => Promise<{ rows: any[] }>>().mockResolvedValue({ rows: [] }),
    })),
  },
}));

jest.mock('../../utils/cache', () => ({
  getCache: jest.fn<() => Promise<any>>().mockResolvedValue(null),
  setCache: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  getCacheVersion: jest.fn<() => Promise<number>>().mockResolvedValue(7),
  incrementCacheVersion: jest.fn<() => Promise<number>>().mockResolvedValue(8),
  CacheTTL: { SHORT: 60 },
}));

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), debug: jest.fn(), info: jest.fn() },
}));

const mockedGetCache = getCache as jest.MockedFunction<typeof getCache>;
const mockedSetCache = setCache as jest.MockedFunction<typeof setCache>;
const mockedGetCacheVersion = getCacheVersion as jest.MockedFunction<typeof getCacheVersion>;
const mockedIncrementCacheVersion = incrementCacheVersion as jest.MockedFunction<
  typeof incrementCacheVersion
>;

describe('FeedService cache versions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetCache.mockResolvedValue(null);
    mockedGetCacheVersion.mockResolvedValue(7);
    mockedIncrementCacheVersion.mockResolvedValue(8);
  });

  it('includes versions in feed cache keys', async () => {
    const service = new FeedService();
    const userId = '11111111-1111-4111-8111-111111111111';
    const eventId = '22222222-2222-4222-8222-222222222222';

    await service.getFriendsFeed(userId, 'cursor-1');
    await service.getHappeningNow(userId);
    await service.getEventFeed(eventId, userId, 'cursor-2');
    await service.getGlobalFeed(userId, 'cursor-3');

    expect(mockedGetCache).toHaveBeenCalledWith(`feed:friends:${userId}:v7:cursor-1`);
    expect(mockedSetCache).toHaveBeenCalledWith(
      `feed:happening:${userId}:v7`,
      expect.any(Array),
      30
    );
    expect(mockedGetCache).toHaveBeenCalledWith(`feed:event:${eventId}:v7:${userId}:cursor-2`);
    expect(mockedGetCache).toHaveBeenCalledWith(`feed:global:v7:${userId}:cursor-3`);
  });

  it('invalidates feed caches by incrementing versions', async () => {
    const service = new FeedService();

    await service.invalidateUserFeedCache('user-1');
    await service.invalidateEventFeedCache('event-1');
    await service.invalidateGlobalFeedCache();

    expect(mockedIncrementCacheVersion).toHaveBeenCalledWith('feed:friends:user-1');
    expect(mockedIncrementCacheVersion).toHaveBeenCalledWith('feed:happening:user-1');
    expect(mockedIncrementCacheVersion).toHaveBeenCalledWith('feed:event:event-1');
    expect(mockedIncrementCacheVersion).toHaveBeenCalledWith('feed:global');
  });
});
