import { describe, it, expect, beforeEach, afterAll, jest } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import { AdminController } from '../../controllers/AdminController';
import { cache } from '../../utils/cache';
import { getRedis } from '../../utils/redisRateLimiter';
import { QueueContracts } from '../../jobs/queueContracts';

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

jest.mock('../../utils/websocket', () => ({
  getWebSocketStats: jest.fn(),
}));

jest.mock('../../utils/redisRateLimiter', () => ({
  getRedis: jest.fn(),
}));

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), debug: jest.fn(), info: jest.fn() },
  logInfo: jest.fn(),
  logWarn: jest.fn(),
  logError: jest.fn(),
}));

const mockedGetRedis = getRedis as jest.MockedFunction<typeof getRedis>;

function appFor(): express.Express {
  const controller = new AdminController();
  const app = express();
  app.use(express.json());
  app.post('/admin/cache/clear', controller.clearCache);
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

describe('AdminController cache clear', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockedGetRedis.mockReturnValue(null);
    await cache.clear();
  });

  afterAll(async () => {
    await cache.close();
  });

  it('requires confirm:true for prefix-wide clear', async () => {
    const redis = {
      scan: jest.fn<() => Promise<[string, string[]]>>(),
      unlink: jest.fn<() => Promise<number>>(),
      flushdb: jest.fn<() => Promise<string>>(),
    } as any;
    mockedGetRedis.mockReturnValue(redis);

    const denied = await request(appFor()).post('/admin/cache/clear').send({});
    expect(denied.status).toBe(400);
    expect(denied.body.error).toMatch(/confirm: true/);
    expect(redis.scan).not.toHaveBeenCalled();
    expect(redis.flushdb).not.toHaveBeenCalled();

    redis.scan.mockResolvedValue(['0', ['cache:feed:one', 'bull:badge-eval:1']]);
    redis.unlink.mockResolvedValue(1);

    const allowed = await request(appFor()).post('/admin/cache/clear').send({ confirm: true });
    expect(allowed.status).toBe(200);
    expect(allowed.body.success).toBe(true);
    expect(redis.scan).toHaveBeenCalledWith('0', 'MATCH', 'cache:*', 'COUNT', 100);
    expect(redis.unlink).toHaveBeenCalledWith('cache:feed:one');
    expect(redis.flushdb).not.toHaveBeenCalled();
  });

  it('UNLINKs cache:feed:… for caller-shaped feed:* and rejects *', async () => {
    const redis = {
      scan: jest
        .fn<() => Promise<[string, string[]]>>()
        .mockResolvedValue(['0', ['cache:feed:friends:1']]),
      unlink: jest.fn<() => Promise<number>>().mockResolvedValue(1),
      flushdb: jest.fn<() => Promise<string>>(),
    } as any;
    mockedGetRedis.mockReturnValue(redis);

    const cleared = await request(appFor()).post('/admin/cache/clear').send({ pattern: 'feed:*' });

    expect(cleared.status).toBe(200);
    expect(redis.scan).toHaveBeenCalledWith('0', 'MATCH', 'cache:feed:*', 'COUNT', 100);
    expect(redis.unlink).toHaveBeenCalledWith('cache:feed:friends:1');
    expect(redis.flushdb).not.toHaveBeenCalled();

    redis.scan.mockClear();
    redis.unlink.mockClear();

    const rejected = await request(appFor()).post('/admin/cache/clear').send({ pattern: '*' });
    expect(rejected.status).toBe(400);
    expect(redis.scan).not.toHaveBeenCalled();
    expect(redis.flushdb).not.toHaveBeenCalled();
  });

  it('rejects rate_limit and BullMQ patterns', async () => {
    const redis = {
      scan: jest.fn<() => Promise<[string, string[]]>>(),
      unlink: jest.fn<() => Promise<number>>(),
      flushdb: jest.fn<() => Promise<string>>(),
    } as any;
    mockedGetRedis.mockReturnValue(redis);

    const rateLimit = await request(appFor())
      .post('/admin/cache/clear')
      .send({ pattern: 'rate_limit:*' });
    expect(rateLimit.status).toBe(400);

    const bull = await request(appFor()).post('/admin/cache/clear').send({ pattern: 'bull:*' });
    expect(bull.status).toBe(400);

    for (const contract of Object.values(QueueContracts)) {
      const response = await request(appFor())
        .post('/admin/cache/clear')
        .send({ pattern: `${contract.queueName}*` });
      expect(response.status).toBe(400);
    }

    expect(redis.scan).not.toHaveBeenCalled();
    expect(redis.flushdb).not.toHaveBeenCalled();
  });
});
