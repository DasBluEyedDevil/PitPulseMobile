import express from 'express';
import request from 'supertest';
import { BadgeController } from '../../controllers/BadgeController';
import { FollowController } from '../../controllers/FollowController';
import { BadgeService } from '../../services/BadgeService';
import { FollowService } from '../../services/FollowService';

jest.mock('../../services/BadgeService', () => ({
  BadgeService: jest.fn(),
}));

const USER_ID = '11111111-1111-4111-8111-111111111111';
const TARGET_ID = '22222222-2222-4222-8222-222222222222';

const errorHandler: express.ErrorRequestHandler = (error, _req, res, _next) => {
  const status = error.statusCode ?? error.status ?? 500;
  res.status(status).json({ error: error.message });
};

describe('BadgeController mobile contract', () => {
  let service: jest.Mocked<BadgeService>;

  const createApp = (user?: { id: string }) => {
    const controller = new BadgeController();
    (controller as any).badgeService = service;

    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      (req as any).user = user;
      next();
    });
    app.get('/badges', controller.getAllBadges);
    app.get('/badges/user/:userId', controller.getUserBadges);
    app.get('/badges/my-badges', controller.getMyBadges);
    app.post('/badges/check-awards', controller.checkAndAwardBadges);
    app.get('/badges/rarity', controller.getBadgeRarity);
    app.get('/badges/leaderboard', controller.getBadgeLeaderboard);
    app.get('/badges/my-progress', controller.getMyBadgeProgress);
    app.get('/badges/:id', controller.getBadgeById);
    return app;
  };

  beforeEach(() => {
    service = {
      getAllBadges: jest.fn(),
      getUserBadges: jest.fn(),
      checkAndAwardBadges: jest.fn(),
      getBadgeRarity: jest.fn(),
      getBadgeLeaderboard: jest.fn(),
      getUserBadgeProgress: jest.fn(),
      getBadgeById: jest.fn(),
    } as unknown as jest.Mocked<BadgeService>;
  });

  it('returns the badge catalog', async () => {
    service.getAllBadges.mockResolvedValue([{ id: 'badge-1' }] as any);

    const response = await request(createApp()).get('/badges');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, data: [{ id: 'badge-1' }] });
  });

  it('returns the canonical badge catalog failure', async () => {
    service.getAllBadges.mockRejectedValue(new Error('database offline'));

    const response = await request(createApp()).get('/badges');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ success: false, error: 'Failed to fetch badges' });
  });

  it('loads a public user badge collection', async () => {
    service.getUserBadges.mockResolvedValue([{ id: 'earned-1' }] as any);

    const response = await request(createApp()).get(`/badges/user/${TARGET_ID}`);

    expect(service.getUserBadges).toHaveBeenCalledWith(TARGET_ID);
    expect(response.body).toEqual({ success: true, data: [{ id: 'earned-1' }] });
  });

  it('requires authentication for the current-user badge collection', async () => {
    const response = await request(createApp()).get('/badges/my-badges');

    expect(response.status).toBe(401);
    expect(service.getUserBadges).not.toHaveBeenCalled();
  });

  it('loads the authenticated user badge collection', async () => {
    service.getUserBadges.mockResolvedValue([] as any);

    const response = await request(createApp({ id: USER_ID })).get('/badges/my-badges');

    expect(response.status).toBe(200);
    expect(service.getUserBadges).toHaveBeenCalledWith(USER_ID);
  });

  it.each([
    [[], 'No new badges earned at this time'],
    [[{ id: 'one' }], 'Congratulations! You earned 1 new badge!'],
    [[{ id: 'one' }, { id: 'two' }], 'Congratulations! You earned 2 new badges!'],
  ])('reports newly awarded badges and grammar', async (badges, message) => {
    service.checkAndAwardBadges.mockResolvedValue(badges as any);

    const response = await request(createApp({ id: USER_ID })).post('/badges/check-awards');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: { newBadges: badges, count: badges.length },
      message,
    });
  });

  it('requires authentication before evaluating badge awards', async () => {
    const response = await request(createApp()).post('/badges/check-awards');

    expect(response.status).toBe(401);
    expect(service.checkAndAwardBadges).not.toHaveBeenCalled();
  });

  it('returns rarity data', async () => {
    service.getBadgeRarity.mockResolvedValue([{ id: 'badge-1', rarity: 0.1 }] as any);

    const response = await request(createApp()).get('/badges/rarity');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([{ id: 'badge-1', rarity: 0.1 }]);
  });

  it.each([
    ['', 20],
    ['?limit=7', 7],
  ])('normalizes leaderboard limit %s', async (query, expected) => {
    service.getBadgeLeaderboard.mockResolvedValue([] as any);

    const response = await request(createApp()).get(`/badges/leaderboard${query}`);

    expect(response.status).toBe(200);
    expect(service.getBadgeLeaderboard).toHaveBeenCalledWith(expected);
  });

  it('requires authentication before loading badge progress', async () => {
    const response = await request(createApp()).get('/badges/my-progress');

    expect(response.status).toBe(401);
    expect(service.getUserBadgeProgress).not.toHaveBeenCalled();
  });

  it('loads authenticated badge progress', async () => {
    service.getUserBadgeProgress.mockResolvedValue([{ badgeId: 'badge-1', progress: 2 }] as any);

    const response = await request(createApp({ id: USER_ID })).get('/badges/my-progress');

    expect(response.status).toBe(200);
    expect(service.getUserBadgeProgress).toHaveBeenCalledWith(USER_ID);
  });

  it('returns a badge by ID or a canonical not-found response', async () => {
    service.getBadgeById
      .mockResolvedValueOnce({ id: 'badge-1' } as any)
      .mockResolvedValueOnce(null);

    const found = await request(createApp()).get('/badges/badge-1');
    const missing = await request(createApp()).get('/badges/missing');

    expect(found.status).toBe(200);
    expect(found.body.data).toEqual({ id: 'badge-1' });
    expect(missing.status).toBe(404);
    expect(missing.body).toEqual({ success: false, error: 'Badge not found' });
  });

  it.each([
    ['getUserBadges', `/badges/user/${TARGET_ID}`, 'Failed to fetch user badges'],
    ['getBadgeRarity', '/badges/rarity', 'Failed to fetch badge rarity'],
    ['getBadgeLeaderboard', '/badges/leaderboard', 'Failed to fetch badge leaderboard'],
    ['getBadgeById', '/badges/badge-1', 'Failed to fetch badge'],
  ])('maps %s failures to a sanitized 500 response', async (method, path, expectedError) => {
    (service[method as keyof BadgeService] as jest.Mock).mockRejectedValue(new Error('sensitive'));

    const response = await request(createApp()).get(path);

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ success: false, error: expectedError });
  });
});

