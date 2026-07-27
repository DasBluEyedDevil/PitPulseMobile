import axios from 'axios';
import Database from '../../config/database';
import { SetlistFmService } from '../../services/SetlistFmService';
import { getCache, setCache } from '../../utils/cache';

jest.mock('axios');
jest.mock('../../config/database');
jest.mock('../../utils/cache', () => ({
  getCache: jest.fn(),
  setCache: jest.fn(),
}));
jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

const axiosMock = axios as jest.Mocked<typeof axios>;
const getCacheMock = getCache as jest.MockedFunction<typeof getCache>;
const setCacheMock = setCache as jest.MockedFunction<typeof setCache>;
const db = { query: jest.fn() };
const get = jest.fn();

(Database.getInstance as jest.Mock).mockReturnValue(db);

const venue = {
  id: 'venue-sl-1',
  name: 'Test Hall',
  city: {
    id: 'city-1',
    name: 'Boston',
    stateCode: 'MA',
    coords: { lat: 42.36, long: -71.06 },
    country: { code: 'US', name: 'United States' },
  },
};

const artist = {
  mbid: 'artist-mbid-1',
  name: 'The Tests',
  sortName: 'Tests, The',
};

const setlist = {
  id: 'setlist-1',
  versionId: 'version-1',
  eventDate: '26-07-2026',
  artist,
  venue,
};

