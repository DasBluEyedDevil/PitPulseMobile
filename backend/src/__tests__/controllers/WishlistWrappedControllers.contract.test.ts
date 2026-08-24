import express from 'express';
import fs from 'fs';
import request from 'supertest';
import { WishlistController } from '../../controllers/WishlistController';
import { WrappedController } from '../../controllers/WrappedController';
import { requirePremium } from '../../middleware/auth';

jest.mock('../../services/WrappedService', () => ({ WrappedService: jest.fn() }));
jest.mock('../../services/ShareCardService', () => ({ ShareCardService: jest.fn() }));

type User = { id: string; username?: string; isPremium?: boolean };
const realReadFileSync = fs.readFileSync.bind(fs);

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

describe('WishlistController authenticated mobile contract', () => {
  const bandId = '11111111-1111-4111-8111-111111111111';
  const wishlistId = '22222222-2222-4222-8222-222222222222';
  let wishlistService: Record<string, jest.Mock>;

  const createApp = (user?: User) => {
    const controller = new WishlistController(wishlistService as any);
    return appFor(user, (app) => {
      app.post('/wishlist', controller.addToWishlist);
      app.get('/wishlist/status', controller.getWishlistStatus);
      app.patch('/wishlist/:bandId/notify', controller.updateNotificationPreference);
      app.delete('/wishlist/:wishlistId', controller.removeFromWishlistById);
      app.delete('/wishlist', controller.removeFromWishlistByBandId);
      app.get('/wishlist', controller.getWishlist);
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    wishlistService = {
      addToWishlist: jest.fn(),
      removeFromWishlistById: jest.fn(),
      removeFromWishlistByBandId: jest.fn(),
      getWishlist: jest.fn(),
      isWishlisted: jest.fn(),
      updateNotificationPreference: jest.fn(),
    };
  });

  it.each([
    ['post', '/wishlist'],
    ['delete', `/wishlist/${wishlistId}`],
    ['delete', `/wishlist?bandId=${bandId}`],
    ['get', '/wishlist'],
    ['get', `/wishlist/status?bandId=${bandId}`],
    ['patch', `/wishlist/${bandId}/notify`],
  ])('requires authentication for %s %s', async (verb, path) => {
    const call = request(createApp())[verb as 'get'](path);
    const response = verb === 'patch' ? await call.send({ notifyWhenNearby: true }) : await call;
    expect(response.status).toBe(401);
  });

  it.each([
    [{}, 'bandId is required'],
    [{ bandId: 'not-a-uuid' }, 'Invalid band ID format'],
  ])('rejects an invalid add body %#', async (body, message) => {
    const response = await request(createApp({ id: 'user-1' }))
      .post('/wishlist')
      .send(body);
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: message });
    expect(wishlistService.addToWishlist).not.toHaveBeenCalled();
  });

  it.each([
    [{ bandId }, true],
    [{ bandId, notifyWhenNearby: false }, false],
  ])('adds a valid band with notification preference %#', async (body, expectedPreference) => {
    const item = { id: wishlistId, bandId, notifyWhenNearby: expectedPreference };
    wishlistService.addToWishlist.mockResolvedValue(item);

    const response = await request(createApp({ id: 'user-1' }))
      .post('/wishlist')
      .send(body);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: item,
      message: 'Successfully added to wishlist',
    });
    expect(wishlistService.addToWishlist).toHaveBeenCalledWith(
      'user-1',
      bandId,
      expectedPreference
    );
  });

  it('rejects a malformed wishlist item ID before removal', async () => {
    const response = await request(createApp({ id: 'user-1' })).delete('/wishlist/not-a-uuid');
    expect(response.status).toBe(400);
    expect(wishlistService.removeFromWishlistById).not.toHaveBeenCalled();
  });

  it('removes a wishlist item by its canonical ID', async () => {
    wishlistService.removeFromWishlistById.mockResolvedValue({ removed: true });
    const response = await request(createApp({ id: 'user-1' })).delete(`/wishlist/${wishlistId}`);
    expect(response.status).toBe(200);
    expect(wishlistService.removeFromWishlistById).toHaveBeenCalledWith('user-1', wishlistId);
  });

  it.each([
    ['/wishlist', 'bandId query parameter is required'],
    ['/wishlist?bandId=not-a-uuid', 'Invalid band ID format'],
  ])('rejects invalid band removal query %s', async (path, message) => {
    const response = await request(createApp({ id: 'user-1' })).delete(path);
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: message });
    expect(wishlistService.removeFromWishlistByBandId).not.toHaveBeenCalled();
  });

  it('removes a wishlist item by band ID', async () => {
    wishlistService.removeFromWishlistByBandId.mockResolvedValue({ removed: true });
    const response = await request(createApp({ id: 'user-1' })).delete(
      `/wishlist?bandId=${bandId}`
    );
    expect(response.status).toBe(200);
    expect(wishlistService.removeFromWishlistByBandId).toHaveBeenCalledWith('user-1', bandId);
  });

  it.each([
    ['bad', 'bad', 1, 20],
    ['0', '999', 1, 100],
    ['3', '5', 3, 5],
  ])(
    'normalizes wishlist paging page=%s limit=%s',
    async (page, limit, expectedPage, expectedLimit) => {
      const result = { items: [], page: expectedPage, limit: expectedLimit };
      wishlistService.getWishlist.mockResolvedValue(result);
      const response = await request(createApp({ id: 'user-1' })).get(
        `/wishlist?page=${page}&limit=${limit}`
      );
      expect(response.status).toBe(200);
      expect(wishlistService.getWishlist).toHaveBeenCalledWith('user-1', {
        page: expectedPage,
        limit: expectedLimit,
      });
    }
  );

  it.each([
    ['/wishlist/status', 'bandId query parameter is required'],
    ['/wishlist/status?bandId=not-a-uuid', 'Invalid band ID format'],
  ])('rejects invalid wishlist status query %s', async (path, message) => {
    const response = await request(createApp({ id: 'user-1' })).get(path);
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: message });
  });

  it.each([
    [null, false],
    [{ id: wishlistId, bandId }, true],
  ])('returns wishlist status for item %#', async (item, expected) => {
    wishlistService.isWishlisted.mockResolvedValue(item);
    const response = await request(createApp({ id: 'user-1' })).get(
      `/wishlist/status?bandId=${bandId}`
    );
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      isWishlisted: expected,
      bandId,
      ...(item ? { wishlistItem: item } : {}),
    });
  });

  it.each([
    ['not-a-uuid', { notifyWhenNearby: true }, 'Invalid band ID format'],
    [bandId, {}, 'notifyWhenNearby must be a boolean'],
    [bandId, { notifyWhenNearby: 'yes' }, 'notifyWhenNearby must be a boolean'],
  ])('rejects invalid notification update band=%s body=%#', async (id, body, message) => {
    const response = await request(createApp({ id: 'user-1' }))
      .patch(`/wishlist/${id}/notify`)
      .send(body);
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: message });
    expect(wishlistService.updateNotificationPreference).not.toHaveBeenCalled();
  });

  it('returns 404 when a notification preference target is absent', async () => {
    wishlistService.updateNotificationPreference.mockResolvedValue(null);
    const response = await request(createApp({ id: 'user-1' }))
      .patch(`/wishlist/${bandId}/notify`)
      .send({ notifyWhenNearby: false });
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Wishlist item not found' });
  });

  it('updates notification preference for a wishlisted band', async () => {
    const item = { id: wishlistId, bandId, notifyWhenNearby: false };
    wishlistService.updateNotificationPreference.mockResolvedValue(item);
    const response = await request(createApp({ id: 'user-1' }))
      .patch(`/wishlist/${bandId}/notify`)
      .send({ notifyWhenNearby: false });
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(item);
    expect(wishlistService.updateNotificationPreference).toHaveBeenCalledWith(
      'user-1',
      bandId,
      false
    );
  });
});

