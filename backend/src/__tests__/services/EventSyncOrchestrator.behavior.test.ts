import { EventSyncOrchestrator } from '../../services/eventsync/EventSyncOrchestrator';
import { NormalizedEvent } from '../../types/ticketmaster';

const mockQuery = jest.fn();

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    getInstance: () => ({ query: mockQuery }),
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

function makeEvent(overrides: Partial<NormalizedEvent> = {}): NormalizedEvent {
  return {
    externalId: 'tm-event-1',
    name: 'Tour Stop',
    date: '2026-08-01',
    startTime: '20:00:00',
    status: 'active',
    ticketUrl: 'https://tickets.example/event-1',
    priceMin: 25,
    priceMax: 80,
    venue: {
      externalId: 'tm-venue-1',
      name: 'The Hall',
      address: '1 Main St',
      city: 'Austin',
      state: 'TX',
      country: 'US',
      postalCode: '78701',
      lat: 30.2672,
      lon: -97.7431,
      timezone: 'America/Chicago',
    },
    attractions: [
      {
        externalId: 'tm-band-1',
        name: 'The Band',
        genre: 'Rock',
        imageUrl: 'https://images.example/band.jpg',
      },
    ],
    ...overrides,
  };
}

function createDependencies(configured = true) {
  const region = {
    id: 'region-1',
    label: 'Austin',
    latitude: 30.2672,
    longitude: -97.7431,
    radius_miles: 25,
  };
  const counters = {
    events_fetched: 0,
    events_created: 0,
    events_updated: 0,
    events_skipped: 0,
    bands_created: 0,
    bands_matched: 0,
    venues_created: 0,
  };
  const regionSync = {
    isConfigured: jest.fn().mockReturnValue(configured),
    fetchEventsForRegion: jest.fn(),
    ingestSingleEvent: jest.fn(),
  };
  const syncLog = {
    startSync: jest.fn().mockResolvedValue({
      id: 'sync-1',
      status: 'running',
      startedAt: new Date('2026-07-27T00:00:00Z'),
    }),
    getEmptyCounters: jest.fn().mockReturnValue(counters),
    loadSyncRegions: jest.fn().mockResolvedValue([region]),
    updateRegionLastSynced: jest.fn().mockResolvedValue(undefined),
    completeSync: jest.fn().mockResolvedValue(undefined),
  };
  const bandMatcher = {
    matchOrCreateVenue: jest.fn().mockResolvedValue({ venueId: 'venue-1', isNew: false }),
    matchOrCreateBand: jest.fn().mockResolvedValue({
      bandId: 'band-1',
      matchType: 'external_id',
    }),
  };
  const eventService = {
    findUserCreatedEventAtVenueDate: jest.fn().mockResolvedValue(null),
    mergeTicketmasterIntoUserEvent: jest.fn().mockResolvedValue(undefined),
  };
  const notificationService = {
    createNotification: jest.fn().mockResolvedValue({ id: 'notification-1' }),
  };
  const orchestrator = new EventSyncOrchestrator(
    regionSync as any,
    syncLog as any,
    bandMatcher as any,
    eventService as any,
    notificationService as any
  );

  return {
    orchestrator,
    region,
    counters,
    regionSync,
    syncLog,
    bandMatcher,
    eventService,
    notificationService,
  };
}

