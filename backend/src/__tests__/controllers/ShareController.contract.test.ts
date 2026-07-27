import express from 'express';
import request from 'supertest';
import { ShareController } from '../../controllers/ShareController';

jest.mock('../../services/ShareCardService', () => ({
  ShareCardService: jest.fn(),
}));
jest.mock('../../services/CheckinService', () => ({
  CheckinService: jest.fn(),
}));
jest.mock('../../services/BadgeService', () => ({
  BadgeService: jest.fn(),
}));

type ShareCardDependencies = ConstructorParameters<typeof ShareController>[0];

describe('ShareController mobile and public contracts', () => {
  const shareCardService = {
    generateCheckinCard: jest.fn(),
    generateBadgeCard: jest.fn(),
  };
  const checkinService = {
    getCheckinById: jest.fn(),
  };
  const badgeService = {
    getUserBadges: jest.fn(),
  };

  const createApp = (user?: { id: string; username?: string }) => {
    const controller = new ShareController({
      shareCardService,
      checkinService,
      badgeService,
    } as unknown as ShareCardDependencies);
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      (req as any).user = user;
      next();
    });
    app.post('/checkin/:checkinId', controller.generateCheckinCard);
    app.post('/badge/:badgeAwardId', controller.generateBadgeCard);
    app.get('/c/:checkinId', controller.renderCheckinLanding);
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
  });

  it('requires authentication before generating a check-in card', async () => {
    const response = await request(createApp()).post('/checkin/checkin-1');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Authentication required' });
    expect(checkinService.getCheckinById).not.toHaveBeenCalled();
  });

  it('returns not found when a requested check-in is not visible to the user', async () => {
    checkinService.getCheckinById.mockResolvedValue(null);

    const response = await request(createApp({ id: 'user-1' })).post('/checkin/missing');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Check-in not found' });
    expect(checkinService.getCheckinById).toHaveBeenCalledWith('missing', 'user-1');
    expect(shareCardService.generateCheckinCard).not.toHaveBeenCalled();
  });

  it('maps a visible check-in into stable card data and returns both mobile variants', async () => {
    checkinService.getCheckinById.mockResolvedValue({
      id: 'checkin-1',
      rating: 5,
      eventDate: new Date('2026-07-26T20:00:00.000Z'),
      user: { username: 'alice' },
      band: { name: 'The Tests', imageUrl: 'https://images.example/band.png' },
      venue: { name: 'The Hall', city: 'Boston' },
    });
    shareCardService.generateCheckinCard.mockResolvedValue({
      ogUrl: 'https://cdn.example/checkin-og.png',
      storiesUrl: 'https://cdn.example/checkin-stories.png',
    });

    const response = await request(createApp({ id: 'user-1' })).post('/checkin/checkin-1');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: {
        ogUrl: 'https://cdn.example/checkin-og.png',
        storiesUrl: 'https://cdn.example/checkin-stories.png',
      },
    });
    expect(shareCardService.generateCheckinCard).toHaveBeenCalledWith(
      'checkin-1',
      expect.objectContaining({
        username: 'alice',
        bandName: 'The Tests',
        venueName: 'The Hall',
        venueCity: 'Boston',
        rating: 5,
        bandImageUrl: 'https://images.example/band.png',
      })
    );
  });

  it('does not allow one user to generate a card for another user badge award', async () => {
    badgeService.getUserBadges.mockResolvedValue([]);

    const response = await request(createApp({ id: 'user-1', username: 'alice' })).post(
      '/badge/award-2'
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Badge award not found' });
    expect(badgeService.getUserBadges).toHaveBeenCalledWith('user-1');
    expect(shareCardService.generateBadgeCard).not.toHaveBeenCalled();
  });

  it('returns not found when a badge award has no badge definition', async () => {
    badgeService.getUserBadges.mockResolvedValue([
      {
        id: 'award-1',
        earnedAt: new Date('2026-07-26T12:00:00.000Z'),
      },
    ]);

    const response = await request(createApp({ id: 'user-1', username: 'alice' })).post(
      '/badge/award-1'
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Badge data not found' });
    expect(shareCardService.generateBadgeCard).not.toHaveBeenCalled();
  });

  it('generates a badge card only from an award owned by the authenticated user', async () => {
    badgeService.getUserBadges.mockResolvedValue([
      {
        id: 'award-1',
        earnedAt: new Date('2026-07-26T12:00:00.000Z'),
        badge: {
          name: 'Night Owl',
          description: 'Checked in late',
          badgeType: 'time',
        },
      },
    ]);
    shareCardService.generateBadgeCard.mockResolvedValue({
      ogUrl: 'https://cdn.example/badge-og.png',
      storiesUrl: 'https://cdn.example/badge-stories.png',
    });

    const response = await request(createApp({ id: 'user-1', username: 'alice' })).post(
      '/badge/award-1'
    );

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      ogUrl: 'https://cdn.example/badge-og.png',
      storiesUrl: 'https://cdn.example/badge-stories.png',
    });
    expect(shareCardService.generateBadgeCard).toHaveBeenCalledWith(
      'award-1',
      expect.objectContaining({
        username: 'alice',
        badgeName: 'Night Owl',
        badgeDescription: 'Checked in late',
        badgeCategory: 'time',
      })
    );
  });

  it('serves a safe public landing page even when image generation is degraded', async () => {
    checkinService.getCheckinById.mockResolvedValue({
      id: 'checkin-1',
      user: { username: 'alice<script>alert(1)</script>' },
      band: { name: '<img src=x onerror=alert(1)>', imageUrl: undefined },
      venue: { name: 'Hall & Lounge', city: '"Boston"' },
      rating: 4,
    });
    shareCardService.generateCheckinCard.mockRejectedValue(new Error('storage unavailable'));

    const response = await request(createApp()).get('/c/checkin-1').set('Host', 'share.example');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.text).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(response.text).toContain('Hall &amp; Lounge');
    expect(response.text).not.toContain('<script>alert(1)</script>');
    expect(response.text).toContain('/share/c/checkin-1');
  });

  it('returns a standalone 404 page for a missing public check-in', async () => {
    checkinService.getCheckinById.mockResolvedValue(null);

    const response = await request(createApp()).get('/c/missing');

    expect(response.status).toBe(404);
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.text).toContain('Check-in not found');
    expect(shareCardService.generateCheckinCard).not.toHaveBeenCalled();
  });
});
