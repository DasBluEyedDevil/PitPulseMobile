import { describe, it, expect, jest } from '@jest/globals';
import { CheckinCreatorService } from '../../services/checkin/CheckinCreatorService';

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn(() => ({
      query: jest.fn(),
      getClient: jest.fn(),
    })),
  },
}));

jest.mock('../../services/EventService', () => ({
  EventService: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../../services/FeedService', () => ({
  FeedService: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../../jobs/badgeQueue', () => ({ badgeEvalQueue: null }));
jest.mock('../../services/NotificationBatchService', () => ({ notificationBatchService: {} }));
jest.mock('../../utils/redisRateLimiter', () => ({ getRedis: jest.fn(() => null) }));
jest.mock('../../utils/cache', () => ({
  cache: { del: jest.fn<() => Promise<void>>().mockResolvedValue(undefined) },
  CacheKeys: { recommendations: (userId: string) => `events:recs:${userId}` },
}));
jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), warn: jest.fn(), debug: jest.fn(), info: jest.fn() },
}));

describe('CheckinCreatorService feed cache invalidation', () => {
  it('dedupes impacted users, includes creator, and invalidates users with bounded work', async () => {
    const service = new CheckinCreatorService(jest.fn<() => Promise<any>>()) as any;
    const feedService = {
      invalidateUserFeedCache: jest
        .fn<(userId: string) => Promise<void>>()
        .mockResolvedValue(undefined),
      invalidateEventFeedCache: jest
        .fn<(eventId: string) => Promise<void>>()
        .mockResolvedValue(undefined),
      invalidateGlobalFeedCache: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    };
    service.feedService = feedService;

    await service.invalidateFeedCachesForCheckin('creator-1', 'event-1', [
      'follower-1',
      'follower-1',
      'creator-1',
    ]);

    expect(feedService.invalidateUserFeedCache).toHaveBeenCalledTimes(2);
    expect(feedService.invalidateUserFeedCache).toHaveBeenCalledWith('creator-1');
    expect(feedService.invalidateUserFeedCache).toHaveBeenCalledWith('follower-1');
    expect(feedService.invalidateEventFeedCache).toHaveBeenCalledWith('event-1');
    expect(feedService.invalidateGlobalFeedCache).toHaveBeenCalledTimes(1);
  });
});
