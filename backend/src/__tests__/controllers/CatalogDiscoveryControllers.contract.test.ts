import express from 'express';
import request from 'supertest';
import { BandController } from '../../controllers/BandController';
import { VenueController } from '../../controllers/VenueController';
import { SearchController } from '../../controllers/SearchController';
import { DiscoveryController } from '../../controllers/DiscoveryController';
import { UserDiscoveryController } from '../../controllers/UserDiscoveryController';
import { ForbiddenError, NotFoundError } from '../../utils/errors';

jest.mock('../../services/BandService', () => ({ BandService: jest.fn() }));
jest.mock('../../services/VenueService', () => ({ VenueService: jest.fn() }));
jest.mock('../../services/MusicBrainzService', () => ({ MusicBrainzService: jest.fn() }));
jest.mock('../../services/SetlistFmService', () => ({ SetlistFmService: jest.fn() }));
jest.mock('../../services/DiscoveryService', () => ({ DiscoveryService: jest.fn() }));
jest.mock('../../services/EventService', () => ({ EventService: jest.fn() }));
jest.mock('../../services/SearchService', () => ({ SearchService: jest.fn() }));
jest.mock('../../services/UserDiscoveryService', () => ({ UserDiscoveryService: jest.fn() }));

type User = { id: string; isAdmin?: boolean };

function appFor(
  user: User | undefined,
  configure: (app: express.Express) => void
): express.Express {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).user = user;
    next();
  });
  configure(app);
  app.use(
    (
      error: Error & { statusCode?: number },
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      res.status(error.statusCode ?? 500).json({ error: error.message });
    }
  );
  return app;
}