describe('FollowController mobile contract', () => {
  let service: jest.Mocked<FollowService>;

  const createApp = (user?: { id: string }) => {
    const controller = new FollowController(service);
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      (req as any).user = user;
      next();
    });
    app.post('/follow/:userId', controller.followUser);
    app.delete('/follow/:userId', controller.unfollowUser);
    app.get('/follow/:userId/status', controller.getFollowStatus);
    app.get('/users/:userId/followers', controller.getFollowers);
    app.get('/users/:userId/following', controller.getFollowing);
    app.use(errorHandler);
    return app;
  };

  beforeEach(() => {
    service = {
      followUser: jest.fn(),
      unfollowUser: jest.fn(),
      isFollowing: jest.fn(),
      getFollowers: jest.fn(),
      getFollowing: jest.fn(),
    } as unknown as jest.Mocked<FollowService>;
  });

  it('requires authentication before following or unfollowing', async () => {
    const follow = await request(createApp()).post(`/follow/${TARGET_ID}`);
    const unfollow = await request(createApp()).delete(`/follow/${TARGET_ID}`);

    expect(follow.status).toBe(401);
    expect(unfollow.status).toBe(401);
    expect(service.followUser).not.toHaveBeenCalled();
    expect(service.unfollowUser).not.toHaveBeenCalled();
  });

  it('rejects malformed and self-follow targets', async () => {
    const malformed = await request(createApp({ id: USER_ID })).post('/follow/not-a-uuid');
    const self = await request(createApp({ id: USER_ID })).post(`/follow/${USER_ID}`);

    expect(malformed.status).toBe(400);
    expect(self.status).toBe(400);
    expect(service.followUser).not.toHaveBeenCalled();
  });

  it('creates and deletes a follow relationship', async () => {
    service.followUser.mockResolvedValue({ followerId: USER_ID, followingId: TARGET_ID } as any);
    service.unfollowUser.mockResolvedValue({ success: true } as any);

    const follow = await request(createApp({ id: USER_ID })).post(`/follow/${TARGET_ID}`);
    const unfollow = await request(createApp({ id: USER_ID })).delete(`/follow/${TARGET_ID}`);

    expect(follow.status).toBe(201);
    expect(unfollow.status).toBe(200);
    expect(service.followUser).toHaveBeenCalledWith(USER_ID, TARGET_ID);
    expect(service.unfollowUser).toHaveBeenCalledWith(USER_ID, TARGET_ID);
  });

  it('validates an unfollow target before invoking the service', async () => {
    const response = await request(createApp({ id: USER_ID })).delete('/follow/not-a-uuid');

    expect(response.status).toBe(400);
    expect(service.unfollowUser).not.toHaveBeenCalled();
  });

  it('returns follow status for an authenticated user', async () => {
    service.isFollowing.mockResolvedValue(true);

    const response = await request(createApp({ id: USER_ID })).get(`/follow/${TARGET_ID}/status`);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ isFollowing: true, userId: TARGET_ID });
  });

  it.each([
    ['/follow/not-a-uuid/status', 400],
    [`/follow/${TARGET_ID}/status`, 401],
  ])('rejects an invalid follow-status request %s', async (path, status) => {
    const user = status === 401 ? undefined : { id: USER_ID };
    const response = await request(createApp(user)).get(path);

    expect(response.status).toBe(status);
    expect(service.isFollowing).not.toHaveBeenCalled();
  });

  it('normalizes follower pagination and returns the page', async () => {
    service.getFollowers.mockResolvedValue({ users: [], total: 0 } as any);

    const response = await request(createApp()).get(
      `/users/${TARGET_ID}/followers?page=-3&limit=999`
    );

    expect(response.status).toBe(200);
    expect(service.getFollowers).toHaveBeenCalledWith(TARGET_ID, { page: 1, limit: 100 });
  });

  it('returns not found when the follower owner does not exist', async () => {
    service.getFollowers.mockResolvedValue(null);

    const response = await request(createApp()).get(`/users/${TARGET_ID}/followers`);

    expect(response.status).toBe(404);
  });

  it('normalizes following pagination and returns the page', async () => {
    service.getFollowing.mockResolvedValue({ users: [], total: 0 } as any);

    const response = await request(createApp()).get(`/users/${TARGET_ID}/following?page=2&limit=0`);

    expect(response.status).toBe(200);
    expect(service.getFollowing).toHaveBeenCalledWith(TARGET_ID, { page: 2, limit: 20 });
  });

  it('validates list targets and maps a missing following owner', async () => {
    service.getFollowing.mockResolvedValue(null);

    const invalidFollowers = await request(createApp()).get('/users/not-a-uuid/followers');
    const invalidFollowing = await request(createApp()).get('/users/not-a-uuid/following');
    const missing = await request(createApp()).get(`/users/${TARGET_ID}/following`);

    expect(invalidFollowers.status).toBe(400);
    expect(invalidFollowing.status).toBe(400);
    expect(missing.status).toBe(404);
  });
});
