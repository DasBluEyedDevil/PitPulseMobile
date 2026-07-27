import Database from '../../config/database';
import { decodeCursor, encodeCursor, FeedService, type FeedPage } from '../../services/FeedService';
import { getCache, getCacheVersion, incrementCacheVersion, setCache } from '../../utils/cache';

jest.mock('../../config/database');
jest.mock('../../utils/cache', () => ({
  getCache: jest.fn(),
  setCache: jest.fn(),
  getCacheVersion: jest.fn(),
  incrementCacheVersion: jest.fn(),
  CacheTTL: { SHORT: 60 },
}));
jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
  },
}));

const mockDb = {
  query: jest.fn(),
};

(Database.getInstance as jest.Mock).mockReturnValue(mockDb);

const mockedGetCache = getCache as jest.MockedFunction<typeof getCache>;
const mockedSetCache = setCache as jest.MockedFunction<typeof setCache>;
const mockedGetCacheVersion = getCacheVersion as jest.MockedFunction<typeof getCacheVersion>;
const mockedIncrementCacheVersion = incrementCacheVersion as jest.MockedFunction<
  typeof incrementCacheVersion
>;

describe('FeedService behavior', () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  const eventId = '22222222-2222-4222-8222-222222222222';

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetCache.mockResolvedValue(null);
    mockedGetCacheVersion.mockResolvedValue(4);
    mockedSetCache.mockResolvedValue();
    mockedIncrementCacheVersion.mockResolvedValue(5);
  });

  it('round-trips a valid cursor and rejects malformed cursor payloads', () => {
    const cursor = {
      createdAt: '2026-07-26T12:00:00.000Z',
      id: '33333333-3333-4333-8333-333333333333',
    };

    expect(decodeCursor(encodeCursor(cursor))).toEqual(cursor);
    expect(decodeCursor('not-json')).toBeNull();
    expect(decodeCursor(Buffer.from(JSON.stringify({ id: cursor.id })).toString('base64url'))).toBe(
      null
    );
  });

  it('returns a cached friends page without querying PostgreSQL or rewriting cache', async () => {
    const cachedPage: FeedPage = {
      items: [],
      nextCursor: null,
      hasMore: false,
    };
    mockedGetCache.mockResolvedValue(cachedPage);

    await expect(new FeedService().getFriendsFeed(userId)).resolves.toBe(cachedPage);

    expect(mockedGetCache).toHaveBeenCalledWith(`feed:friends:${userId}:v4:head`);
    expect(mockDb.query).not.toHaveBeenCalled();
    expect(mockedSetCache).not.toHaveBeenCalled();
  });

  it('maps a friends page, trims the sentinel row, and emits a stable next cursor', async () => {
    const rows = [
      {
        id: '33333333-3333-4333-8333-333333333333',
        user_id: '44444444-4444-4444-8444-444444444444',
        username: 'alice',
        user_avatar_url: '',
        event_id: eventId,
        event_name: null,
        venue_name: null,
        photo_url: '',
        created_at: new Date('2026-07-26T12:00:00.000Z'),
        has_badge_earned: 't',
        toast_count: 4,
        comment_count: 2,
        has_user_toasted: true,
      },
      {
        id: '55555555-5555-4555-8555-555555555555',
        user_id: '66666666-6666-4666-8666-666666666666',
        username: 'bob',
        user_avatar_url: 'https://images.example/bob.png',
        event_id: eventId,
        event_name: 'Show',
        venue_name: 'The Hall',
        photo_url: 'https://images.example/checkin.png',
        created_at: '2026-07-26T11:00:00.000Z',
        has_badge_earned: false,
        toast_count: null,
        comment_count: null,
        has_user_toasted: 'f',
      },
      {
        id: '77777777-7777-4777-8777-777777777777',
        created_at: '2026-07-26T10:00:00.000Z',
      },
    ];
    mockDb.query.mockResolvedValue({ rows });

    const page = await new FeedService().getFriendsFeed(userId, undefined, 2);

    expect(mockDb.query).toHaveBeenCalledWith(expect.stringContaining('JOIN user_followers'), [
      userId,
      3,
    ]);
    expect(page).toEqual({
      items: [
        expect.objectContaining({
          id: '33333333-3333-4333-8333-333333333333',
          checkinId: '33333333-3333-4333-8333-333333333333',
          eventName: 'Unnamed Event',
          venueName: 'Unknown Venue',
          userAvatarUrl: null,
          photoUrl: null,
          createdAt: '2026-07-26T12:00:00.000Z',
          hasBadgeEarned: true,
          hasUserToasted: true,
        }),
        expect.objectContaining({
          id: '55555555-5555-4555-8555-555555555555',
          toastCount: 0,
          commentCount: 0,
          hasUserToasted: false,
        }),
      ],
      nextCursor: encodeCursor({
        createdAt: '2026-07-26T11:00:00.000Z',
        id: '55555555-5555-4555-8555-555555555555',
      }),
      hasMore: true,
    });
    expect(mockedSetCache).toHaveBeenCalledWith(`feed:friends:${userId}:v4:head`, page, 60);
  });

  it('uses viewer-aware event feed pagination parameters without exposing another viewer cache', async () => {
    const cursor = encodeCursor({
      createdAt: '2026-07-26T12:00:00.000Z',
      id: '33333333-3333-4333-8333-333333333333',
    });
    mockDb.query.mockResolvedValue({ rows: [] });

    const page = await new FeedService().getEventFeed(eventId, userId, cursor, 7);

    expect(mockedGetCache).toHaveBeenCalledWith(`feed:event:${eventId}:v4:${userId}:${cursor}`);
    expect(mockDb.query).toHaveBeenCalledWith(expect.stringContaining('$5::uuid'), [
      eventId,
      8,
      '2026-07-26T12:00:00.000Z',
      '33333333-3333-4333-8333-333333333333',
      userId,
    ]);
    expect(page).toEqual({ items: [], nextCursor: null, hasMore: false });
  });

  it('maps happening-now groups and uses the shorter live-data cache lifetime', async () => {
    mockDb.query.mockResolvedValue({
      rows: [
        {
          event_id: eventId,
          event_name: null,
          venue_name: null,
          friends: [{ userId, username: 'alice', profileImageUrl: null }],
          total_friend_count: 1,
          last_checkin_at: new Date('2026-07-26T12:00:00.000Z'),
        },
      ],
    });

    const groups = await new FeedService().getHappeningNow(userId);

    expect(groups).toEqual([
      {
        eventId,
        eventName: 'Unnamed Event',
        venueName: 'Unknown Venue',
        friends: [{ userId, username: 'alice', profileImageUrl: null }],
        totalFriendCount: 1,
        lastCheckinAt: '2026-07-26T12:00:00.000Z',
      },
    ]);
    expect(mockedSetCache).toHaveBeenCalledWith(`feed:happening:${userId}:v4`, groups, 30);
  });

  it('counts unseen friends and happening-now items from their independent cursors', async () => {
    mockDb.query
      .mockResolvedValueOnce({
        rows: [
          { feed_type: 'friends', last_seen_at: new Date('2026-07-26T10:00:00.000Z') },
          { feed_type: 'happening_now', last_seen_at: '2026-07-26T11:00:00.000Z' },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ cnt: 3 }] })
      .mockResolvedValueOnce({ rows: [{ cnt: 2 }] });

    await expect(new FeedService().getUnseenCounts(userId)).resolves.toEqual({
      friends: 3,
      event: 0,
      happening_now: 2,
    });
    expect(mockDb.query).toHaveBeenCalledTimes(3);
    expect(mockDb.query).toHaveBeenNthCalledWith(2, expect.any(String), [
      userId,
      '2026-07-26T10:00:00.000Z',
    ]);
  });

  it('upserts the last-read position and normalizes an absent check-in ID to null', async () => {
    mockDb.query.mockResolvedValue({ rowCount: 1, rows: [] });

    await new FeedService().markFeedRead(userId, 'friends', '2026-07-26T12:00:00.000Z');

    expect(mockDb.query).toHaveBeenCalledWith(expect.stringContaining('ON CONFLICT'), [
      userId,
      'friends',
      '2026-07-26T12:00:00.000Z',
      null,
    ]);
  });

  it('contains cache invalidation failures so a successful check-in is not rolled back', async () => {
    mockedIncrementCacheVersion.mockRejectedValue(new Error('Redis unavailable'));
    const service = new FeedService();

    await expect(service.invalidateUserFeedCache(userId)).resolves.toBeUndefined();
    await expect(service.invalidateEventFeedCache(eventId)).resolves.toBeUndefined();
    await expect(service.invalidateGlobalFeedCache()).resolves.toBeUndefined();
  });
});