describe('WrappedController annual summary and sharing contract', () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  const year = 2026;
  const stats = {
    meetsThreshold: true,
    totalShows: 12,
    uniqueBands: 8,
    uniqueVenues: 5,
    topGenre: 'Rock',
    topGenrePercentage: 60,
    topArtistName: 'The Band',
    topArtistTimesSeen: 4,
    homeVenueName: 'The Hall',
    homeVenueVisits: 3,
  };
  let wrappedService: Record<string, jest.Mock>;
  let shareCardService: Record<string, jest.Mock>;
  let readFileSyncSpy: jest.SpyInstance;

  const createApp = (user?: User) => {
    const controller = new WrappedController({
      wrappedService: wrappedService as any,
      shareCardService: shareCardService as any,
    });
    return appFor(user, (app) => {
      app.get('/wrapped/:year', controller.getWrapped);
      app.get('/wrapped/:year/detail', requirePremium(), controller.getWrappedDetail);
      app.post('/wrapped/:year/card', controller.generateSummaryCard);
      app.post('/wrapped/:year/card/:statType', requirePremium(), controller.generateStatCard);
      app.get('/public/:userId/:year', controller.renderWrappedLanding);
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    readFileSyncSpy = jest.spyOn(fs, 'readFileSync');
    wrappedService = {
      getWrappedStats: jest.fn(),
      getWrappedDetailStats: jest.fn(),
    };
    shareCardService = {
      generateWrappedCard: jest.fn(),
      generateWrappedStatCard: jest.fn(),
    };
  });

  afterEach(() => {
    readFileSyncSpy.mockRestore();
  });

  it.each([
    ['/wrapped/2026', 'get'],
    ['/wrapped/2026/detail', 'get'],
    ['/wrapped/2026/card', 'post'],
    ['/wrapped/2026/card/top-artist', 'post'],
  ])('requires authentication for %s', async (path, verb) => {
    const response =
      verb === 'post'
        ? await request(createApp()).post(path)
        : await request(createApp()).get(path);
    expect(response.status).toBe(401);
  });

  it.each(['not-a-year', '2019', '2099'])('rejects wrapped year %s', async (invalidYear) => {
    const response = await request(createApp({ id: userId })).get(`/wrapped/${invalidYear}`);
    expect(response.status).toBe(400);
    expect(wrappedService.getWrappedStats).not.toHaveBeenCalled();
  });

  it('returns annual wrapped stats for the authenticated user', async () => {
    wrappedService.getWrappedStats.mockResolvedValue(stats);
    const response = await request(createApp({ id: userId })).get(`/wrapped/${year}`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, data: stats });
    expect(wrappedService.getWrappedStats).toHaveBeenCalledWith(userId, year);
  });

  it('rejects detailed annual wrapped stats without premium', async () => {
    const detail = { ...stats, shows: [{ id: 'checkin-1' }] };
    wrappedService.getWrappedDetailStats.mockResolvedValue(detail);
    const response = await request(createApp({ id: userId })).get(`/wrapped/${year}/detail`);
    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      success: false,
      error: { code: 'FORBIDDEN', message: 'SoundCheck Pro subscription required' },
    });
    expect(wrappedService.getWrappedDetailStats).not.toHaveBeenCalled();
  });

  it('rejects a summary card before the minimum activity threshold', async () => {
    wrappedService.getWrappedStats.mockResolvedValue({ ...stats, meetsThreshold: false });
    const response = await request(createApp({ id: userId })).post(`/wrapped/${year}/card`);
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Not enough check-ins for Wrapped' });
    expect(shareCardService.generateWrappedCard).not.toHaveBeenCalled();
  });

  it('generates a summary card with mobile display fallbacks', async () => {
    wrappedService.getWrappedStats.mockResolvedValue({
      ...stats,
      topGenre: null,
      topArtistName: null,
    });
    const urls = { imageUrl: 'https://cdn.example/card.png', shareUrl: 'https://example/card' };
    shareCardService.generateWrappedCard.mockResolvedValue(urls);

    const response = await request(createApp({ id: userId })).post(`/wrapped/${year}/card`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, data: urls });
    expect(shareCardService.generateWrappedCard).toHaveBeenCalledWith(userId, year, {
      username: 'unknown',
      year,
      totalShows: 12,
      uniqueBands: 8,
      uniqueVenues: 5,
      topGenre: 'Unknown',
      topArtist: 'Unknown',
    });
  });

  it('rejects an unsupported wrapped stat card type', async () => {
    const response = await request(createApp({ id: userId, isPremium: true })).post(
      `/wrapped/${year}/card/top-song`
    );
    expect(response.status).toBe(400);
    expect(shareCardService.generateWrappedStatCard).not.toHaveBeenCalled();
  });

  it.each([
    ['top-artist', '#1 Artist', 'The Band', 'Seen 4 times'],
    ['top-venue', '#1 Venue', 'The Hall', 'Visited 3 times'],
    ['top-genre', '#1 Genre', 'Rock', '60% of your shows'],
  ])('generates the %s stat card', async (statType, statLabel, statValue, statDetail) => {
    wrappedService.getWrappedStats.mockResolvedValue(stats);
    shareCardService.generateWrappedStatCard.mockResolvedValue({
      imageUrl: `https://cdn.example/${statType}.png`,
    });

    const response = await request(
      createApp({ id: userId, username: 'alice', isPremium: true })
    ).post(`/wrapped/${year}/card/${statType}`);

    expect(response.status).toBe(200);
    expect(shareCardService.generateWrappedStatCard).toHaveBeenCalledWith(userId, year, {
      username: 'alice',
      year,
      statType,
      statLabel,
      statValue,
      statDetail,
    });
  });

  it('rejects public landing requests with invalid user IDs or years without reading assets', async () => {
    await request(createApp()).get('/public/not-a-uuid/2026').expect(400);
    await request(createApp()).get(`/public/${userId}/2019`).expect(400);
    expect(
      readFileSyncSpy.mock.calls.some(([filePath]) =>
        String(filePath).endsWith('landing-page.html')
      )
    ).toBe(false);
  });

  it('renders the public landing template with escaped runtime URLs', async () => {
    const template =
      '<title>{{TITLE}}</title><meta name="description" content="{{DESCRIPTION}}">' +
      '<div>{{IMAGE_URL}}</div><a href="{{PAGE_URL}}">page</a>' +
      '<a href="{{APP_STORE_URL}}">ios</a><a href="{{PLAY_STORE_URL}}">android</a>';
    readFileSyncSpy.mockImplementation(((filePath: fs.PathOrFileDescriptor, ...args: any[]) => {
      if (String(filePath).endsWith('landing-page.html')) return template;
      return (realReadFileSync as any)(filePath, ...args);
    }) as any);
    const previous = {
      baseUrl: process.env.BASE_URL,
      appStoreUrl: process.env.APP_STORE_URL,
      playStoreUrl: process.env.PLAY_STORE_URL,
    };
    process.env.BASE_URL = 'https://example.com?a=1&b=2';
    process.env.APP_STORE_URL = 'https://apps.example/app?x=1&y=2';
    process.env.PLAY_STORE_URL = 'https://play.example/app?x=1&y=2';

    try {
      const response = await request(createApp()).get(`/public/${userId}/${year}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
      expect(response.text).toContain('SoundCheck Wrapped 2026');
      expect(response.text).toContain('https://example.com?a=1&amp;b=2/wrapped/');
      expect(response.text).toContain('https://apps.example/app?x=1&amp;y=2');
      expect(response.text).toContain('https://play.example/app?x=1&amp;y=2');
      expect(response.text).not.toContain('{{');
    } finally {
      if (previous.baseUrl === undefined) delete process.env.BASE_URL;
      else process.env.BASE_URL = previous.baseUrl;
      if (previous.appStoreUrl === undefined) delete process.env.APP_STORE_URL;
      else process.env.APP_STORE_URL = previous.appStoreUrl;
      if (previous.playStoreUrl === undefined) delete process.env.PLAY_STORE_URL;
      else process.env.PLAY_STORE_URL = previous.playStoreUrl;
    }
  });
});
