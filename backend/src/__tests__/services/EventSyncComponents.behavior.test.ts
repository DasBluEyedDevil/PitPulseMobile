import { TicketmasterAdapter } from '../../services/TicketmasterAdapter';
import { RegionSyncService } from '../../services/eventsync/RegionSyncService';
import { SyncLogService } from '../../services/eventsync/SyncLogService';

const mockQuery = jest.fn();
const mockAdapter = {
  fetchAllEventsForRegion: jest.fn(),
  normalizeEvent: jest.fn(),
};

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    getInstance: () => ({ query: mockQuery }),
  },
}));
jest.mock('../../services/TicketmasterAdapter', () => ({
  TicketmasterAdapter: jest.fn(),
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

const region = {
  id: 'region-1',
  label: 'Austin',
  latitude: 30.2672,
  longitude: -97.7431,
  radius_miles: 25,
};

describe('RegionSyncService provider boundary', () => {
  const previousApiKey = process.env.TICKETMASTER_API_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAdapter.fetchAllEventsForRegion.mockReset();
    mockAdapter.normalizeEvent.mockReset();
    (TicketmasterAdapter as jest.Mock).mockImplementation(() => mockAdapter);
    delete process.env.TICKETMASTER_API_KEY;
  });

  afterAll(() => {
    if (previousApiKey === undefined) {
      delete process.env.TICKETMASTER_API_KEY;
    } else {
      process.env.TICKETMASTER_API_KEY = previousApiKey;
    }
    jest.useRealTimers();
  });

  it('returns an empty result when Ticketmaster is not configured', async () => {
    const service = new RegionSyncService();

    expect(service.isConfigured()).toBe(false);
    await expect(service.fetchEventsForRegion(region)).resolves.toEqual({
      events: [],
      eventsFetched: 0,
    });
    expect(TicketmasterAdapter).not.toHaveBeenCalled();
  });

  it('disables sync when adapter initialization rejects configured credentials', () => {
    process.env.TICKETMASTER_API_KEY = 'configured';
    (TicketmasterAdapter as jest.Mock).mockImplementationOnce(() => {
      throw new Error('invalid provider configuration');
    });

    const service = new RegionSyncService();

    expect(service.isConfigured()).toBe(false);
    expect(service.getAdapter()).toBeNull();
  });

  it('fetches the standard 30-day window with the region coordinates', async () => {
    process.env.TICKETMASTER_API_KEY = 'configured';
    jest.useFakeTimers().setSystemTime(new Date('2026-07-27T12:34:56.789Z'));
    const events = [{ externalId: 'tm-event-1' }];
    mockAdapter.fetchAllEventsForRegion.mockResolvedValue(events);
    const service = new RegionSyncService();

    const result = await service.fetchEventsForRegion(region);

    expect(result).toEqual({ events, eventsFetched: 1 });
    expect(mockAdapter.fetchAllEventsForRegion).toHaveBeenCalledWith(
      '30.2672,-97.7431',
      25,
      '2026-07-27T12:34:56Z',
      '2026-08-26T12:34:56Z'
    );
    expect(service.getAdapter()).toBe(mockAdapter);
  });

  it('uses an explicit date range for backfills', async () => {
    process.env.TICKETMASTER_API_KEY = 'configured';
    mockAdapter.fetchAllEventsForRegion.mockResolvedValue([]);
    const service = new RegionSyncService();

    const result = await service.fetchEventsForRegionWithDateRange(
      region,
      new Date('2026-06-01T00:00:00.123Z'),
      new Date('2026-06-03T23:59:59.999Z')
    );

    expect(result).toEqual({ events: [], eventsFetched: 0 });
    expect(mockAdapter.fetchAllEventsForRegion).toHaveBeenCalledWith(
      '30.2672,-97.7431',
      25,
      '2026-06-01T00:00:00Z',
      '2026-06-03T23:59:59Z'
    );
  });

  it('skips backfills when the provider is not configured', async () => {
    const service = new RegionSyncService();

    await expect(
      service.fetchEventsForRegionWithDateRange(
        region,
        new Date('2026-06-01T00:00:00Z'),
        new Date('2026-06-03T00:00:00Z')
      )
    ).resolves.toEqual({ events: [], eventsFetched: 0 });
    expect(mockAdapter.fetchAllEventsForRegion).not.toHaveBeenCalled();
  });

  it('normalizes on-demand events even when scheduled sync is disabled', async () => {
    const normalized = { externalId: 'tm-event-1' };
    mockAdapter.normalizeEvent.mockReturnValue(normalized);
    const service = new RegionSyncService();

    await expect(service.ingestSingleEvent({ id: 'raw-event' })).resolves.toBe(normalized);
    expect(TicketmasterAdapter).toHaveBeenCalledTimes(1);
    expect(mockAdapter.normalizeEvent).toHaveBeenCalledWith({ id: 'raw-event' });
  });

  it('reuses the configured adapter for on-demand normalization', async () => {
    process.env.TICKETMASTER_API_KEY = 'configured';
    mockAdapter.normalizeEvent.mockReturnValue(null);
    const service = new RegionSyncService();

    await expect(service.ingestSingleEvent({ id: 'invalid-event' })).resolves.toBeNull();
    expect(TicketmasterAdapter).toHaveBeenCalledTimes(1);
    expect(mockAdapter.normalizeEvent).toHaveBeenCalledWith({ id: 'invalid-event' });
  });
});

describe('SyncLogService operational history', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockReset();
  });

  it('starts a region-scoped sync with zeroed counters', async () => {
    const startedAt = new Date('2026-07-27T12:00:00Z');
    mockQuery.mockResolvedValue({
      rows: [{ id: 'sync-1', status: 'running', started_at: startedAt }],
    });

    const result = await new SyncLogService().startSync('region-1');

    expect(result).toEqual({
      id: 'sync-1',
      status: 'running',
      startedAt,
      eventsFetched: 0,
      eventsCreated: 0,
      eventsUpdated: 0,
      eventsSkipped: 0,
      bandsCreated: 0,
      bandsMatched: 0,
      venuesCreated: 0,
    });
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO event_sync_log'), [
      'region-1',
    ]);
  });

  it('persists completion counters and the final error state', async () => {
    mockQuery.mockResolvedValue({ rowCount: 1, rows: [] });
    const service = new SyncLogService();
    const counters = {
      events_fetched: 8,
      events_created: 3,
      events_updated: 2,
      events_skipped: 3,
      bands_created: 1,
      bands_matched: 4,
      venues_created: 1,
    };

    await service.completeSync('sync-1', counters, 'failed', 'provider timeout');

    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('UPDATE event_sync_log SET'), [
      'failed',
      8,
      3,
      2,
      3,
      1,
      4,
      1,
      'provider timeout',
      'sync-1',
    ]);
  });

  it('contains a logging write failure so it cannot mask the completed sync', async () => {
    mockQuery.mockRejectedValue(new Error('logging database unavailable'));

    await expect(
      new SyncLogService().completeSync(
        'sync-1',
        {
          events_fetched: 0,
          events_created: 0,
          events_updated: 0,
          events_skipped: 0,
          bands_created: 0,
          bands_matched: 0,
          venues_created: 0,
        },
        'completed'
      )
    ).resolves.toBeUndefined();
  });

  it('marks a failed sync with empty counters and the original error message', async () => {
    mockQuery.mockResolvedValue({ rowCount: 1, rows: [] });
    const service = new SyncLogService();

    await service.failSync('sync-1', new Error('region load failed'));

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE event_sync_log SET'),
      expect.arrayContaining(['failed', 'region load failed', 'sync-1'])
    );
  });

  it('loads one active region or all active regions', async () => {
    const regions = [region];
    mockQuery.mockResolvedValueOnce({ rows: regions }).mockResolvedValueOnce({ rows: regions });
    const service = new SyncLogService();

    await expect(service.loadSyncRegions('region-1')).resolves.toEqual(regions);
    await expect(service.loadSyncRegions()).resolves.toEqual(regions);

    expect(mockQuery).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('WHERE id = $1 AND is_active = true'),
      ['region-1']
    );
    expect(mockQuery).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('ORDER BY last_synced_at ASC NULLS FIRST')
    );
  });

  it('contains a region timestamp failure without failing a successful sync', async () => {
    mockQuery.mockRejectedValue(new Error('timestamp write failed'));

    await expect(new SyncLogService().updateRegionLastSynced('region-1')).resolves.toBeUndefined();
  });

  it('maps recent database rows to the public monitoring model', async () => {
    const startedAt = new Date('2026-07-27T12:00:00Z');
    const completedAt = new Date('2026-07-27T12:05:00Z');
    mockQuery.mockResolvedValue({
      rows: [
        {
          id: 'sync-1',
          status: 'completed',
          started_at: startedAt,
          completed_at: completedAt,
          events_fetched: 10,
          events_created: 3,
          events_updated: 6,
          events_skipped: 1,
          bands_created: 2,
          bands_matched: 7,
          venues_created: 1,
          error_message: null,
        },
      ],
    });

    await expect(new SyncLogService().getRecentSyncLogs(5)).resolves.toEqual([
      {
        id: 'sync-1',
        status: 'completed',
        startedAt,
        completedAt,
        eventsFetched: 10,
        eventsCreated: 3,
        eventsUpdated: 6,
        eventsSkipped: 1,
        bandsCreated: 2,
        bandsMatched: 7,
        venuesCreated: 1,
        errorMessage: null,
      },
    ]);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('LIMIT $1'), [5]);
  });
});