describe('BandController catalog contract', () => {
  const band = { id: 'band-1', name: 'The Band', genre: 'Rock' };
  let bandService: Record<string, jest.Mock>;
  let musicBrainzService: Record<string, jest.Mock>;
  let discoveryService: Record<string, jest.Mock>;
  let eventService: Record<string, jest.Mock>;

  const createApp = (user?: User) => {
    const controller = new BandController();
    (controller as any).bandService = bandService;
    (controller as any).musicBrainzService = musicBrainzService;
    (controller as any).discoveryService = discoveryService;
    (controller as any).eventService = eventService;
    return appFor(user, (app) => {
      app.post('/bands', controller.createBand);
      app.get('/bands/popular', controller.getPopularBands);
      app.get('/bands/trending', controller.getTrendingBands);
      app.get('/bands/genres', controller.getGenres);
      app.get('/bands/genre/:genre', controller.getBandsByGenre);
      app.post('/bands/import', controller.importBand);
      app.get('/bands/:id', controller.getBandById);
      app.put('/bands/:id', controller.updateBand);
      app.delete('/bands/:id', controller.deleteBand);
      app.get('/bands', controller.getBands);
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    bandService = {
      createBand: jest.fn(),
      searchBands: jest.fn(),
      getBandById: jest.fn(),
      isClaimedOwner: jest.fn(),
      updateBand: jest.fn(),
      deleteBand: jest.fn(),
      getPopularBands: jest.fn(),
      getTrendingBands: jest.fn(),
      getBandsByGenre: jest.fn(),
      getGenres: jest.fn(),
    };
    musicBrainzService = { importBand: jest.fn() };
    discoveryService = { getBandAggregateRating: jest.fn() };
    eventService = { getEventsByBand: jest.fn() };
  });

  it('rejects a nameless band before persistence', async () => {
    const response = await request(createApp()).post('/bands').send({ genre: 'Rock' });
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Band name is required' });
    expect(bandService.createBand).not.toHaveBeenCalled();
  });

  it('creates a named band', async () => {
    bandService.createBand.mockResolvedValue(band);
    const response = await request(createApp()).post('/bands').send({ name: 'The Band' });
    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      success: true,
      data: band,
      message: 'Band created successfully',
    });
  });

  it('normalizes band search paging and forwards filters', async () => {
    const page = { items: [band], total: 1 };
    bandService.searchBands.mockResolvedValue(page);

    const response = await request(createApp()).get(
      '/bands?q=band&genre=rock&rating=4.5&page=0&limit=999&sort=name&order=asc'
    );

    expect(response.status).toBe(200);
    expect(bandService.searchBands).toHaveBeenCalledWith({
      q: 'band',
      genre: 'rock',
      rating: 4.5,
      page: 1,
      limit: 100,
      sort: 'name',
      order: 'asc',
    });
    expect(response.body).toEqual({ success: true, data: page });
  });

  it('returns 404 when the band does not exist', async () => {
    bandService.getBandById.mockResolvedValue(null);
    const response = await request(createApp()).get('/bands/missing');
    expect(response.status).toBe(404);
    expect(discoveryService.getBandAggregateRating).not.toHaveBeenCalled();
  });

  it('hydrates a band with rating and upcoming events', async () => {
    const aggregate = { averageRating: 4.5, totalRatings: 10 };
    const upcomingShows = [{ id: 'event-1' }];
    bandService.getBandById.mockResolvedValue(band);
    discoveryService.getBandAggregateRating.mockResolvedValue(aggregate);
    eventService.getEventsByBand.mockResolvedValue(upcomingShows);

    const response = await request(createApp()).get('/bands/band-1');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: { ...band, aggregate, upcomingShows },
    });
    expect(eventService.getEventsByBand).toHaveBeenCalledWith('band-1', {
      upcoming: true,
      limit: 5,
    });
  });

  it.each([
    ['put', 'update'],
    ['delete', 'delete'],
  ])('requires authentication to %s a band', async (verb) => {
    const response =
      verb === 'put'
        ? await request(createApp()).put('/bands/band-1').send({ name: 'Updated' })
        : await request(createApp()).delete('/bands/band-1');
    expect(response.status).toBe(401);
    expect(bandService.isClaimedOwner).not.toHaveBeenCalled();
  });

  it('forbids a non-owner from updating a band', async () => {
    bandService.updateBand.mockRejectedValue(
      new ForbiddenError('Only admins or claimed owners can update this band')
    );
    const response = await request(createApp({ id: 'user-1' }))
      .put('/bands/band-1')
      .send({ name: 'Updated' });
    expect(response.status).toBe(403);
    expect(bandService.updateBand).toHaveBeenCalledWith(
      'band-1',
      { name: 'Updated' },
      { id: 'user-1', isAdmin: false }
    );
  });

  it('returns not found when a band update targets an inactive band', async () => {
    bandService.updateBand.mockRejectedValue(new NotFoundError('Band not found or inactive'));
    const response = await request(createApp({ id: 'user-1' }))
      .put('/bands/band-1')
      .send({ name: 'Updated' });
    expect(response.status).toBe(404);
  });

  it('maps an ownership race during band update to forbidden', async () => {
    bandService.updateBand.mockRejectedValue(
      new ForbiddenError('Only admins or claimed owners can update this band')
    );
    const response = await request(createApp({ id: 'user-1' }))
      .put('/bands/band-1')
      .send({ name: 'Updated' });
    expect(response.status).toBe(403);
  });

  it('allows a claimed owner to update a band', async () => {
    bandService.isClaimedOwner.mockResolvedValue(true);
    bandService.updateBand.mockResolvedValue({ ...band, name: 'Updated' });
    const response = await request(createApp({ id: 'user-1' }))
      .put('/bands/band-1')
      .send({ name: 'Updated' });
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Band updated successfully');
    expect(bandService.updateBand).toHaveBeenCalledWith(
      'band-1',
      { name: 'Updated' },
      { id: 'user-1', isAdmin: false }
    );
  });

  it('allows an administrator to delete a band without ownership', async () => {
    bandService.deleteBand.mockResolvedValue(undefined);
    const response = await request(createApp({ id: 'admin-1', isAdmin: true })).delete(
      '/bands/band-1'
    );
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Band deleted successfully');
    expect(bandService.deleteBand).toHaveBeenCalledWith('band-1', {
      id: 'admin-1',
      isAdmin: true,
    });
  });

  it('returns not found when a band delete targets a missing entry', async () => {
    bandService.deleteBand.mockRejectedValue(new NotFoundError('Band not found or inactive'));
    const response = await request(createApp({ id: 'user-1' })).delete('/bands/missing');
    expect(response.status).toBe(404);
  });

  it('returns forbidden when a band delete is not owned', async () => {
    bandService.deleteBand.mockRejectedValue(
      new ForbiddenError('Only admins or claimed owners can delete this band')
    );
    const response = await request(createApp({ id: 'user-1' })).delete('/bands/band-1');
    expect(response.status).toBe(403);
  });

  it.each([
    ['/bands/popular?limit=0', 'getPopularBands', 1],
    ['/bands/trending?limit=999', 'getTrendingBands', 100],
    ['/bands/genre/rock?limit=bad', 'getBandsByGenre', 20],
  ])('bounds catalog query %s', async (path, method, expectedLimit) => {
    bandService[method].mockResolvedValue([band]);
    const response = await request(createApp()).get(path);
    expect(response.status).toBe(200);
    if (method === 'getBandsByGenre') {
      expect(bandService[method]).toHaveBeenCalledWith('rock', expectedLimit);
    } else {
      expect(bandService[method]).toHaveBeenCalledWith(expectedLimit);
    }
  });

  it('returns available genres', async () => {
    bandService.getGenres.mockResolvedValue(['Rock', 'Jazz']);
    const response = await request(createApp()).get('/bands/genres');
    expect(response.body).toEqual({ success: true, data: ['Rock', 'Jazz'] });
  });

  it('requires a MusicBrainz ID for imports', async () => {
    const response = await request(createApp()).post('/bands/import').send({});
    expect(response.status).toBe(400);
    expect(musicBrainzService.importBand).not.toHaveBeenCalled();
  });

  it.each([
    [false, 201, 'Band imported successfully'],
    [true, 200, 'Band already exists in database'],
  ])(
    'returns the appropriate status for an existing=%s import',
    async (alreadyExists, status, message) => {
      musicBrainzService.importBand.mockResolvedValue({ ...band, alreadyExists });
      const response = await request(createApp())
        .post('/bands/import')
        .send({ musicbrainz_id: 'mbid-1' });
      expect(response.status).toBe(status);
      expect(response.body.message).toBe(message);
    }
  );
});

