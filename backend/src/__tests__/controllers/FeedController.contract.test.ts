import express from 'express';
import request from 'supertest';
import { FeedController } from '../../controllers/FeedController';
import { FeedService, encodeCursor } from '../../services/FeedService';

jest.mock('../../services/FeedService', () => {
  const actual = jest.requireActual('../../services/FeedService');
  return {
    ...actual,
    FeedService: jest.fn(),
  };
});

describe('FeedController mobile contract', () => {
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
    app.get('/friends', controller.getFriendsFeed);
    app.get('/global', controller.getGlobalFeed);
    app.get('/events/:eventId', controller.getEventFeed);
    app.get('/happening-now', controller.getHappeningNow);
    app.get('/unseen', controller.getUnseenCounts);
    app.post('/mark-read', controller.markRead);
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
    expect(response.body).toEqual({ error: 'Invalid cursor format' });
    expect(feedService.getFriendsFeed).not.toHaveBeenCalled();
  });

  it.each([
    ['0', 1],
    ['999', 50],
    ['not-a-number', 20],
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

    const publicResponse = await request(createApp()).get('/events/event-1?limit=3');
    const viewerResponse = await request(createApp({ id: 'user-1' })).get(
      '/events/event-1?limit=4'
    );

    expect(publicResponse.status).toBe(200);
    expect(viewerResponse.status).toBe(200);
    expect(feedService.getEventFeed).toHaveBeenNthCalledWith(1, 'event-1', undefined, undefined, 3);
    expect(feedService.getEventFeed).toHaveBeenNthCalledWith(2, 'event-1', 'user-1', undefined, 4);
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
    [
      { lastSeenAt: '2026-07-26T12:00:00.000Z' },
      'feedType must be one of: friends, event, happening_now, global',
    ],
    [
      { feedType: 'nearby', lastSeenAt: '2026-07-26T12:00:00.000Z' },
      'feedType must be one of: friends, event, happening_now, global',
    ],
    [
      { feedType: 'friends', lastSeenAt: 'not-a-date' },
      'lastSeenAt must be a valid ISO 8601 date string',
    ],
  ])('rejects an invalid mark-read body %#', async (body, message) => {
    const response = await request(createApp({ id: 'user-1' }))
      .post('/mark-read')
      .send(body);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: message });
    expect(feedService.markFeedRead).not.toHaveBeenCalled();
  });

  it('records a valid feed cursor and preserves the optional last check-in ID', async () => {
    feedService.markFeedRead.mockResolvedValue();

    const response = await request(createApp({ id: 'user-1' }))
      .post('/mark-read')
      .send({
        feedType: 'friends',
        lastSeenAt: '2026-07-26T12:00:00.000Z',
        lastSeenCheckinId: 'checkin-9',
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true });
    expect(feedService.markFeedRead).toHaveBeenCalledWith(
      'user-1',
      'friends',
      '2026-07-26T12:00:00.000Z',
      'checkin-9'
    );
  });
});