describe('EventSyncOrchestrator provider and idempotency behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockReset();
  });

  it('degrades to a successful no-op when the event provider is not configured', async () => {
    const { orchestrator, syncLog } = createDependencies(false);

    await expect(orchestrator.runSync()).resolves.toEqual({
      success: true,
      eventsCreated: 0,
      eventsUpdated: 0,
      eventsSkipped: 0,
      regionsProcessed: 0,
    });
    expect(syncLog.startSync).not.toHaveBeenCalled();
  });

  it('records an empty successful sync when no active regions are configured', async () => {
    const { orchestrator, syncLog, counters } = createDependencies();
    syncLog.loadSyncRegions.mockResolvedValue([]);

    const result = await orchestrator.runSync('region-missing');

    expect(result).toEqual({
      success: true,
      eventsCreated: 0,
      eventsUpdated: 0,
      eventsSkipped: 0,
      regionsProcessed: 0,
    });
    expect(syncLog.startSync).toHaveBeenCalledWith('region-missing');
    expect(syncLog.completeSync).toHaveBeenCalledWith('sync-1', counters, 'completed');
  });

  it('creates a normalized event, lineup, and accurate counters', async () => {
    const { orchestrator, region, regionSync, syncLog, bandMatcher } = createDependencies();
    const normalizedEvent = makeEvent({
      attractions: [
        makeEvent().attractions[0],
        {
          externalId: 'tm-band-2',
          name: 'Support',
          genre: null,
          imageUrl: null,
        },
      ],
    });
    regionSync.fetchEventsForRegion.mockResolvedValue({
      events: [normalizedEvent],
      eventsFetched: 1,
    });
    bandMatcher.matchOrCreateVenue.mockResolvedValue({ venueId: 'venue-1', isNew: true });
    bandMatcher.matchOrCreateBand
      .mockResolvedValueOnce({ bandId: 'band-1', matchType: 'created' })
      .mockResolvedValueOnce({ bandId: 'band-2', matchType: 'name_exact' });
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT id, status FROM events')) return { rows: [] };
      if (sql.includes('INSERT INTO events')) {
        return { rows: [{ id: 'event-1', is_new: true }] };
      }
      if (sql.includes('INSERT INTO event_lineup')) return { rowCount: 1, rows: [] };
      throw new Error(`Unexpected query: ${sql}`);
    });

    const result = await orchestrator.runSync();

    expect(result).toEqual({
      success: true,
      eventsCreated: 1,
      eventsUpdated: 0,
      eventsSkipped: 0,
      regionsProcessed: 1,
    });
    expect(syncLog.updateRegionLastSynced).toHaveBeenCalledWith(region.id);
    expect(syncLog.completeSync).toHaveBeenCalledWith(
      'sync-1',
      {
        events_fetched: 1,
        events_created: 1,
        events_updated: 0,
        events_skipped: 0,
        bands_created: 1,
        bands_matched: 1,
        venues_created: 1,
      },
      'completed'
    );
    expect(
      mockQuery.mock.calls.filter(([sql]) => sql.includes('INSERT INTO event_lineup'))
    ).toHaveLength(2);
  });

  it('merges into a user-created event instead of creating a duplicate provider row', async () => {
    const { orchestrator, regionSync, eventService } = createDependencies();
    const normalizedEvent = makeEvent();
    regionSync.ingestSingleEvent.mockResolvedValue(normalizedEvent);
    eventService.findUserCreatedEventAtVenueDate.mockResolvedValue('user-event-1');
    eventService.mergeTicketmasterIntoUserEvent.mockResolvedValue(true);
    mockQuery.mockResolvedValue({ rows: [], rowCount: 1 });

    const eventId = await orchestrator.ingestSingleEvent({ id: 'raw-tm-event' });

    expect(eventId).toBe('user-event-1');
    expect(eventService.mergeTicketmasterIntoUserEvent).toHaveBeenCalledWith('user-event-1', {
      externalId: 'tm-event-1',
      eventName: 'Tour Stop',
      ticketUrl: 'https://tickets.example/event-1',
      priceMin: 25,
      priceMax: 80,
      status: 'active',
    });
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO event_lineup'), [
      'user-event-1',
      'band-1',
      0,
      true,
    ]);
    expect(mockQuery.mock.calls.some(([sql]) => sql.includes('INSERT INTO events'))).toBe(false);
  });

  it('falls through to upsert when merge hits a cancelled target', async () => {
    const { orchestrator, regionSync, eventService } = createDependencies();
    regionSync.ingestSingleEvent.mockResolvedValue(makeEvent());
    eventService.findUserCreatedEventAtVenueDate.mockResolvedValue('user-event-cancelled');
    eventService.mergeTicketmasterIntoUserEvent.mockResolvedValue(false);
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT id, status FROM events')) return { rows: [] };
      if (sql.includes('INSERT INTO events')) {
        return { rows: [{ id: 'event-live', is_new: true }] };
      }
      if (sql.includes('INSERT INTO event_lineup')) return { rows: [], rowCount: 1 };
      throw new Error(`Unexpected query: ${sql}`);
    });

    await expect(orchestrator.ingestSingleEvent({ id: 'raw' })).resolves.toBe('event-live');
    expect(mockQuery.mock.calls.some(([sql]) => sql.includes('INSERT INTO events'))).toBe(true);
  });

  it('falls through to upsert when merge unique-violates', async () => {
    const { orchestrator, regionSync, eventService } = createDependencies();
    regionSync.ingestSingleEvent.mockResolvedValue(makeEvent());
    eventService.findUserCreatedEventAtVenueDate.mockResolvedValue('user-event-1');
    eventService.mergeTicketmasterIntoUserEvent.mockRejectedValue(
      Object.assign(new Error('unique_violation'), { code: '23505' })
    );
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT id, status FROM events')) return { rows: [] };
      if (sql.includes('INSERT INTO events')) {
        return { rows: [{ id: 'event-live', is_new: true }] };
      }
      if (sql.includes('INSERT INTO event_lineup')) return { rows: [], rowCount: 1 };
      throw new Error(`Unexpected query: ${sql}`);
    });

    await expect(orchestrator.ingestSingleEvent({ id: 'raw' })).resolves.toBe('event-live');
  });

  it('does not apply provider status onto a cancelled attended event', async () => {
    const { orchestrator, regionSync } = createDependencies();
    regionSync.ingestSingleEvent.mockResolvedValue(makeEvent({ status: 'active' }));
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT id, status FROM events')) {
        return { rows: [{ id: 'event-1', status: 'cancelled' }] };
      }
      if (sql.includes('INSERT INTO events')) {
        return { rows: [{ id: 'event-1', is_new: false }] };
      }
      if (sql.includes('INSERT INTO event_lineup')) return { rows: [], rowCount: 1 };
      throw new Error(`Unexpected query: ${sql}`);
    });

    await expect(orchestrator.ingestSingleEvent({ id: 'raw' })).resolves.toBe('event-1');

    const upsertSql = mockQuery.mock.calls.find(([sql]) =>
      sql.includes('INSERT INTO events')
    )?.[0] as string;
    expect(upsertSql).toContain("WHEN events.status = 'cancelled'");
    expect(upsertSql).toContain('EXISTS (SELECT 1 FROM checkins');
    expect(upsertSql).toContain('ELSE EXCLUDED.status');
  });

  it('returns null when a single provider event cannot be normalized', async () => {
    const { orchestrator, regionSync, bandMatcher } = createDependencies();
    regionSync.ingestSingleEvent.mockResolvedValue(null);

    await expect(orchestrator.ingestSingleEvent({ id: 'invalid' })).resolves.toBeNull();
    expect(bandMatcher.matchOrCreateVenue).not.toHaveBeenCalled();
  });

  it('notifies checked-in users when an existing event becomes cancelled', async () => {
    const { orchestrator, regionSync, notificationService } = createDependencies();
    regionSync.ingestSingleEvent.mockResolvedValue(makeEvent({ status: 'cancelled' }));
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT id, status FROM events')) {
        return { rows: [{ id: 'event-1', status: 'active' }] };
      }
      if (sql.includes('INSERT INTO events')) {
        return { rows: [{ id: 'event-1', is_new: false }] };
      }
      if (sql.includes('INSERT INTO event_lineup')) return { rows: [], rowCount: 1 };
      if (sql.includes('SELECT DISTINCT user_id FROM checkins')) {
        return { rows: [{ user_id: 'user-1' }, { user_id: 'user-2' }] };
      }
      throw new Error(`Unexpected query: ${sql}`);
    });

    await expect(orchestrator.ingestSingleEvent({ id: 'raw' })).resolves.toBe('event-1');

    expect(notificationService.createNotification).toHaveBeenCalledTimes(2);
    expect(notificationService.createNotification).toHaveBeenNthCalledWith(1, {
      userId: 'user-1',
      type: 'event_cancelled',
      title: 'Event cancelled',
      message: 'An event you checked in to has been cancelled.',
      eventId: 'event-1',
    });
  });

  it('contains per-notification failures without failing event ingestion', async () => {
    const { orchestrator, regionSync, notificationService } = createDependencies();
    regionSync.ingestSingleEvent.mockResolvedValue(makeEvent({ status: 'rescheduled' }));
    notificationService.createNotification
      .mockRejectedValueOnce(new Error('notification database unavailable'))
      .mockResolvedValueOnce({ id: 'notification-2' });
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT id, status FROM events')) {
        return { rows: [{ id: 'event-1', status: 'active' }] };
      }
      if (sql.includes('INSERT INTO events')) {
        return { rows: [{ id: 'event-1', is_new: false }] };
      }
      if (sql.includes('INSERT INTO event_lineup')) return { rows: [] };
      if (sql.includes('SELECT DISTINCT user_id FROM checkins')) {
        return { rows: [{ user_id: 'user-1' }, { user_id: 'user-2' }] };
      }
      throw new Error(`Unexpected query: ${sql}`);
    });

    await expect(orchestrator.ingestSingleEvent({ id: 'raw' })).resolves.toBe('event-1');
    expect(notificationService.createNotification).toHaveBeenCalledTimes(2);
  });

  it('skips a malformed event and continues processing the rest of the region', async () => {
    const { orchestrator, regionSync, bandMatcher } = createDependencies();
    regionSync.fetchEventsForRegion.mockResolvedValue({
      events: [makeEvent({ externalId: 'bad' }), makeEvent({ externalId: 'good' })],
      eventsFetched: 2,
    });
    bandMatcher.matchOrCreateVenue
      .mockRejectedValueOnce(new Error('venue malformed'))
      .mockResolvedValueOnce({ venueId: 'venue-1', isNew: false });
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT id, status FROM events')) return { rows: [] };
      if (sql.includes('INSERT INTO events')) {
        return { rows: [{ id: 'event-good', is_new: true }] };
      }
      if (sql.includes('INSERT INTO event_lineup')) return { rows: [] };
      throw new Error(`Unexpected query: ${sql}`);
    });

    await expect(orchestrator.runSync()).resolves.toEqual({
      success: true,
      eventsCreated: 1,
      eventsUpdated: 0,
      eventsSkipped: 1,
      regionsProcessed: 1,
    });
  });

  it('contains a failed region and continues with the remaining regions', async () => {
    const { orchestrator, region, regionSync, syncLog } = createDependencies();
    syncLog.loadSyncRegions.mockResolvedValue([
      region,
      { ...region, id: 'region-2', label: 'Dallas' },
    ]);
    regionSync.fetchEventsForRegion
      .mockRejectedValueOnce(new Error('provider timeout'))
      .mockResolvedValueOnce({ events: [], eventsFetched: 0 });

    await expect(orchestrator.runSync()).resolves.toEqual({
      success: true,
      eventsCreated: 0,
      eventsUpdated: 0,
      eventsSkipped: 0,
      regionsProcessed: 1,
    });
    expect(syncLog.updateRegionLastSynced).toHaveBeenCalledTimes(1);
    expect(syncLog.updateRegionLastSynced).toHaveBeenCalledWith('region-2');
  });

  it('records a failed sync when loading region state fails', async () => {
    const { orchestrator, syncLog, counters } = createDependencies();
    syncLog.loadSyncRegions.mockRejectedValue(new Error('database unavailable'));

    await expect(orchestrator.runSync()).resolves.toEqual({
      success: false,
      eventsCreated: 0,
      eventsUpdated: 0,
      eventsSkipped: 0,
      regionsProcessed: 0,
      error: 'database unavailable',
    });
    expect(syncLog.completeSync).toHaveBeenCalledWith(
      'sync-1',
      counters,
      'failed',
      'database unavailable'
    );
  });
});
