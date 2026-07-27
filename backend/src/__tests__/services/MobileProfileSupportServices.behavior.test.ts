import { cache, CacheKeys } from '../../utils/cache';
import { CheckinRatingService } from '../../services/checkin/CheckinRatingService';
import { UserStatsService } from '../../services/user/UserStatsService';
import { WishlistService } from '../../services/WishlistService';

const mockQuery = jest.fn();

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    getInstance: () => ({ query: mockQuery }),
  },
}));
jest.mock('../../utils/cache', () => ({
  cache: { del: jest.fn() },
  CacheKeys: {
    bandAggregate: (bandId: string) => `band:${bandId}:aggregate`,
    venueAggregate: (venueId: string) => `venue:${venueId}:aggregate`,
  },
}));
jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('CheckinRatingService ownership and aggregate behavior', () => {
  let getCheckinById: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockReset();
    getCheckinById = jest.fn().mockResolvedValue({ id: 'checkin-1', userId: 'user-1' });
    (cache.del as jest.Mock).mockReset().mockResolvedValue(undefined);
  });

  it('rejects a missing check-in before writing ratings', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    await expect(
      new CheckinRatingService(getCheckinById).addRatings('missing', 'user-1', {
        venueRating: 4,
      })
    ).rejects.toThrow('Check-in not found');
    expect(getCheckinById).not.toHaveBeenCalled();
  });

  it('rejects ratings from a user who does not own the check-in', async () => {
    mockQuery.mockResolvedValue({ rows: [{ user_id: 'user-2', event_id: 'event-1' }] });

    await expect(
      new CheckinRatingService(getCheckinById).addRatings('checkin-1', 'user-1', {
        venueRating: 4,
      })
    ).rejects.toThrow('Unauthorized to rate this check-in');
  });

  it.each([
    [0, 'Rating must be between 0.5 and 5.0'],
    [5.5, 'Rating must be between 0.5 and 5.0'],
    [4.25, 'Rating must be in 0.5 increments'],
  ])('rejects invalid venue rating %s', async (rating, message) => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ user_id: 'user-1', event_id: 'event-1' }],
    });

    await expect(
      new CheckinRatingService(getCheckinById).addRatings('checkin-1', 'user-1', {
        venueRating: rating,
      })
    ).rejects.toThrow(message);
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it('validates every band rating before performing a lineup query', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ user_id: 'user-1', event_id: 'event-1' }],
    });

    await expect(
      new CheckinRatingService(getCheckinById).addRatings('checkin-1', 'user-1', {
        bandRatings: [
          { bandId: 'band-1', rating: 4 },
          { bandId: 'band-2', rating: 4.25 },
        ],
      })
    ).rejects.toThrow('Rating must be in 0.5 increments');
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it('rejects a band that is not in the event lineup', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ user_id: 'user-1', event_id: 'event-1' }] })
      .mockResolvedValueOnce({ rows: [{ band_id: 'band-1' }] });

    await expect(
      new CheckinRatingService(getCheckinById).addRatings('checkin-1', 'user-1', {
        bandRatings: [
          { bandId: 'band-1', rating: 4 },
          { bandId: 'band-2', rating: 3.5 },
        ],
      })
    ).rejects.toThrow('Band band-2 is not in the event lineup');
  });

  it('batch-upserts band ratings, maintains the legacy average, and invalidates aggregates', async () => {
    const refreshed = { id: 'checkin-1', userId: 'user-1', rating: 4.25, venueRating: 4.5 };
    getCheckinById.mockResolvedValue(refreshed);
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ user_id: 'user-1', event_id: 'event-1' }],
      })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ band_id: 'band-1' }, { band_id: 'band-2' }] })
      .mockResolvedValueOnce({ rows: [], rowCount: 2 })
      .mockResolvedValueOnce({ rows: [{ avg_rating: '4.25' }] })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ venue_id: 'venue-1' }] });

    const result = await new CheckinRatingService(getCheckinById).addRatings(
      'checkin-1',
      'user-1',
      {
        venueRating: 4.5,
        bandRatings: [
          { bandId: 'band-1', rating: 4 },
          { bandId: 'band-2', rating: 4.5 },
        ],
      }
    );

    expect(result).toBe(refreshed);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('VALUES ($1, $2, $3), ($1, $4, $5)'),
      ['checkin-1', 'band-1', 4, 'band-2', 4.5]
    );
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('UPDATE checkins SET rating'), [
      4.25,
      'checkin-1',
    ]);
    expect(cache.del).toHaveBeenCalledWith(CacheKeys.bandAggregate('band-1'));
    expect(cache.del).toHaveBeenCalledWith(CacheKeys.bandAggregate('band-2'));
    expect(cache.del).toHaveBeenCalledWith(CacheKeys.venueAggregate('venue-1'));
    expect(getCheckinById).toHaveBeenCalledWith('checkin-1', 'user-1');
  });

  it('supports band ratings for a legacy check-in without an event ID', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ user_id: 'user-1', event_id: null }] })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ avg_rating: null }] })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 });

    await new CheckinRatingService(getCheckinById).addRatings('checkin-1', 'user-1', {
      bandRatings: [{ bandId: 'band-1', rating: 3 }],
    });

    expect(
      mockQuery.mock.calls.some(([sql]) => sql.includes('SELECT band_id FROM event_lineup'))
    ).toBe(false);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('UPDATE checkins SET rating'), [
      0,
      'checkin-1',
    ]);
  });

  it('returns a refreshed check-in when no rating fields were supplied', async () => {
    mockQuery.mockResolvedValue({ rows: [{ user_id: 'user-1', event_id: 'event-1' }] });
    await new CheckinRatingService(getCheckinById).addRatings('checkin-1', 'user-1', {});
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(getCheckinById).toHaveBeenCalledWith('checkin-1', 'user-1');
  });
});

