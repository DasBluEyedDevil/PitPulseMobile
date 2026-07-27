import { EventSyncOrchestrator } from '../../services/eventsync';
import { EventSyncService } from '../../services/EventSyncService';

const mockRunSync = jest.fn();
const mockIngestSingleEvent = jest.fn();

jest.mock('../../services/eventsync', () => ({
  EventSyncOrchestrator: jest.fn().mockImplementation(() => ({
    runSync: mockRunSync,
    ingestSingleEvent: mockIngestSingleEvent,
  })),
  RegionSyncService: jest.fn(),
  SyncLogService: jest.fn(),
}));
jest.mock('../../services/BandMatcher', () => ({ BandMatcher: jest.fn() }));
jest.mock('../../services/EventService', () => ({ EventService: jest.fn() }));
jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('EventSyncService compatibility facade', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRunSync.mockReset();
    mockIngestSingleEvent.mockReset();
  });

  it('delegates a successful region sync to the decomposed orchestrator', async () => {
    mockRunSync.mockResolvedValue({
      success: true,
      eventsCreated: 1,
      eventsUpdated: 2,
      eventsSkipped: 0,
      regionsProcessed: 1,
    });

    await expect(new EventSyncService().runSync('region-1')).resolves.toBeUndefined();

    expect(EventSyncOrchestrator).toHaveBeenCalledTimes(1);
    expect(mockRunSync).toHaveBeenCalledWith('region-1');
  });

  it('converts an orchestrator failure result back into the legacy thrown-error contract', async () => {
    mockRunSync.mockResolvedValue({
      success: false,
      eventsCreated: 0,
      eventsUpdated: 0,
      eventsSkipped: 0,
      regionsProcessed: 0,
      error: 'provider unavailable',
    });

    await expect(new EventSyncService().runSync()).rejects.toThrow('provider unavailable');
  });

  it('uses a stable fallback error when the orchestrator omits failure detail', async () => {
    mockRunSync.mockResolvedValue({
      success: false,
      eventsCreated: 0,
      eventsUpdated: 0,
      eventsSkipped: 0,
      regionsProcessed: 0,
    });

    await expect(new EventSyncService().runSync()).rejects.toThrow('Sync failed');
  });

  it('delegates on-demand ingestion and preserves a null normalization result', async () => {
    mockIngestSingleEvent.mockResolvedValueOnce('event-1').mockResolvedValueOnce(null);
    const service = new EventSyncService();
    const providerEvent = { id: 'tm-event-1' } as any;

    await expect(service.ingestSingleEvent(providerEvent)).resolves.toBe('event-1');
    await expect(service.ingestSingleEvent({ id: 'invalid' } as any)).resolves.toBeNull();
    expect(mockIngestSingleEvent).toHaveBeenNthCalledWith(1, providerEvent);
  });
});
