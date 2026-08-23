const mockDbQuery = jest.fn();
const mockGetClient = jest.fn();
const mockClientQuery = jest.fn();
const mockClientRelease = jest.fn();

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn(() => ({
      query: mockDbQuery,
      getClient: mockGetClient,
    })),
  },
}));
jest.mock('../../services/EventService', () => ({
  EventService: jest.fn().mockImplementation(() => ({
    promoteIfVerified: jest.fn(),
  })),
}));
jest.mock('../../services/FeedService', () => ({
  FeedService: jest.fn().mockImplementation(() => ({
    invalidateUserFeedCache: jest.fn().mockResolvedValue(undefined),
    invalidateEventFeedCache: jest.fn().mockResolvedValue(undefined),
    invalidateGlobalFeedCache: jest.fn().mockResolvedValue(undefined),
  })),
}));
jest.mock('../../jobs/badgeQueue', () => ({
  badgeEvalQueue: { add: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock('../../services/NotificationBatchService', () => ({
  notificationBatchService: { appendForUser: jest.fn() },
}));
jest.mock('../../utils/redisRateLimiter', () => ({
  getRedis: jest.fn(() => null),
}));
jest.mock('../../utils/cache', () => ({
  cache: { del: jest.fn().mockResolvedValue(undefined) },
  CacheKeys: {
    recommendations: (userId: string) => `events:recs:${userId}`,
    bandAggregate: (bandId: string) => `bands:aggregate:${bandId}`,
    venueAggregate: (venueId: string) => `venues:aggregate:${venueId}`,
  },
}));
jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
  },
}));

import express from 'express';
import request from 'supertest';
import { DateTime } from 'luxon';
import { CheckinCreatorService } from '../../services/checkin/CheckinCreatorService';
import {
  CHECKIN_OUTSIDE_WINDOW_MESSAGE,
  isCheckinWithinTimeWindow,
  type CheckinWindowEvent,
} from '../../services/checkin/checkinTimeWindow';
import { buildErrorResponseForStatus } from '../../middleware/validate';
import logger from '../../utils/logger';

const ZONE = 'America/New_York';
const EVENT_DATE = '2026-04-15';

function at(localIso: string, zone = ZONE): Date {
  return DateTime.fromISO(localIso, { zone }).toJSDate();
}

