import { cache } from '../../utils/cache';
import { WrappedService } from '../../services/WrappedService';

const mockQuery = jest.fn();
const mockBlockFilter = jest.fn();

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    getInstance: () => ({ query: mockQuery }),
  },
}));
jest.mock('../../utils/cache', () => ({
  cache: {
    getOrSet: jest.fn(),
  },
}));
jest.mock('../../services/BlockService', () => ({
  BlockService: jest.fn().mockImplementation(() => ({
    getBlockFilterSQL: mockBlockFilter,
  })),
}));

describe('WrappedService annual aggregation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockReset();
    mockBlockFilter.mockReturnValue('AND c2.user_id NOT IN (SELECT blocked_id FROM blocks)');
    (cache.getOrSet as jest.Mock).mockImplementation(
      async (_key: string, factory: () => Promise<unknown>) => factory()
    );
  });

  it('aggregates the free annual summary and caches it for one hour', async () => {
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('as total_shows')) {
        return { rows: [{ total_shows: 12, unique_bands: 8, unique_venues: 5 }] };
      }
      if (sql.includes('WITH genre_counts')) {
        return { rows: [{ genre: 'Rock', percentage: 60 }] };
      }
      if (sql.includes('as visits')) {
        return { rows: [{ id: 'venue-1', name: 'The Hall', visits: 4 }] };
      }
      if (sql.includes('as times_seen')) {
        return { rows: [{ id: 'band-1', name: 'The Band', times_seen: 5 }] };
      }
      throw new Error(`Unexpected query: ${sql}`);
    });

    await expect(new WrappedService().getWrappedStats('user-1', 2026)).resolves.toEqual({
      year: 2026,
      totalShows: 12,
      uniqueBands: 8,
      uniqueVenues: 5,
      topGenre: 'Rock',
      topGenrePercentage: 60,
      homeVenueName: 'The Hall',
      homeVenueId: 'venue-1',
      homeVenueVisits: 4,
      topArtistName: 'The Band',
      topArtistId: 'band-1',
      topArtistTimesSeen: 5,
      meetsThreshold: true,
    });
    expect(cache.getOrSet).toHaveBeenCalledWith('wrapped:user-1:2026', expect.any(Function), 3600);
  });

  it('uses stable empty-state values below the three-show threshold', async () => {
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('as total_shows')) return { rows: [{}] };
      return { rows: [] };
    });

    await expect(new WrappedService().getWrappedStats('user-1', 2026)).resolves.toEqual({
      year: 2026,
      totalShows: 0,
      uniqueBands: 0,
      uniqueVenues: 0,
      topGenre: null,
      topGenrePercentage: 0,
      homeVenueName: null,
      homeVenueId: null,
      homeVenueVisits: 0,
      topArtistName: null,
      topArtistId: null,
      topArtistTimesSeen: 0,
      meetsThreshold: false,
    });
  });

  it('builds premium detail stats with complete months and block-filtered friend overlap', async () => {
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('as total_shows')) {
        return { rows: [{ total_shows: 4, unique_bands: 3, unique_venues: 2 }] };
      }
      if (sql.includes('WITH genre_counts')) {
        return { rows: [{ genre: 'Jazz', percentage: 50 }] };
      }
      if (sql.includes('as visits')) {
        return { rows: [{ id: 'venue-1', name: 'The Hall', visits: 2 }] };
      }
      if (sql.includes('as times_seen')) {
        return { rows: [{ id: 'band-1', name: 'The Band', times_seen: 2 }] };
      }
      if (sql.includes('as show_count')) {
        return {
          rows: [
            { month: 1, show_count: 2 },
            { month: 12, show_count: 1 },
          ],
        };
      }
      if (sql.includes('GROUP BY month, b.genre')) {
        return {
          rows: [
            { month: 1, genre: 'Jazz', count: 2 },
            { month: 2, genre: 'Rock', count: 1 },
          ],
        };
      }
      if (sql.includes('as shared_shows')) {
        return {
          rows: [
            {
              friend_id: 'friend-1',
              friend_username: 'alice',
              friend_profile_image_url: null,
              shared_shows: 3,
            },
          ],
        };
      }
      if (sql.includes('FROM checkin_band_ratings')) {
        return {
          rows: [
            {
              band_name: 'The Band',
              band_id: 'band-1',
              venue_name: 'The Hall',
              event_date: '2026-07-27',
              rating: '4.5',
            },
          ],
        };
      }
      throw new Error(`Unexpected query: ${sql}`);
    });

    const result = await new WrappedService().getWrappedDetailStats('user-1', 2026);

    expect(result.monthlyBreakdown).toHaveLength(12);
    expect(result.monthlyBreakdown[0]).toEqual({ month: 1, showCount: 2 });
    expect(result.monthlyBreakdown[1]).toEqual({ month: 2, showCount: 0 });
    expect(result.monthlyBreakdown[11]).toEqual({ month: 12, showCount: 1 });
    expect(result.genreEvolution).toEqual([
      { month: 1, genre: 'Jazz', count: 2 },
      { month: 2, genre: 'Rock', count: 1 },
    ]);
    expect(result.friendOverlap).toEqual([
      {
        friendId: 'friend-1',
        friendUsername: 'alice',
        friendProfileImageUrl: null,
        sharedShows: 3,
      },
    ]);
    expect(result.topRatedSets).toEqual([
      {
        bandName: 'The Band',
        bandId: 'band-1',
        venueName: 'The Hall',
        eventDate: '2026-07-27',
        rating: 4.5,
      },
    ]);
    expect(mockBlockFilter).toHaveBeenCalledWith('user-1', 'c2.user_id');
    expect(
      mockQuery.mock.calls.some(([sql]) =>
        sql.includes('AND c2.user_id NOT IN (SELECT blocked_id FROM blocks)')
      )
    ).toBe(true);
    expect(cache.getOrSet).toHaveBeenCalledWith(
      'wrapped-detail:user-1:2026',
      expect.any(Function),
      3600
    );
  });
});