describe('VenueController catalog contract', () => {
  const venue = { id: 'venue-1', name: 'The Hall', city: 'Austin' };
  let venueService: Record<string, jest.Mock>;
  let setlistFmService: Record<string, jest.Mock>;
  let discoveryService: Record<string, jest.Mock>;
  let eventService: Record<string, jest.Mock>;

  const createApp = (user?: User) => {
    const controller = new VenueController();
    (controller as any).venueService = venueService;
    (controller as any).setlistFmService = setlistFmService;
    (controller as any).discoveryService = discoveryService;
    (controller as any).eventService = eventService;
    return appFor(user, (app) => {
      app.post('/venues', controller.createVenue);
      app.get('/venues/popular', controller.getPopularVenues);
      app.get('/venues/near', controller.getVenuesNear);
      app.post('/venues/import', controller.importVenue);
      app.get('/venues/:id', controller.getVenueById);
      app.put('/venues/:id', controller.updateVenue);
      app.delete('/venues/:id', controller.deleteVenue);
      app.get('/venues', controller.getVenues);
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    venueService = {
      createVenue: jest.fn(),
      searchVenues: jest.fn(),
      getVenueById: jest.fn(),
      isClaimedOwner: jest.fn(),
      updateVenue: jest.fn(),
      deleteVenue: jest.fn(),
      getPopularVenues: jest.fn(),
      getVenuesNear: jest.fn(),
    };
    setlistFmService = { importVenue: jest.fn() };
    discoveryService = { getVenueAggregateRating: jest.fn() };
    eventService = { getEventsByVenue: jest.fn() };
  });

  it('rejects a nameless venue before persistence', async () => {
    const response = await request(createApp()).post('/venues').send({ city: 'Austin' });
    expect(response.status).toBe(400);
    expect(venueService.createVenue).not.toHaveBeenCalled();
  });

  it('creates a named venue', async () => {
    venueService.createVenue.mockResolvedValue(venue);
    const response = await request(createApp()).post('/venues').send({ name: 'The Hall' });
    expect(response.status).toBe(201);
    expect(response.body.message).toBe('Venue created successfully');
  });

  it('normalizes venue search paging and forwards filters', async () => {
    venueService.searchVenues.mockResolvedValue({ items: [venue] });
    const response = await request(createApp()).get(
      '/venues?q=hall&city=Austin&venueType=club&rating=4&page=0&limit=999&sort=name&order=desc'
    );
    expect(response.status).toBe(200);
    expect(venueService.searchVenues).toHaveBeenCalledWith({
      q: 'hall',
      city: 'Austin',
      venueType: 'club',
      rating: 4,
      page: 1,
      limit: 100,
      sort: 'name',
      order: 'desc',
    });
  });

  it('returns 404 when the venue does not exist', async () => {
    venueService.getVenueById.mockResolvedValue(null);
    const response = await request(createApp()).get('/venues/missing');
    expect(response.status).toBe(404);
    expect(discoveryService.getVenueAggregateRating).not.toHaveBeenCalled();
  });

  it('hydrates a venue with aggregate rating and upcoming events', async () => {
    venueService.getVenueById.mockResolvedValue(venue);
    discoveryService.getVenueAggregateRating.mockResolvedValue({ averageRating: 4.2 });
    eventService.getEventsByVenue.mockResolvedValue([{ id: 'event-1' }]);

    const response = await request(createApp()).get('/venues/venue-1');

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      ...venue,
      aggregate: { averageRating: 4.2 },
      upcomingEvents: [{ id: 'event-1' }],
    });
    expect(eventService.getEventsByVenue).toHaveBeenCalledWith('venue-1', {
      upcoming: true,
      limit: 5,
    });
  });

  it.each(['put', 'delete'])('requires authentication to %s a venue', async (verb) => {
    const response =
      verb === 'put'
        ? await request(createApp()).put('/venues/venue-1').send({ name: 'Updated' })
        : await request(createApp()).delete('/venues/venue-1');
    expect(response.status).toBe(401);
    expect(venueService.isClaimedOwner).not.toHaveBeenCalled();
  });

  it('forbids a non-owner from deleting a venue', async () => {
    venueService.deleteVenue.mockRejectedValue(
      new ForbiddenError('Only admins or claimed owners can delete this venue')
    );
    const response = await request(createApp({ id: 'user-1' })).delete('/venues/venue-1');
    expect(response.status).toBe(403);
    expect(venueService.deleteVenue).toHaveBeenCalledWith(
      'venue-1',
      { id: 'user-1', isAdmin: false }
    );
  });

  it('allows a claimed owner to update a venue', async () => {
    venueService.updateVenue.mockResolvedValue({ ...venue, name: 'Updated' });
    const response = await request(createApp({ id: 'user-1' }))
      .put('/venues/venue-1')
      .send({ name: 'Updated' });
    expect(response.status).toBe(200);
    expect(venueService.updateVenue).toHaveBeenCalledWith(
      'venue-1',
      { name: 'Updated' },
      { id: 'user-1', isAdmin: false }
    );
  });

  it('returns not found when a venue update targets an inactive venue', async () => {
    venueService.updateVenue.mockRejectedValue(new NotFoundError('Venue not found or inactive'));
    const response = await request(createApp({ id: 'user-1' }))
      .put('/venues/venue-1')
      .send({ name: 'Updated' });
    expect(response.status).toBe(404);
  });

  it('maps an ownership race during venue update to forbidden', async () => {
    venueService.updateVenue.mockRejectedValue(
      new ForbiddenError('Only admins or claimed owners can update this venue')
    );
    const response = await request(createApp({ id: 'user-1' }))
      .put('/venues/venue-1')
      .send({ name: 'Updated' });
    expect(response.status).toBe(403);
  });

  it('allows an administrator to delete a venue without ownership', async () => {
    const response = await request(createApp({ id: 'admin-1', isAdmin: true })).delete(
      '/venues/venue-1'
    );
    expect(response.status).toBe(200);
    expect(venueService.deleteVenue).toHaveBeenCalledWith('venue-1', {
      id: 'admin-1',
      isAdmin: true,
    });
  });

  it('returns not found when a venue delete targets a missing entry', async () => {
    venueService.deleteVenue.mockRejectedValue(new NotFoundError('Venue not found or inactive'));
    const response = await request(createApp({ id: 'user-1' })).delete('/venues/missing');
    expect(response.status).toBe(404);
  });

  it('bounds popular venue limits', async () => {
    venueService.getPopularVenues.mockResolvedValue([venue]);
    const response = await request(createApp()).get('/venues/popular?limit=999');
    expect(response.status).toBe(200);
    expect(venueService.getPopularVenues).toHaveBeenCalledWith(100);
  });

  it.each([
    ['/venues/near?lng=-97', 'Valid latitude and longitude are required'],
    ['/venues/near?lat=91&lng=-97', 'Invalid coordinates provided'],
  ])('rejects invalid near coordinates for %s', async (path, message) => {
    const response = await request(createApp()).get(path);
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: message });
    expect(venueService.getVenuesNear).not.toHaveBeenCalled();
  });

  it('bounds a valid nearby venue search', async () => {
    venueService.getVenuesNear.mockResolvedValue([venue]);
    const response = await request(createApp()).get(
      '/venues/near?lat=30.2&lng=-97.7&radius=999&limit=0'
    );
    expect(response.status).toBe(200);
    expect(venueService.getVenuesNear).toHaveBeenCalledWith(30.2, -97.7, 500, 1);
  });

  it('requires a setlist.fm venue ID for imports', async () => {
    const response = await request(createApp()).post('/venues/import').send({});
    expect(response.status).toBe(400);
    expect(setlistFmService.importVenue).not.toHaveBeenCalled();
  });

  it.each([
    [false, 201, 'Venue imported successfully'],
    [true, 200, 'Venue already exists in database'],
  ])(
    'returns the appropriate status for an existing=%s venue import',
    async (alreadyExists, status, message) => {
      setlistFmService.importVenue.mockResolvedValue({ ...venue, alreadyExists });
      const response = await request(createApp())
        .post('/venues/import')
        .send({ setlistfm_venue_id: 'sf-venue-1' });
      expect(response.status).toBe(status);
      expect(response.body.message).toBe(message);
    }
  );
});

