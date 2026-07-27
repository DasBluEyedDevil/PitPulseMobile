import { cache, getCache, setCache, CacheTTL } from '../../utils/cache';
import { DiscoveryService } from '../../services/DiscoveryService';
import { SearchService } from '../../services/SearchService';
import { UserDiscoveryService } from '../../services/UserDiscoveryService';

const mockQuery = jest.fn();
const mockBlockFilter = jest.fn();
const mockEventService = {
  mapDbEventsWithHeadliner: jest.fn(),
  getTrendingNearby: jest.fn(),
  getTrendingEvents: jest.fn(),
};

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
  CacheKeys: {
    bandAggregate: (id: string) => `band:${id}:aggregate`,
    venueAggregate: (id: string) => `venue:${id}:aggregate`,
    recommendations: (id: string) => `user:${id}:recommendations`,
  },
  getCache: jest.fn(),
  setCache: jest.fn(),
  CacheTTL: {
    MEDIUM: 300,
  },
}));
jest.mock('../../services/EventService', () => ({
  EventService: jest.fn().mockImplementation(() => mockEventService),
}));
jest.mock('../../services/BlockService', () => ({
  BlockService: jest.fn().mockImplementation(() => ({
    getBlockFilterSQL: mockBlockFilter,
  })),
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

describe('DiscoveryService aggregate and recommendation behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockReset();
    mockEventService.mapDbEventsWithHeadliner.mockReset();
    mockEventService.getTrendingNearby.mockReset();
    mockEventService.getTrendingEvents.mockReset();
    (cache.getOrSet as jest.Mock).mockImplementation(
      async (_key: string, factory: () => Promise<unknown>) => factory()
    );
  });

  it('computes and caches band and venue aggregates from check-in ratings', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ avg_rating: '4.25', total_ratings: 8, unique_fans: 5 }],
      })
      .mockResolvedValueOnce({
        rows: [{ avg_rating: '3.75', total_ratings: 6, unique_visitors: 4 }],
      });
    const service = new DiscoveryService();

    await expect(service.getBandAggregateRating('band-1')).resolves.toEqual({
      avgPerformanceRating: 4.25,
      totalRatings: 8,
      uniqueFans: 5,
    });
    await expect(service.getVenueAggregateRating('venue-1')).resolves.toEqual({
      avgExperienceRating: 3.75,
      totalRatings: 6,
      uniqueVisitors: 4,
    });
    expect(cache.getOrSet).toHaveBeenNthCalledWith(
      1,
      'band:band-1:aggregate',
      expect.any(Function),
      600
    );
    expect(cache.getOrSet).toHaveBeenNthCalledWith(
      2,
      'venue:venue-1:aggregate',
      expect.any(Function),
      600
    );
  });

  it('returns stable zero aggregates when rating queries fail', async () => {
    mockQuery.mockRejectedValue(new Error('database unavailable'));
    const service = new DiscoveryService();

    await expect(service.getBandAggregateRating('band-1')).resolves.toEqual({
      avgPerformanceRating: 0,
      totalRatings: 0,
      uniqueFans: 0,
    });
    await expect(service.getVenueAggregateRating('venue-1')).resolves.toEqual({
      avgExperienceRating: 0,
      totalRatings: 0,
      uniqueVisitors: 0,
    });
  });

  it('hydrates personalized recommendations with location-aware scoring parameters', async () => {
    const row = { id: 'event-1', total_score: '12', distance_km: '3.2' };
    const events = [{ id: 'event-1', eventName: 'Show' }];
    mockQuery.mockResolvedValue({ rows: [row] });
    mockEventService.mapDbEventsWithHeadliner.mockResolvedValue(events);

    const result = await new DiscoveryService().getRecommendedEvents('user-1', 30.2, -97.7, 25, 10);

    expect(result).toBe(events);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('AS distance_km'), [
      'user-1',
      10,
      30.2,
      -97.7,
      25,
    ]);
    expect(mockEventService.mapDbEventsWithHeadliner).toHaveBeenCalledWith([row]);
  });

  it('falls back to location-aware trending for a personalized cold start', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const trending = [{ id: 'event-nearby' }];
    mockEventService.getTrendingNearby.mockResolvedValue(trending);

    await expect(
      new DiscoveryService().getRecommendedEvents('user-1', 30.2, -97.7, undefined, 12)
    ).resolves.toBe(trending);
    expect(mockEventService.getTrendingNearby).toHaveBeenCalledWith(30.2, -97.7, 50, 7, 12);
  });

  it('falls back to global trending without location context', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    mockEventService.getTrendingEvents.mockResolvedValue([{ id: 'event-global' }]);

    await new DiscoveryService().getRecommendedEvents('user-1', undefined, undefined, undefined, 8);

    expect(mockEventService.getTrendingEvents).toHaveBeenCalledWith(8);
    expect(mockEventService.getTrendingNearby).not.toHaveBeenCalled();
  });

  it('contains recommendation query failures as an empty degraded result', async () => {
    mockQuery.mockRejectedValue(new Error('recommendation query failed'));
    await expect(new DiscoveryService().getRecommendedEvents('user-1')).resolves.toEqual([]);
  });
});