describe('SetlistFmService provider contracts', () => {
  const originalApiKey = process.env.SETLISTFM_API_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    get.mockReset();
    db.query.mockReset();
    getCacheMock.mockResolvedValue(null);
    setCacheMock.mockResolvedValue(undefined);
    axiosMock.create.mockReturnValue({ get } as any);
    process.env.SETLISTFM_API_KEY = 'setlist-test-key';
  });

  afterAll(() => {
    if (originalApiKey === undefined) {
      delete process.env.SETLISTFM_API_KEY;
    } else {
      process.env.SETLISTFM_API_KEY = originalApiKey;
    }
  });

  it('degrades searches and rejects detail/import operations when disabled', async () => {
    delete process.env.SETLISTFM_API_KEY;
    const service = new SetlistFmService();

    await expect(service.searchVenues('Hall')).resolves.toEqual([]);
    await expect(service.searchArtists('Tests')).resolves.toEqual([]);
    await expect(service.searchSetlists({ artistName: 'Tests' })).resolves.toEqual([]);
    await expect(service.getSetlistById('setlist-1')).rejects.toThrow(
      'setlist.fm integration is disabled'
    );
    await expect(service.importVenue('venue-1')).rejects.toThrow(
      'setlist.fm integration is disabled'
    );
    expect(get).not.toHaveBeenCalled();
  });

  it('configures authenticated provider headers', () => {
    new SetlistFmService();

    expect(axiosMock.create).toHaveBeenCalledWith({
      baseURL: 'https://api.setlist.fm/rest/1.0',
      headers: {
        'x-api-key': 'setlist-test-key',
        Accept: 'application/json',
        'Accept-Language': 'en',
      },
    });
  });

  it('returns normalized venue cache hits without calling the provider', async () => {
    getCacheMock.mockResolvedValueOnce([venue] as any);
    const service = new SetlistFmService();

    await expect(service.searchVenues('  Test   Hall ', 'Boston', 'US', 2)).resolves.toEqual([
      venue,
    ]);

    expect(getCacheMock).toHaveBeenCalledWith('sl:venues:test hall:boston:us:2');
    expect(get).not.toHaveBeenCalled();
  });

  it('maps optional venue parameters and caches provider results', async () => {
    get.mockResolvedValue({ data: { venue: [venue] } });
    const service = new SetlistFmService();

    await expect(service.searchVenues('Test Hall', 'Boston', 'US', 3)).resolves.toEqual([venue]);

    expect(get).toHaveBeenCalledWith('/search/venues', {
      params: {
        p: 3,
        name: 'Test Hall',
        cityName: 'Boston',
        country: 'US',
      },
    });
    expect(setCacheMock).toHaveBeenCalledWith('sl:venues:test hall:boston:us:3', [venue], 21600);
  });

  it('keeps provider success observable when venue cache operations fail', async () => {
    getCacheMock.mockRejectedValueOnce(new Error('cache read failed'));
    get.mockResolvedValue({ data: {} });
    setCacheMock.mockRejectedValueOnce(new Error('cache write failed'));
    const service = new SetlistFmService();

    await expect(service.searchVenues(undefined, undefined, undefined)).resolves.toEqual([]);
  });

  it('maps artist and setlist search parameters and empty responses', async () => {
    get
      .mockResolvedValueOnce({ data: { artist: [artist] } })
      .mockResolvedValueOnce({ data: {} })
      .mockResolvedValueOnce({ data: { setlist: [setlist] } });
    const service = new SetlistFmService();

    await expect(service.searchArtists('The Tests', 2)).resolves.toEqual([artist]);
    await expect(service.searchArtists('Nobody')).resolves.toEqual([]);
    await expect(
      service.searchSetlists({
        artistName: 'The Tests',
        artistMbid: 'artist-mbid-1',
        venueId: 'venue-sl-1',
        cityName: 'Boston',
        date: '26-07-2026',
        year: 2026,
        page: 4,
      })
    ).resolves.toEqual([setlist]);

    expect(get).toHaveBeenNthCalledWith(1, '/search/artists', {
      params: { artistName: 'The Tests', p: 2 },
    });
    expect(get).toHaveBeenNthCalledWith(3, '/search/setlists', {
      params: {
        p: 4,
        artistName: 'The Tests',
        artistMbid: 'artist-mbid-1',
        venueId: 'venue-sl-1',
        cityName: 'Boston',
        date: '26-07-2026',
        year: 2026,
      },
    });
  });

  it('caches a setlist fetched by id and wraps provider failure', async () => {
    get
      .mockResolvedValueOnce({ data: setlist })
      .mockRejectedValueOnce(new Error('provider timeout'));
    const service = new SetlistFmService();

    await expect(service.getSetlistById('setlist-1')).resolves.toEqual(setlist);
    expect(get).toHaveBeenNthCalledWith(1, '/setlist/setlist-1');
    expect(setCacheMock).toHaveBeenCalledWith('sl:setlist:setlist-1', setlist, 21600);
    await expect(service.getSetlistById('setlist-2')).rejects.toThrow(
      'Failed to get setlist from setlist.fm'
    );
  });

  it.each([
    ['searchVenues', () => new SetlistFmService().searchVenues('Hall'), 'Failed to search venues'],
    [
      'searchArtists',
      () => new SetlistFmService().searchArtists('Tests'),
      'Failed to search artists',
    ],
    [
      'searchSetlists',
      () => new SetlistFmService().searchSetlists({ artistName: 'Tests' }),
      'Failed to search setlists',
    ],
  ])('wraps %s provider errors with a stable domain error', async (_name, invoke, message) => {
    get.mockRejectedValueOnce(new Error('provider failed'));

    await expect(invoke()).rejects.toThrow(message);
  });

  it('returns an existing imported venue with mapped domain fields', async () => {
    db.query.mockResolvedValueOnce({
      rows: [
        {
          id: 'venue-1',
          name: 'Existing Hall',
          latitude: '42.3601',
          longitude: '-71.0589',
          average_rating: '4.5',
          total_checkins: '12',
          setlistfm_venue_id: 'venue-sl-1',
          is_active: true,
        },
      ],
    });
    const service = new SetlistFmService();

    await expect(service.importVenue('venue-sl-1')).resolves.toEqual(
      expect.objectContaining({
        id: 'venue-1',
        name: 'Existing Hall',
        latitude: 42.3601,
        longitude: -71.0589,
        averageRating: 4.5,
        totalCheckins: 12,
        alreadyExists: true,
      })
    );
  });

  it('imports the first venue from a venue setlist lookup', async () => {
    db.query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({
      rows: [
        {
          id: 'venue-2',
          name: 'Test Hall',
          city: 'Boston',
          state: 'MA',
          country: 'United States',
          latitude: '42.36',
          longitude: '-71.06',
          venue_type: 'club',
          setlistfm_venue_id: 'venue-sl-1',
          source: 'setlistfm',
        },
      ],
    });
    const service = new SetlistFmService();
    jest.spyOn(service, 'searchSetlists').mockResolvedValue([setlist] as any);

    await expect(service.importVenue('venue-sl-1')).resolves.toEqual(
      expect.objectContaining({
        id: 'venue-2',
        setlistfmVenueId: 'venue-sl-1',
        alreadyExists: false,
      })
    );
    expect(db.query).toHaveBeenLastCalledWith(expect.stringContaining('INSERT INTO venues'), [
      'Test Hall',
      null,
      'Boston',
      'MA',
      'United States',
      null,
      42.36,
      -71.06,
      'club',
      'venue-sl-1',
      'setlistfm',
    ]);
  });

  it('rejects an import when no provider setlist contains the venue', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });
    const service = new SetlistFmService();
    jest.spyOn(service, 'searchSetlists').mockResolvedValue([]);

    await expect(service.importVenue('missing')).rejects.toThrow('Venue not found on setlist.fm');
  });
});