describe('UserStatsService profile aggregation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockReset();
  });

  it('normalizes database count strings into profile statistics', async () => {
    mockQuery.mockResolvedValue({
      rows: [
        {
          checkin_count: '12',
          badge_count: '3',
          follower_count: '8',
          following_count: '5',
          unique_venues: '4',
          unique_bands: '7',
        },
      ],
    });

    await expect(new UserStatsService().getUserStats('user-1')).resolves.toEqual({
      totalCheckins: 12,
      badgesEarned: 3,
      followersCount: 8,
      followingCount: 5,
      uniqueVenues: 4,
      uniqueBands: 7,
    });
  });

  it('returns zero statistics when aggregation returns no row', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await expect(new UserStatsService().getUserStats('user-1')).resolves.toEqual({
      totalCheckins: 0,
      badgesEarned: 0,
      followersCount: 0,
      followingCount: 0,
      uniqueVenues: 0,
      uniqueBands: 0,
    });
  });

  it('wraps database failures in the stable profile error contract', async () => {
    const cause = new Error('database unavailable');
    mockQuery.mockRejectedValue(cause);

    await expect(new UserStatsService().getUserStats('user-1')).rejects.toMatchObject({
      message: 'Failed to retrieve user statistics',
      cause,
    });
  });

  it.each([
    ['getCheckinCounts', 'user_id'],
    ['getBadgeCounts', 'user_id'],
    ['getFollowerCounts', 'following_id'],
    ['getFollowingCounts', 'follower_id'],
    ['getUniqueVenueCounts', 'user_id'],
    ['getUniqueBandCounts', 'user_id'],
  ])('%s maps returned counts and fills missing users with zero', async (method, idField) => {
    mockQuery.mockResolvedValue({ rows: [{ [idField]: 'user-1', count: '4' }] });
    const service = new UserStatsService();

    const result = await (service[method as keyof UserStatsService] as any).call(service, [
      'user-1',
      'user-2',
    ]);

    expect(Array.from(result.entries())).toEqual([
      ['user-1', 4],
      ['user-2', 0],
    ]);
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [['user-1', 'user-2']]);
  });

  it.each([
    'getCheckinCounts',
    'getBadgeCounts',
    'getFollowerCounts',
    'getFollowingCounts',
    'getUniqueVenueCounts',
    'getUniqueBandCounts',
    'getStatsForUsers',
  ])('%s avoids a database round trip for an empty batch', async (method) => {
    const service = new UserStatsService();
    const result = await (service[method as keyof UserStatsService] as any).call(service, []);
    expect(result).toEqual(new Map());
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('maps combined batch statistics for multiple profile cards', async () => {
    mockQuery.mockResolvedValue({
      rows: [
        {
          id: 'user-1',
          checkin_count: '5',
          badge_count: '2',
          follower_count: '4',
          following_count: '3',
          unique_venues: '2',
          unique_bands: '4',
        },
        {
          id: 'user-2',
          checkin_count: 0,
          badge_count: 0,
          follower_count: 0,
          following_count: 0,
          unique_venues: 0,
          unique_bands: 0,
        },
      ],
    });

    const result = await new UserStatsService().getStatsForUsers(['user-1', 'user-2']);

    expect(result.get('user-1')).toEqual({
      totalCheckins: 5,
      badgesEarned: 2,
      followersCount: 4,
      followingCount: 3,
      uniqueVenues: 2,
      uniqueBands: 4,
    });
    expect(result.get('user-2')).toEqual({
      totalCheckins: 0,
      badgesEarned: 0,
      followersCount: 0,
      followingCount: 0,
      uniqueVenues: 0,
      uniqueBands: 0,
    });
  });
});

