import express from 'express';
import request from 'supertest';
import { FeedController } from '../../controllers/FeedController';
import { FeedService, encodeCursor } from '../../services/FeedService';
import { validate } from '../../middleware/validate';
import { eventFeedSchema, feedQuerySchema, markReadSchema } from '../../routes/feedRoutes';

jest.mock('../../services/FeedService', () => {
  const actual = jest.requireActual('../../services/FeedService');
  return {
    ...actual,
    FeedService: jest.fn(),
  };
});

describe('FeedController mobile contract', () => {
  const EVENT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const CHECKIN_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  let feedService: jest.Mocked<FeedService>;

  const createApp = (user?: { id: string }) => {
    const controller = new FeedController();
    (controller as any).feedService = feedService;

    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      (req as any).user = user;
      next();
    });
    app.get('/friends', validate(feedQuerySchema), controller.getFriendsFeed);
    app.get('/global', validate(feedQuerySchema), controller.getGlobalFeed);
    app.get('/events/:eventId', validate(eventFeedSchema), controller.getEventFeed);
    app.get('/happening-now', controller.getHappeningNow);
    app.get('/unseen', controller.getUnseenCounts);
    app.post('/mark-read', validate(markReadSchema), controller.markRead);
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
    feedService = {
      getFriendsFeed: jest.fn(),
      getGlobalFeed: jest.fn(),
      getEventFeed: jest.fn(),
      getHappeningNow: jest.fn(),
      getUnseenCounts: jest.fn(),
      markFeedRead: jest.fn(),
    } as unknown as jest.Mocked<FeedService>;
  });

  it('requires authentication before loading a user-scoped feed', async () => {
    const response = await request(createApp()).get('/friends');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Authentication required' });
    expect(feedService.getFriendsFeed).not.toHaveBeenCalled();
  });

  it('rejects a malformed cursor before querying the friends feed', async () => {
    const response = await request(createApp({ id: 'user-1' })).get('/friends?cursor=not-a-cursor');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(feedService.getFriendsFeed).not.toHaveBeenCalled();
  });

  it.each([
    ['0', 1],
    ['999', 50],
    ['12', 12],
  ])('normalizes friends feed limit %s to %d', async (rawLimit, expectedLimit) => {
    feedService.getFriendsFeed.mockResolvedValue({ items: [], nextCursor: null, hasMore: false });

    const response = await request(createApp({ id: 'user-1' })).get(`/friends?limit=${rawLimit}`);

    expect(response.status).toBe(200);
    expect(feedService.getFriendsFeed).toHaveBeenCalledWith('user-1', undefined, expectedLimit);
    expect(response.body).toEqual({
      success: true,
      data: { items: [], nextCursor: null, hasMore: false },
    });
  });

  it('passes a valid cursor through to the global feed and returns its page', async () => {
    const cursor = encodeCursor({
      createdAt: '2026-07-26T12:00:00.000Z',
      id: '11111111-1111-4111-8111-111111111111',
    });
    const page = {
      items: [
        {
          id: 'checkin-1',
          checkinId: 'checkin-1',
          userId: 'user-2',
          username: 'alice',
          userAvatarUrl: null,
          eventId: 'event-1',
          eventName: 'Show',
          venueName: 'Venue',
          photoUrl: null,
          createdAt: '2026-07-26T11:00:00.000Z',
          hasBadgeEarned: false,
          toastCount: 0,
          commentCount: 0,
          hasUserToasted: false,
        },
      ],
      nextCursor: null,
      hasMore: false,
    };
    feedService.getGlobalFeed.mockResolvedValue(page);

    const response = await request(createApp({ id: 'user-1' })).get(
      `/global?cursor=${cursor}&limit=12`
    );

    expect(response.status).toBe(200);
    expect(feedService.getGlobalFeed).toHaveBeenCalledWith('user-1', cursor, 12);
    expect(response.body).toEqual({ success: true, data: page });
  });

  it('allows a public event feed while preserving optional viewer context', async () => {
    feedService.getEventFeed.mockResolvedValue({ items: [], nextCursor: null, hasMore: false });

    const publicResponse = await request(createApp()).get(`/events/${EVENT_ID}?limit=3`);
    const viewerResponse = await request(createApp({ id: 'user-1' })).get(
      `/events/${EVENT_ID}?limit=4`
    );

    expect(publicResponse.status).toBe(200);
    expect(viewerResponse.status).toBe(200);
    expect(feedService.getEventFeed).toHaveBeenNthCalledWith(1, EVENT_ID, undefined, undefined, 3);
    expect(feedService.getEventFeed).toHaveBeenNthCalledWith(2, EVENT_ID, 'user-1', undefined, 4);
  });

  it('returns happening-now and unseen data only for the authenticated user', async () => {
    feedService.getHappeningNow.mockResolvedValue([]);
    feedService.getUnseenCounts.mockResolvedValue({
      friends: 2,
      event: 0,
      happening_now: 1,
    });
    const app = createApp({ id: 'user-1' });

    const happeningResponse = await request(app).get('/happening-now');
    const unseenResponse = await request(app).get('/unseen');

    expect(happeningResponse.body).toEqual({ success: true, data: [] });
    expect(unseenResponse.body).toEqual({
      success: true,
      data: { friends: 2, event: 0, happening_now: 1 },
    });
    expect(feedService.getHappeningNow).toHaveBeenCalledWith('user-1');
    expect(feedService.getUnseenCounts).toHaveBeenCalledWith('user-1');
  });

  it.each([
    [{ lastSeenAt: '2026-07-26T12:00:00.000Z' }],
    [{ feedType: 'nearby', lastSeenAt: '2026-07-26T12:00:00.000Z' }],
    [{ feedType: 'friends', lastSeenAt: 'not-a-date' }],
  ])('rejects an invalid mark-read body %#', async (body) => {
    const response = await request(createApp({ id: 'user-1' }))
      .post('/mark-read')
      .send(body);

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(feedService.markFeedRead).not.toHaveBeenCalled();
  });

  it('records a valid feed cursor and preserves the optional last check-in ID', async () => {
    feedService.markFeedRead.mockResolvedValue();

    const response = await request(createApp({ id: 'user-1' }))
      .post('/mark-read')
      .send({
        feedType: 'friends',
        lastSeenAt: '2026-07-26T12:00:00.000Z',
        lastSeenCheckinId: CHECKIN_ID,
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true });
    expect(feedService.markFeedRead).toHaveBeenCalledWith(
      'user-1',
      'friends',
      '2026-07-26T12:00:00.000Z',
      CHECKIN_ID
    );
  });
});