describe('SearchService unified result mapping', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockReset();
    mockEventService.mapDbEventsWithHeadliner.mockReset();
  });

  it('searches and maps the default band, venue, and event categories', async () => {
    const bandRow = {
      id: 'band-1',
      name: 'The Band',
      description: null,
      genre: 'Rock',
      formed_year: 2020,
      website_url: null,
      spotify_url: null,
      instagram_url: null,
      facebook_url: null,
      image_url: null,
      hometown: 'Austin',
      average_rating: '4.5',
      total_checkins: '12',
      is_active: true,
      created_at: '2020-01-01',
      updated_at: '2026-01-01',
    };
    const venueRow = {
      id: 'venue-1',
      name: 'The Hall',
      city: 'Austin',
      latitude: '30.2',
      longitude: '-97.7',
      average_rating: '4.0',
      total_checkins: '20',
      is_active: true,
    };
    const eventRows = [{ id: 'event-1', event_name: 'Show' }];
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM bands')) return { rows: [bandRow] };
      if (sql.includes('FROM venues')) return { rows: [venueRow] };
      if (sql.includes('matched_ids')) return { rows: eventRows };
      throw new Error(`Unexpected query: ${sql}`);
    });
    mockEventService.mapDbEventsWithHeadliner.mockResolvedValue([
      { id: 'event-1', eventName: 'Show' },
    ]);

    const result = await new SearchService().search('show', { limit: 999 });

    expect(result.bands[0]).toMatchObject({
      id: 'band-1',
      name: 'The Band',
      averageRating: 4.5,
      totalCheckins: 12,
    });
    expect(result.venues[0]).toMatchObject({
      id: 'venue-1',
      name: 'The Hall',
      latitude: 30.2,
      longitude: -97.7,
      averageRating: 4,
      totalCheckins: 20,
    });
    expect(result.events).toEqual([{ id: 'event-1', eventName: 'Show' }]);
    expect(result.users).toBeUndefined();
    expect(mockQuery.mock.calls.every(([, params]) => params[1] === 50)).toBe(true);
  });

  it('returns an empty event category without invoking lineup hydration', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    const result = await new SearchService().search('missing', { types: ['event'] });

    expect(result).toEqual({ bands: [], venues: [], events: [] });
    expect(mockEventService.mapDbEventsWithHeadliner).not.toHaveBeenCalled();
  });

  it('searches users only and maps display fallbacks and ranking terms', async () => {
    mockQuery.mockResolvedValue({
      rows: [
        {
          id: 'user-1',
          username: 'alice',
          first_name: 'Alice',
          last_name: 'A',
          profile_image_url: null,
          bio: null,
          total_checkins: 12,
          is_verified: true,
        },
        {
          id: 'user-2',
          username: 'bob',
          first_name: null,
          last_name: null,
          profile_image_url: null,
          bio: 'Listener',
          total_checkins: 0,
          is_verified: false,
        },
      ],
    });

    const result = await new SearchService().search('AL', { types: ['user'], limit: 5 });

    expect(result).toEqual({
      bands: [],
      venues: [],
      events: [],
      users: [
        {
          id: 'user-1',
          username: 'alice',
          displayName: 'Alice A',
          profileImageUrl: null,
          bio: null,
          totalCheckins: 12,
          isVerified: true,
        },
        {
          id: 'user-2',
          username: 'bob',
          displayName: 'bob',
          profileImageUrl: null,
          bio: 'Listener',
          totalCheckins: 0,
          isVerified: false,
        },
      ],
    });
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('FROM users u'), [
      '%al%',
      5,
      'al',
      'al%',
    ]);
  });
});

