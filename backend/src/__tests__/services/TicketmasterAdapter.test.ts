import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import axios from 'axios';
import logger from '../../utils/logger';
import { TicketmasterAdapter } from '../../services/TicketmasterAdapter';
import { TicketmasterEvent, TicketmasterSearchResponse } from '../../types/ticketmaster';

jest.mock('axios');
jest.mock('../../utils/redisRateLimiter', () => ({
  getRedis: jest.fn(() => null),
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

const mockGet = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockAxios = axios as jest.Mocked<typeof axios>;
const mockLogger = logger as jest.Mocked<typeof logger>;

function makeEvent(id: string): TicketmasterEvent {
  return {
    id,
    name: `Event ${id}`,
    url: `https://example.com/${id}`,
    dates: {
      start: {
        localDate: '2026-01-01',
        localTime: '19:00:00',
      },
      status: {
        code: 'onsale',
      },
    },
    _embedded: {
      venues: [
        {
          id: `venue-${id}`,
          name: `Venue ${id}`,
          city: { name: 'Austin' },
          state: { name: 'Texas', stateCode: 'TX' },
          country: { countryCode: 'US' },
        },
      ],
    },
  };
}

function makeSearchResponse(params: {
  events: TicketmasterEvent[];
  totalElements?: number;
  totalPages?: number;
  pageNumber?: number;
}): TicketmasterSearchResponse {
  return {
    _embedded: { events: params.events },
    page: {
      size: 200,
      totalElements: params.totalElements ?? params.events.length,
      totalPages: params.totalPages ?? 1,
      number: params.pageNumber ?? 0,
    },
  };
}

describe('TicketmasterAdapter', () => {
  beforeEach(() => {
    process.env.TICKETMASTER_API_KEY = 'test-key';
    jest.clearAllMocks();
    mockGet.mockReset();
    mockAxios.create.mockReturnValue({ get: mockGet } as any);
  });

  it('returns fetchable paged subset and logs truncation when max depth is reached', async () => {
    mockGet
      .mockResolvedValueOnce({
        data: makeSearchResponse({
          events: [makeEvent('first')],
          totalElements: 1200,
          totalPages: 2,
        }),
      })
      .mockResolvedValueOnce({
        data: makeSearchResponse({
          events: [makeEvent('second')],
          totalElements: 1200,
          totalPages: 2,
          pageNumber: 1,
        }),
      });

    const adapter = new TicketmasterAdapter();
    const result = await adapter.fetchAllEventsForRegion(
      '30.2672,-97.7431',
      25,
      '2026-01-01T00:00:00Z',
      '2026-01-02T00:00:00Z',
      { maxDepth: 0 }
    );

    expect(result.map((event) => event.externalId)).toEqual(['first', 'second']);
    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      '[TicketmasterAdapter] Truncated Ticketmaster result range',
      expect.objectContaining({
        reason: 'max_depth',
        latlong: '30.2672,-97.7431',
        radius: 25,
        start: '2026-01-01T00:00:00Z',
        end: '2026-01-02T00:00:00Z',
        totalElements: 1200,
        depth: 0,
      })
    );
  });

  it('backs off and retries Ticketmaster 429 responses using Retry-After', async () => {
    mockGet
      .mockRejectedValueOnce({
        response: {
          status: 429,
          headers: { 'retry-after': '0' },
        },
      })
      .mockResolvedValueOnce({
        data: makeSearchResponse({ events: [makeEvent('retry-success')] }),
      });

    const adapter = new TicketmasterAdapter();
    const result = await adapter.searchMusicEvents({
      latlong: '30.2672,-97.7431',
      radius: 25,
      startDateTime: '2026-01-01T00:00:00Z',
      endDateTime: '2026-01-02T00:00:00Z',
    });

    expect(result.events).toHaveLength(1);
    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      '[TicketmasterAdapter] Provider throttled request',
      expect.objectContaining({
        status: 429,
        usedRetryAfter: true,
      })
    );
  });

  it('routes getEventById through the shared request path', async () => {
    mockGet.mockResolvedValueOnce({ data: makeEvent('event-id') });

    const adapter = new TicketmasterAdapter();
    const result = await adapter.getEventById('event-id');

    expect(result?.id).toBe('event-id');
    expect(mockGet).toHaveBeenCalledWith('/events/event-id.json');
  });
});