describe('Search and discovery controller contracts', () => {
  let searchService: Record<string, jest.Mock>;
  let setlistFmService: Record<string, jest.Mock>;
  let musicBrainzService: Record<string, jest.Mock>;
  let userDiscoveryService: Record<string, jest.Mock>;

  beforeEach(() => {
    jest.clearAllMocks();
    searchService = { search: jest.fn() };
    setlistFmService = { searchVenues: jest.fn(), searchSetlists: jest.fn() };
    musicBrainzService = { searchArtists: jest.fn(), searchByGenre: jest.fn() };
    userDiscoveryService = { getSuggestions: jest.fn() };
  });

  const searchApp = () => {
    const controller = new SearchController();
    (controller as any).searchService = searchService;
    return appFor(undefined, (app) => app.get('/search', controller.search));
  };

  const discoveryApp = () => {
    const controller = new DiscoveryController();
    (controller as any).setlistFmService = setlistFmService;
    (controller as any).musicBrainzService = musicBrainzService;
    return appFor(undefined, (app) => {
      app.get('/discover/venues', controller.searchVenues);
      app.get('/discover/setlists', controller.searchSetlists);
      app.get('/discover/bands', controller.searchBands);
      app.get('/discover/bands/genre', controller.searchBandsByGenre);
    });
  };

  it('requires a non-empty unified search query', async () => {
    const response = await request(searchApp()).get('/search?q=%20');
    expect(response.status).toBe(400);
    expect(searchService.search).not.toHaveBeenCalled();
  });

  it('rejects a types filter without any recognized entity', async () => {
    const response = await request(searchApp()).get('/search?q=rock&types=album,song');
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Invalid types parameter');
  });

  it('trims search input, filters entity types, and caps limit', async () => {
    const results = { bands: [], venues: [], events: [], users: [] };
    searchService.search.mockResolvedValue(results);
    const response = await request(searchApp()).get(
      '/search?q=%20rock%20&types=band,invalid,user&limit=999'
    );
    expect(response.status).toBe(200);
    expect(searchService.search).toHaveBeenCalledWith('rock', {
      types: ['band', 'user'],
      limit: 50,
    });
    expect(response.body).toEqual({ success: true, data: results });
  });

  it('uses default search scope and limit for malformed options', async () => {
    searchService.search.mockResolvedValue({});
    await request(searchApp()).get('/search?q=rock&limit=bad').expect(200);
    expect(searchService.search).toHaveBeenCalledWith('rock', {
      types: undefined,
      limit: 10,
    });
  });

  it('requires a venue name or city for provider venue discovery', async () => {
    const response = await request(discoveryApp()).get('/discover/venues');
    expect(response.status).toBe(400);
    expect(setlistFmService.searchVenues).not.toHaveBeenCalled();
  });

  it('searches provider venues with explicit paging', async () => {
    setlistFmService.searchVenues.mockResolvedValue([{ id: 'venue-1' }]);
    const response = await request(discoveryApp()).get(
      '/discover/venues?name=hall&city=Austin&country=US&page=2'
    );
    expect(response.status).toBe(200);
    expect(setlistFmService.searchVenues).toHaveBeenCalledWith('hall', 'Austin', 'US', 2);
  });

  it('requires at least one setlist search constraint', async () => {
    const response = await request(discoveryApp()).get('/discover/setlists');
    expect(response.status).toBe(400);
    expect(setlistFmService.searchSetlists).not.toHaveBeenCalled();
  });

  it('forwards a bounded setlist search model to the provider', async () => {
    setlistFmService.searchSetlists.mockResolvedValue([]);
    const response = await request(discoveryApp()).get(
      '/discover/setlists?artist=Band&mbid=mbid-1&venue=venue-1&city=Austin&date=27-07-2026&year=2026&page=3'
    );
    expect(response.status).toBe(200);
    expect(setlistFmService.searchSetlists).toHaveBeenCalledWith({
      artistName: 'Band',
      artistMbid: 'mbid-1',
      venueId: 'venue-1',
      cityName: 'Austin',
      date: '27-07-2026',
      year: 2026,
      page: 3,
    });
  });

  it.each([
    ['/discover/bands', 'Search query is required'],
    ['/discover/bands/genre', 'Genre is required'],
  ])('requires provider band filters for %s', async (path, message) => {
    const response = await request(discoveryApp()).get(path);
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: message });
  });

  it('searches provider bands by query and genre', async () => {
    musicBrainzService.searchArtists.mockResolvedValue([{ id: 'band-1' }]);
    musicBrainzService.searchByGenre.mockResolvedValue([{ id: 'band-2' }]);
    const app = discoveryApp();

    await request(app).get('/discover/bands?q=Band&limit=5').expect(200);
    await request(app).get('/discover/bands/genre?genre=rock&limit=7').expect(200);

    expect(musicBrainzService.searchArtists).toHaveBeenCalledWith('Band', 5);
    expect(musicBrainzService.searchByGenre).toHaveBeenCalledWith('rock', 7);
  });

  const suggestionsApp = (user?: User) => {
    const controller = new UserDiscoveryController();
    (controller as any).userDiscoveryService = userDiscoveryService;
    return appFor(user, (app) => app.get('/suggestions', controller.getSuggestions));
  };

  it('requires authentication for follow suggestions', async () => {
    const response = await request(suggestionsApp()).get('/suggestions');
    expect(response.status).toBe(401);
    expect(userDiscoveryService.getSuggestions).not.toHaveBeenCalled();
  });

  it.each([
    ['bad', 10],
    ['0', 1],
    ['999', 50],
  ])('bounds suggestion limit %s to %d', async (raw, expected) => {
    userDiscoveryService.getSuggestions.mockResolvedValue([]);
    const response = await request(suggestionsApp({ id: 'user-1' })).get(
      `/suggestions?limit=${raw}`
    );
    expect(response.status).toBe(200);
    expect(userDiscoveryService.getSuggestions).toHaveBeenCalledWith('user-1', expected);
  });
});