describe('isCheckinWithinTimeWindow', () => {
  const cases: Array<{
    name: string;
    event: CheckinWindowEvent;
    now: Date;
    expected: boolean;
  }> = [
    {
      name: 'before doors is false',
      event: {
        event_date: EVENT_DATE,
        timezone: ZONE,
        doors_time: '19:00',
        start_time: '20:00',
        end_time: '22:00',
      },
      now: at('2026-04-15T18:00:00'),
      expected: false,
    },
    {
      name: 'during doors/start/end window is true',
      event: {
        event_date: EVENT_DATE,
        timezone: ZONE,
        doors_time: '19:00',
        start_time: '20:00',
        end_time: '22:00',
      },
      now: at('2026-04-15T20:00:00'),
      expected: true,
    },
    {
      name: 'after end+1h is false',
      event: {
        event_date: EVENT_DATE,
        timezone: ZONE,
        doors_time: '19:00',
        start_time: '20:00',
        end_time: '22:00',
      },
      now: at('2026-04-15T23:30:00'),
      expected: false,
    },
    {
      name: 'overnight 21:00–01:00 at 00:30 is true',
      event: {
        event_date: EVENT_DATE,
        timezone: ZONE,
        start_time: '21:00',
        end_time: '01:00',
      },
      now: at('2026-04-16T00:30:00'),
      expected: true,
    },
    {
      name: 'overnight 21:00–01:00 at 21:00 previous calendar evening is true',
      event: {
        event_date: EVENT_DATE,
        timezone: ZONE,
        start_time: '21:00',
        end_time: '01:00',
      },
      now: at('2026-04-15T21:00:00'),
      expected: true,
    },
    {
      name: 'start_time=00:30 minus-2h wrap at 00:30 is true',
      event: {
        event_date: EVENT_DATE,
        timezone: ZONE,
        start_time: '00:30',
      },
      now: at('2026-04-15T00:30:00'),
      expected: true,
    },
    {
      name: 'start_time=00:30 minus-2h wrap at 22:30 previous evening is true',
      event: {
        event_date: EVENT_DATE,
        timezone: ZONE,
        start_time: '00:30',
      },
      now: at('2026-04-14T22:30:00'),
      expected: true,
    },
    {
      name: 'start_time=00:30 next calendar morning is false',
      event: {
        event_date: EVENT_DATE,
        timezone: ZONE,
        start_time: '00:30',
      },
      now: at('2026-04-15T10:00:00'),
      expected: false,
    },
    {
      name: 'NULL timezone is all-day on event_date, not UTC-deny',
      event: {
        event_date: EVENT_DATE,
        timezone: null,
        doors_time: '19:00',
        start_time: '20:00',
      },
      now: new Date('2026-04-15T10:00:00.000Z'),
      expected: true,
    },
    {
      name: 'NULL timezone all-day rejects the next UTC morning',
      event: {
        event_date: EVENT_DATE,
        timezone: null,
      },
      now: new Date('2026-04-16T00:30:00.000Z'),
      expected: false,
    },
    {
      name: 'timezone set, all clocks null → all-day (not 16:00)',
      event: {
        event_date: EVENT_DATE,
        timezone: ZONE,
      },
      now: at('2026-04-15T10:00:00'),
      expected: true,
    },
    {
      name: 'timezone set, all clocks null → next calendar morning is outside all-day',
      event: {
        event_date: EVENT_DATE,
        timezone: ZONE,
      },
      now: at('2026-04-16T00:30:00'),
      expected: false,
    },
    {
      name: 'doors-only 19:00 at 20:00 is true (not all-day, not fail-closed)',
      event: {
        event_date: EVENT_DATE,
        timezone: ZONE,
        doors_time: '19:00',
      },
      now: at('2026-04-15T20:00:00'),
      expected: true,
    },
    {
      name: 'doors-only 19:00 at 00:30 next calendar is false (23:59 end)',
      event: {
        event_date: EVENT_DATE,
        timezone: ZONE,
        doors_time: '19:00',
      },
      now: at('2026-04-16T00:30:00'),
      expected: false,
    },
    {
      name: 'doors-only 19:00 at 10:00 same day is false',
      event: {
        event_date: EVENT_DATE,
        timezone: ZONE,
        doors_time: '19:00',
      },
      now: at('2026-04-15T10:00:00'),
      expected: false,
    },
    {
      name: 'invalid TZ fails closed',
      event: {
        event_date: EVENT_DATE,
        timezone: 'Not/A_Zone',
        start_time: '20:00',
      },
      now: at('2026-04-15T20:00:00'),
      expected: false,
    },
    {
      name: 'unparsable clock fails closed',
      event: {
        event_date: EVENT_DATE,
        timezone: ZONE,
        doors_time: 'evening',
      },
      now: at('2026-04-15T20:00:00'),
      expected: false,
    },
    {
      name: 'missing event_date fails closed',
      event: {
        timezone: ZONE,
        start_time: '20:00',
      },
      now: at('2026-04-15T20:00:00'),
      expected: false,
    },
  ];

  it.each(cases)('$name', ({ event, now, expected }) => {
    expect(isCheckinWithinTimeWindow(event, now)).toBe(expected);
  });

  it('logs warn on fail-closed parse errors, not on a normal miss', () => {
    (logger.warn as jest.Mock).mockClear();
    isCheckinWithinTimeWindow(
      { event_date: EVENT_DATE, timezone: 'Not/A_Zone' },
      at('2026-04-15T20:00:00')
    );
    expect(logger.warn).toHaveBeenCalledWith(
      'Check-in time window failed closed',
      expect.objectContaining({ reason: 'invalid_timezone' })
    );

    (logger.warn as jest.Mock).mockClear();
    isCheckinWithinTimeWindow(
      {
        event_date: EVENT_DATE,
        timezone: ZONE,
        doors_time: '19:00',
        start_time: '20:00',
        end_time: '22:00',
      },
      at('2026-04-15T10:00:00')
    );
    expect(logger.warn).not.toHaveBeenCalled();
  });
});