describe('WishlistService concurrency and profile mapping', () => {
  const row = {
    id: 'wishlist-1',
    user_id: 'user-1',
    band_id: 'band-1',
    notify_when_nearby: true,
    created_at: '2026-07-27T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockReset();
  });

  it('returns an existing item without revalidating or reinserting the band', async () => {
    mockQuery.mockResolvedValue({ rows: [row] });
    await expect(new WishlistService().addToWishlist('user-1', 'band-1')).resolves.toEqual({
      success: true,
      isWishlisted: true,
      wishlistItem: {
        id: 'wishlist-1',
        userId: 'user-1',
        bandId: 'band-1',
        notifyWhenNearby: true,
        createdAt: '2026-07-27T00:00:00Z',
      },
    });
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it('rejects an inactive or unknown band', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [] });
    await expect(new WishlistService().addToWishlist('user-1', 'missing')).rejects.toThrow(
      'Band not found'
    );
  });

  it('creates a wishlist item with the requested notification preference', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 'band-1' }] })
      .mockResolvedValueOnce({ rows: [{ ...row, notify_when_nearby: false }] });

    const result = await new WishlistService().addToWishlist('user-1', 'band-1', false);

    expect(result.wishlistItem?.notifyWhenNearby).toBe(false);
    expect(mockQuery).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('ON CONFLICT (user_id, band_id) DO NOTHING'),
      ['user-1', 'band-1', false]
    );
  });

  it('recovers the winning row after a concurrent duplicate insert', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 'band-1' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [row] });

    const result = await new WishlistService().addToWishlist('user-1', 'band-1');

    expect(result.wishlistItem?.id).toBe('wishlist-1');
    expect(mockQuery).toHaveBeenCalledTimes(4);
  });

  it('returns success after removal by wishlist ID or band ID', async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: 'wishlist-1' }], rowCount: 1 });
    const service = new WishlistService();

    await expect(service.removeFromWishlistById('user-1', 'wishlist-1')).resolves.toEqual({
      success: true,
      isWishlisted: false,
    });
    await expect(service.removeFromWishlistByBandId('user-1', 'band-1')).resolves.toEqual({
      success: true,
      isWishlisted: false,
    });
  });

  it('returns null when a band is not wishlisted', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await expect(new WishlistService().isWishlisted('user-1', 'band-1')).resolves.toBeNull();
  });

  it('maps paginated wishlist rows with complete band details', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ total: '1' }] }).mockResolvedValueOnce({
      rows: [
        {
          ...row,
          b_id: 'band-1',
          b_name: 'The Band',
          b_description: null,
          b_genre: 'Rock',
          b_formed_year: 2020,
          b_website_url: null,
          b_spotify_url: 'https://spotify.example/band',
          b_instagram_url: null,
          b_facebook_url: null,
          b_image_url: null,
          b_hometown: 'Austin',
          b_average_rating: '4.5',
          b_total_checkins: '12',
          b_is_active: true,
          b_created_at: '2020-01-01T00:00:00Z',
          b_updated_at: '2026-01-01T00:00:00Z',
        },
      ],
    });

    const result = await new WishlistService().getWishlist('user-1', { page: 2, limit: 5 });

    expect(result).toEqual({
      items: [
        expect.objectContaining({
          id: 'wishlist-1',
          band: expect.objectContaining({
            id: 'band-1',
            name: 'The Band',
            genre: 'Rock',
            averageRating: 4.5,
            totalCheckins: 12,
            isActive: true,
          }),
        }),
      ],
      total: 1,
      page: 2,
      limit: 5,
    });
    expect(mockQuery).toHaveBeenNthCalledWith(2, expect.any(String), ['user-1', 5, 5]);
  });

  it.each([
    [[], null],
    [[row], 'wishlist-1'],
  ])('maps notification preference update rows %#', async (rows, expectedId) => {
    mockQuery.mockResolvedValue({ rows });
    const result = await new WishlistService().updateNotificationPreference(
      'user-1',
      'band-1',
      false
    );
    expect(result?.id ?? null).toBe(expectedId);
  });

  it('returns the active wishlist count', async () => {
    mockQuery.mockResolvedValue({ rows: [{ total: '3' }] });
    await expect(new WishlistService().getWishlistCount('user-1')).resolves.toBe(3);
  });
});