describe('UserDiscoveryService follow suggestions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockReset();
    (getCache as jest.Mock).mockReset().mockResolvedValue(null);
    (setCache as jest.Mock).mockReset().mockResolvedValue(undefined);
    mockBlockFilter.mockReturnValue(
      'AND NOT EXISTS (SELECT 1 FROM user_blocks WHERE blocked_id = u.id)'
    );
  });

  it('returns cached suggestions without querying PostgreSQL', async () => {
    const cached = [{ id: 'user-2', username: 'alice' }];
    (getCache as jest.Mock).mockResolvedValue(cached);

    await expect(new UserDiscoveryService().getSuggestions('user-1')).resolves.toBe(cached);
    expect(mockQuery).not.toHaveBeenCalled();
    expect(setCache).not.toHaveBeenCalled();
  });

  it('maps shared-taste reasons and caches the ordered suggestions', async () => {
    mockQuery.mockResolvedValue({
      rows: [
        {
          id: 'user-2',
          username: 'alice',
          first_name: 'Alice',
          last_name: 'A',
          profile_image_url: null,
          bio: 'Live music',
          total_checkins: '12',
          is_verified: true,
          shared_bands: '2',
          shared_venues: '1',
        },
        {
          id: 'user-3',
          username: 'bob',
          first_name: null,
          last_name: null,
          profile_image_url: null,
          bio: null,
          total_checkins: '3',
          is_verified: false,
          shared_bands: '0',
          shared_venues: '0',
        },
      ],
    });

    const result = await new UserDiscoveryService().getSuggestions('user-1', 5);

    expect(result).toEqual([
      {
        id: 'user-2',
        username: 'alice',
        displayName: 'Alice A',
        profileImageUrl: null,
        bio: 'Live music',
        totalCheckins: 12,
        isVerified: true,
        sharedBands: 2,
        sharedVenues: 1,
        reason: '2 bands in common, 1 venue in common',
      },
      {
        id: 'user-3',
        username: 'bob',
        displayName: 'bob',
        profileImageUrl: null,
        bio: null,
        totalCheckins: 3,
        isVerified: false,
        sharedBands: 0,
        sharedVenues: 0,
        reason: 'Active in the community',
      },
    ]);
    expect(mockBlockFilter).toHaveBeenCalledWith('user-1', 'u.id');
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('AND NOT EXISTS (SELECT 1 FROM user_blocks WHERE blocked_id = u.id)'),
      ['user-1', 5]
    );
    expect(setCache).toHaveBeenCalledWith('discover:suggestions:user-1', result, CacheTTL.MEDIUM);
  });

  it('propagates suggestion query failures so the HTTP boundary can report degradation', async () => {
    mockQuery.mockRejectedValue(new Error('suggestion query failed'));
    await expect(new UserDiscoveryService().getSuggestions('user-1')).rejects.toThrow(
      'suggestion query failed'
    );
    expect(setCache).not.toHaveBeenCalled();
  });
});