describe('CheckinCreatorService window enforcement', () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  const eventId = '22222222-2222-4222-8222-222222222222';
  const venueId = '44444444-4444-4444-8444-444444444444';
  const bandId = '55555555-5555-4555-8555-555555555555';

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetClient.mockResolvedValue({
      query: mockClientQuery,
      release: mockClientRelease,
    });
  });

  it('throws BadRequestError 400 when the event window is missed', async () => {
    mockClientQuery.mockImplementation(async (sql: string) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') return { rows: [] };
      if (sql.includes('FROM events e')) {
        return {
          rows: [
            {
              id: eventId,
              venue_id: venueId,
              event_date: '2020-01-01',
              timezone: ZONE,
              doors_time: '19:00',
              start_time: '20:00',
              end_time: '22:00',
              venue_lat: '42.3601',
              venue_lon: '-71.0589',
              venue_type: 'club',
            },
          ],
        };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    await expect(
      new CheckinCreatorService(jest.fn()).createEventCheckin({ userId, eventId })
    ).rejects.toMatchObject({
      message: CHECKIN_OUTSIDE_WINDOW_MESSAGE,
      statusCode: 400,
    });
    expect(mockClientQuery).toHaveBeenCalledWith('ROLLBACK');
    expect(mockClientRelease).toHaveBeenCalled();
  });

  it('does not apply the event window to manual band+venue check-ins', async () => {
    const checkinId = '33333333-3333-4333-8333-333333333333';
    mockDbQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM bands')) return { rows: [{ id: bandId, name: 'The Tests' }] };
      if (sql.includes('FROM venues')) {
        return {
          rows: [
            {
              id: venueId,
              name: 'The Hall',
              latitude: '42.3601',
              longitude: '-71.0589',
              venue_type: 'club',
            },
          ],
        };
      }
      if (sql.includes('INSERT INTO checkins')) {
        return { rows: [{ id: checkinId, created_at: '2026-04-15T12:00:00.000Z' }], rowCount: 1 };
      }
      if (sql.includes('SELECT follower_id')) return { rows: [] };
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const getCheckinById = jest.fn().mockResolvedValue({ id: checkinId, userId });

    await expect(
      new CheckinCreatorService(getCheckinById).createManualCheckin({
        userId,
        bandId,
        venueId,
      })
    ).resolves.toMatchObject({ id: checkinId });
  });
});

describe('HTTP window miss', () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  const eventId = '22222222-2222-4222-8222-222222222222';
  const venueId = '44444444-4444-4444-8444-444444444444';

  it('maps a mocked event-row window miss to HTTP 400', async () => {
    mockGetClient.mockResolvedValue({
      query: mockClientQuery,
      release: mockClientRelease,
    });
    mockClientQuery.mockImplementation(async (sql: string) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') return { rows: [] };
      if (sql.includes('FROM events e')) {
        return {
          rows: [
            {
              id: eventId,
              venue_id: venueId,
              event_date: '2020-01-01',
              timezone: ZONE,
              doors_time: '19:00',
              start_time: '20:00',
              end_time: '22:00',
              venue_lat: '42.3601',
              venue_lon: '-71.0589',
              venue_type: 'club',
            },
          ],
        };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const app = express();
    app.use(express.json());
    app.post('/api/checkins', async (req, _res, next) => {
      try {
        await new CheckinCreatorService(jest.fn()).createEventCheckin({
          userId,
          eventId: req.body.eventId,
        });
      } catch (error) {
        next(error);
      }
    });
    app.use(
      (
        error: Error & { statusCode?: number; status?: number; details?: unknown },
        _req: express.Request,
        res: express.Response,
        _next: express.NextFunction
      ) => {
        const rawStatusCode = error.statusCode || error.status || 500;
        const statusCode = rawStatusCode >= 400 && rawStatusCode <= 599 ? rawStatusCode : 500;
        const message =
          statusCode >= 500 ? 'Internal server error' : error.message || 'Request failed';
        res
          .status(statusCode)
          .json(buildErrorResponseForStatus(statusCode, message, error.details));
      }
    );

    const response = await request(app).post('/api/checkins').send({ eventId });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: CHECKIN_OUTSIDE_WINDOW_MESSAGE,
      },
    });
  });
});
