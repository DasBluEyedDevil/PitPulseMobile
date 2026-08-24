import express from 'express';
import request from 'supertest';
import { EventController } from '../../controllers/EventController';
import { TicketmasterAdapter } from '../../services/TicketmasterAdapter';
import { validate } from '../../middleware/validate';
import {
  createEventSchema,
  discoverQuerySchema,
  genreParamSchema,
  nearbyQuerySchema,
  searchQuerySchema,
} from '../../routes/eventRoutes';

jest.mock('../../services/TicketmasterAdapter', () => ({
  TicketmasterAdapter: jest.fn(),
}));
jest.mock('../../services/EventService', () => ({ EventService: jest.fn() }));
jest.mock('../../services/EventSyncService', () => ({ EventSyncService: jest.fn() }));
jest.mock('../../services/BandMatcher', () => ({ BandMatcher: jest.fn() }));
jest.mock('../../services/DiscoveryService', () => ({ DiscoveryService: jest.fn() }));

describe('EventController mobile contract', () => {
  const VENUE_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const BAND_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  const event = {
    id: 'event-1',
    venueId: 'venue-1',
    eventDate: '2026-08-01T20:00:00.000Z',
    eventName: 'Summer Show',
  };
  let eventService: Record<string, jest.Mock>;
  let eventSyncService: Record<string, jest.Mock>;
  let bandMatcher: Record<string, jest.Mock>;
  let discoveryService: Record<string, jest.Mock>;
  let ticketmasterAdapter: Record<string, jest.Mock>;

  const createApp = (user?: { id: string; isAdmin?: boolean }) => {
    const controller = new EventController();
    (controller as any).eventService = eventService;
    (controller as any).eventSyncService = eventSyncService;
    (controller as any).bandMatcher = bandMatcher;
    (controller as any).discoveryService = discoveryService;

    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      (req as any).user = user;
      next();
    });
    app.post('/events', validate(createEventSchema), controller.createEvent);
    app.get('/events/upcoming', controller.getUpcomingEvents);
    app.get('/events/trending', controller.getTrendingEvents);
    app.get('/events/lookup/:ticketmasterId', controller.lookupEvent);
    app.get('/events/nearby', validate(nearbyQuerySchema), controller.getNearbyEvents);
    app.get('/events/discover', validate(discoverQuerySchema), controller.getNearbyUpcoming);
    app.get('/events/genre/:genre', validate(genreParamSchema), controller.getByGenre);
    app.get('/events/search', validate(searchQuerySchema), controller.searchEvents);
    app.get('/events/recommended', controller.getRecommendedEvents);
    app.get('/events/:id', controller.getEventById);
    app.delete('/events/:id', controller.deleteEvent);
    app.get('/venues/:id/events', controller.getEventsByVenue);
    app.get('/bands/:id/events', controller.getEventsByBand);
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
  };

  beforeEach(() => {
    jest.clearAllMocks();
    eventService = {
      createEvent: jest.fn(),
      getEventById: jest.fn(),
      getEventsByVenue: jest.fn(),
      getEventsByBand: jest.fn(),
      getUpcomingEvents: jest.fn(),
      getTrendingEvents: jest.fn(),
      getTrendingNearby: jest.fn(),
      getNearbyEvents: jest.fn(),
      getNearbyUpcoming: jest.fn(),
      getByGenre: jest.fn(),
      searchEvents: jest.fn(),
      deleteEvent: jest.fn(),
    };
    eventSyncService = { ingestSingleEvent: jest.fn() };
    bandMatcher = { matchOrCreateBand: jest.fn() };
    discoveryService = { getRecommendedEvents: jest.fn() };
    ticketmasterAdapter = { getEventById: jest.fn() };
    (TicketmasterAdapter as jest.Mock).mockImplementation(() => ticketmasterAdapter);
    delete process.env.TICKETMASTER_API_KEY;
  });

  afterAll(() => {
    delete process.env.TICKETMASTER_API_KEY;
  });

  it.each([
    [{ bandId: BAND_ID, eventDate: '2026-08-01T20:00:00.000Z' }],
    [{ venueId: VENUE_ID, eventDate: 'not-a-date', bandId: BAND_ID }],
    [{ venueId: VENUE_ID, eventDate: '2026-08-01T20:00:00.000Z' }],
  ])('rejects an invalid event body before persistence', async (body) => {
    const response = await request(createApp({ id: 'user-1' }))
      .post('/events')
      .send(body);

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(eventService.createEvent).not.toHaveBeenCalled();
  });

  it('resolves named lineup entries and attributes a user-created event', async () => {
    bandMatcher.matchOrCreateBand.mockResolvedValue({ bandId: 'band-resolved' });
    eventService.createEvent.mockResolvedValue(event);

    const response = await request(createApp({ id: 'user-1' }))
      .post('/events')
      .send({
        venueId: VENUE_ID,
        eventDate: '2026-08-01T20:00:00.000Z',
        eventName: 'Summer Show',
        lineup: [
          { bandName: 'The New Band', setOrder: 2, isHeadliner: true },
          { bandId: BAND_ID, setOrder: 1 },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      success: true,
      data: event,
      message: 'Event created successfully',
    });
    expect(eventService.createEvent).toHaveBeenCalledWith({
      venueId: VENUE_ID,
      bandId: undefined,
      eventDate: new Date('2026-08-01T20:00:00.000Z'),
      eventName: 'Summer Show',
      description: undefined,
      doorsTime: undefined,
      startTime: undefined,
      ticketUrl: undefined,
      createdByUserId: 'user-1',
      lineup: [
        { bandId: 'band-resolved', setOrder: 2, isHeadliner: true },
        { bandId: BAND_ID, setOrder: 1, isHeadliner: undefined },
      ],
    });
  });

  it('rejects a lineup entry that cannot be resolved to a band', async () => {
    const response = await request(createApp())
      .post('/events')
      .send({
        venueId: VENUE_ID,
        eventDate: '2026-08-01T20:00:00.000Z',
        lineup: [{ setOrder: 1 }],
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(eventService.createEvent).not.toHaveBeenCalled();
  });

  it('returns an event by ID', async () => {
    eventService.getEventById.mockResolvedValue(event);

    const response = await request(createApp()).get('/events/event-1');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, data: event });
    expect(eventService.getEventById).toHaveBeenCalledWith('event-1');
  });

  it.each([
    ['/venues/venue-1/events?upcoming=true&limit=999', 'getEventsByVenue', 'venue-1', true, 200],
    ['/venues/venue-1/events?limit=bad', 'getEventsByVenue', 'venue-1', false, 50],
    ['/bands/band-1/events?upcoming=true&limit=0', 'getEventsByBand', 'band-1', true, 1],
  ])('normalizes collection query parameters for %s', async (path, method, id, upcoming, limit) => {
    eventService[method].mockResolvedValue([event]);

    const response = await request(createApp()).get(path);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, data: [event] });
    expect(eventService[method]).toHaveBeenCalledWith(id, { upcoming, limit });
  });

  it.each([
    ['bad', 50],
    ['0', 1],
    ['999', 200],
  ])('normalizes upcoming limit %s to %d', async (rawLimit, expected) => {
    eventService.getUpcomingEvents.mockResolvedValue([]);

    const response = await request(createApp()).get(`/events/upcoming?limit=${rawLimit}`);

    expect(response.status).toBe(200);
    expect(eventService.getUpcomingEvents).toHaveBeenCalledWith(expected);
  });

  it('returns location-aware trending events when valid coordinates are supplied', async () => {
    eventService.getTrendingNearby.mockResolvedValue([event]);

    const response = await request(createApp()).get(
      '/events/trending?lat=40.7&lon=-74&radius=1000&limit=150'
    );

    expect(response.status).toBe(200);
    expect(eventService.getTrendingNearby).toHaveBeenCalledWith(40.7, -74, 500, 7, 100);
    expect(response.body).toEqual({ success: true, data: [event] });
  });

  it('rejects out-of-range trending coordinates', async () => {
    const response = await request(createApp()).get('/events/trending?lat=91&lon=-74');

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('lat must be between -90 and 90');
    expect(eventService.getTrendingNearby).not.toHaveBeenCalled();
  });

  it('falls back to global trending when both usable coordinates are not present', async () => {
    eventService.getTrendingEvents.mockResolvedValue([event]);

    const response = await request(createApp()).get('/events/trending?lat=40.7&limit=bad');

    expect(response.status).toBe(200);
    expect(eventService.getTrendingEvents).toHaveBeenCalledWith(20);
    expect(eventService.getTrendingNearby).not.toHaveBeenCalled();
  });

  it('reports an unavailable Ticketmaster lookup without making an external request', async () => {
    const response = await request(createApp()).get('/events/lookup/tm-1');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Event lookup not available: Ticketmaster API key not configured',
      },
    });
    expect(TicketmasterAdapter).not.toHaveBeenCalled();
  });

  it('returns 404 when Ticketmaster has no matching event', async () => {
    process.env.TICKETMASTER_API_KEY = 'configured-for-test';
    ticketmasterAdapter.getEventById.mockResolvedValue(null);

    const response = await request(createApp()).get('/events/lookup/tm-missing');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Ticketmaster event not found' });
    expect(eventSyncService.ingestSingleEvent).not.toHaveBeenCalled();
  });

  it('ingests an on-demand Ticketmaster event and returns its canonical record', async () => {
    process.env.TICKETMASTER_API_KEY = 'configured-for-test';
    const externalEvent = { id: 'tm-1', name: 'External Show' };
    ticketmasterAdapter.getEventById.mockResolvedValue(externalEvent);
    eventSyncService.ingestSingleEvent.mockResolvedValue('event-1');
    eventService.getEventById.mockResolvedValue(event);

    const response = await request(createApp()).get('/events/lookup/tm-1');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, data: event });
    expect(eventSyncService.ingestSingleEvent).toHaveBeenCalledWith(externalEvent);
    expect(eventService.getEventById).toHaveBeenCalledWith('event-1');
  });

  it('rejects an external event that cannot be ingested without venue data', async () => {
    process.env.TICKETMASTER_API_KEY = 'configured-for-test';
    ticketmasterAdapter.getEventById.mockResolvedValue({ id: 'tm-1' });
    eventSyncService.ingestSingleEvent.mockResolvedValue(null);

    const response = await request(createApp()).get('/events/lookup/tm-1');

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('missing venue data');
  });

  it.each([
    ['/events/nearby', 'lat and lng query parameters are required and must be numeric'],
    ['/events/nearby?lat=40&lng=181', 'lat must be between -90 and 90'],
    ['/events/discover?lat=40', 'lat and lon query parameters are required and must be numeric'],
    ['/events/discover?lat=-91&lon=10', 'lat must be between -90 and 90'],
  ])('rejects invalid discovery coordinates for %s', async (path, message) => {
    const response = await request(createApp()).get(path);

    expect(response.status).toBe(400);
    if (path === '/events/nearby' || path === '/events/discover?lat=40') {
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    } else {
      expect(response.body.error).toContain(message);
    }
  });

  it('loads nearby events with bounded defaults', async () => {
    eventService.getNearbyEvents.mockResolvedValue([event]);

    const response = await request(createApp()).get(
      '/events/nearby?lat=40.7&lng=-74&radius=999&limit=0'
    );

    expect(response.status).toBe(200);
    expect(eventService.getNearbyEvents).toHaveBeenCalledWith(40.7, -74, 500, 1);
  });

  it('loads upcoming discoveries with bounded date and radius inputs', async () => {
    eventService.getNearbyUpcoming.mockResolvedValue([event]);

    const response = await request(createApp()).get(
      '/events/discover?lat=40.7&lon=-74&radius=0&days=999&limit=150'
    );

    expect(response.status).toBe(200);
    expect(eventService.getNearbyUpcoming).toHaveBeenCalledWith(40.7, -74, 0.1, 365, 100);
  });

  it('normalizes genre paging and returns matching events', async () => {
    eventService.getByGenre.mockResolvedValue([event]);

    const response = await request(createApp()).get('/events/genre/rock?limit=0&offset=-10');

    expect(response.status).toBe(200);
    expect(eventService.getByGenre).toHaveBeenCalledWith('rock', 1, 0);
    expect(response.body).toEqual({ success: true, data: [event] });
  });

  it('rejects an empty event search before querying persistence', async () => {
    const response = await request(createApp()).get('/events/search?q=%20%20');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(eventService.searchEvents).not.toHaveBeenCalled();
  });

  it('trims and bounds an event search query', async () => {
    eventService.searchEvents.mockResolvedValue([event]);

    const response = await request(createApp()).get('/events/search?q=%20show%20&limit=999');

    expect(response.status).toBe(200);
    expect(eventService.searchEvents).toHaveBeenCalledWith('show', 100);
  });

  it('requires authentication for recommendations', async () => {
    const response = await request(createApp()).get('/events/recommended');

    expect(response.status).toBe(401);
    expect(discoveryService.getRecommendedEvents).not.toHaveBeenCalled();
  });

  it('returns personalized recommendations with optional location context', async () => {
    discoveryService.getRecommendedEvents.mockResolvedValue([event]);

    const response = await request(createApp({ id: 'user-1' })).get(
      '/events/recommended?lat=40.7&lon=-74&radius=25&limit=10'
    );

    expect(response.status).toBe(200);
    expect(discoveryService.getRecommendedEvents).toHaveBeenCalledWith('user-1', 40.7, -74, 25, 10);
    expect(response.body).toEqual({ success: true, data: [event] });
  });

  it('requires authentication before deleting an event', async () => {
    const response = await request(createApp()).delete('/events/event-1');

    expect(response.status).toBe(401);
    expect(eventService.getEventById).not.toHaveBeenCalled();
  });

  it('hides lookup failures behind the event-not-found contract', async () => {
    eventService.getEventById.mockRejectedValue(new Error('database details'));

    const response = await request(createApp({ id: 'user-1' })).delete('/events/event-1');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Event not found' });
    expect(eventService.deleteEvent).not.toHaveBeenCalled();
  });

  it('forbids deletion by a user who neither owns nor administers the event', async () => {
    eventService.getEventById.mockResolvedValue({ ...event, createdByUserId: 'user-2' });

    const response = await request(createApp({ id: 'user-1' })).delete('/events/event-1');

    expect(response.status).toBe(403);
    expect(eventService.deleteEvent).not.toHaveBeenCalled();
  });

  it.each([
    [{ id: 'user-1' }, 'user-1', { id: 'user-1', isAdmin: false }],
    [{ id: 'admin-1', isAdmin: true }, 'user-2', { id: 'admin-1', isAdmin: true }],
  ])('allows event deletion by the creator or an administrator', async (user, creatorId, actor) => {
    eventService.getEventById.mockResolvedValue({ ...event, createdByUserId: creatorId });
    eventService.deleteEvent.mockResolvedValue({ deleted: true, cancelled: false });

    const response = await request(createApp(user)).delete('/events/event-1');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: { deleted: true, cancelled: false },
      message: 'Event deleted successfully',
    });
    expect(eventService.deleteEvent).toHaveBeenCalledWith('event-1', actor);
  });

  it('returns cancelled:true when attendee check-ins are preserved', async () => {
    eventService.getEventById.mockResolvedValue({ ...event, createdByUserId: 'user-1' });
    eventService.deleteEvent.mockResolvedValue({ deleted: false, cancelled: true });

    const response = await request(createApp({ id: 'user-1' })).delete('/events/event-1');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: { deleted: false, cancelled: true },
      message: 'Event cancelled',
    });
    expect(eventService.deleteEvent).toHaveBeenCalledWith('event-1', {
      id: 'user-1',
      isAdmin: false,
    });
  });
});
