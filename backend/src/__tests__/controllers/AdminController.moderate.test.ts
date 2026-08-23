import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import { z } from 'zod';

const mockDbQuery = jest.fn<(...args: unknown[]) => Promise<any>>();
const mockRevokeAllUserTokens = jest.fn<(userId: string) => Promise<void>>();
const mockPublishToUser =
  jest.fn<(userId: string, type: string, payload: unknown) => Promise<boolean>>();
const mockDisconnectUser = jest.fn<(userId: string, reason?: string) => number>();

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    getInstance: () => ({
      query: (...args: unknown[]) => mockDbQuery(...args),
    }),
  },
}));

jest.mock('../../utils/auth', () => ({
  revokeAllUserTokens: (...args: unknown[]) => mockRevokeAllUserTokens(args[0] as string),
}));

jest.mock('../../services/RealtimePublisher', () => ({
  realtimePublisher: {
    publishToUser: (...args: unknown[]) =>
      mockPublishToUser(args[0] as string, args[1] as string, args[2]),
  },
}));

jest.mock('../../utils/websocket', () => ({
  getWebSocketStats: jest.fn(),
  disconnectUser: (...args: unknown[]) => mockDisconnectUser(args[0] as string, args[1] as string),
  WebSocketEvents: { DISCONNECTED: 'disconnected' },
}));

jest.mock('../../utils/cache', () => ({
  cache: { delPattern: jest.fn(), clear: jest.fn(), getStats: jest.fn() },
}));

import { validate } from '../../middleware/validate';
import adminController from '../../controllers/AdminController';

const targetId = z.string().uuid('targetId must be a valid UUID');
const moderateContentSchema = z.object({
  body: z.discriminatedUnion('action', [
    z.object({
      action: z.literal('ban_user'),
      targetType: z.literal('user'),
      targetId,
      reason: z.string().max(1000).optional(),
    }),
    z.object({
      action: z.literal('delete_venue'),
      targetType: z.literal('venue'),
      targetId,
      reason: z.string().max(1000).optional(),
    }),
  ]),
});

const ADMIN_ID = '99999999-9999-4999-8999-999999999999';
const USER_ID = '11111111-1111-4111-8111-111111111111';
const VENUE_ID = '44444444-4444-4444-8444-444444444444';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).user = {
      id: ADMIN_ID,
      email: 'admin@example.com',
      username: 'admin',
      isVerified: true,
      isActive: true,
      isAdmin: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    next();
  });
  app.post('/admin/moderate', validate(moderateContentSchema), adminController.moderateContent);
  return app;
}

describe('Admin moderate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDbQuery.mockReset();
    mockRevokeAllUserTokens.mockResolvedValue(undefined);
    mockPublishToUser.mockResolvedValue(true);
    mockDisconnectUser.mockReturnValue(1);
  });

  it('rejects missing fields, non-UUID targetId, and action/targetType mismatch', async () => {
    const app = createApp();

    const missing = await request(app).post('/admin/moderate').send({});
    expect(missing.status).toBe(400);
    expect(missing.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockDbQuery).not.toHaveBeenCalled();

    const badId = await request(app).post('/admin/moderate').send({
      action: 'ban_user',
      targetType: 'user',
      targetId: 'not-a-uuid',
    });
    expect(badId.status).toBe(400);
    expect(badId.body.error.code).toBe('VALIDATION_ERROR');

    const mismatch = await request(app).post('/admin/moderate').send({
      action: 'ban_user',
      targetType: 'venue',
      targetId: USER_ID,
    });
    expect(mismatch.status).toBe(400);
    expect(mismatch.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockRevokeAllUserTokens).not.toHaveBeenCalled();
  });

  it('bans a user by deactivating, revoking refresh tokens, and disconnecting sockets', async () => {
    mockDbQuery.mockResolvedValue({ rowCount: 1, rows: [] });
    const app = createApp();

    const response = await request(app).post('/admin/moderate').send({
      action: 'ban_user',
      targetType: 'user',
      targetId: USER_ID,
      reason: 'spam',
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(mockDbQuery).toHaveBeenCalledWith('UPDATE users SET is_active = false WHERE id = $1', [
      USER_ID,
    ]);
    expect(mockRevokeAllUserTokens).toHaveBeenCalledWith(USER_ID);
    expect(mockPublishToUser).toHaveBeenCalledWith(USER_ID, 'disconnected', {
      reason: 'account_banned',
    });
    expect(mockDisconnectUser).toHaveBeenCalledWith(USER_ID, 'account_banned');
  });

  it('deletes a venue with ownership SQL', async () => {
    mockDbQuery.mockResolvedValue({ rowCount: 1, rows: [] });
    const app = createApp();

    const response = await request(app).post('/admin/moderate').send({
      action: 'delete_venue',
      targetType: 'venue',
      targetId: VENUE_ID,
    });

    expect(response.status).toBe(200);
    const [query, params] = mockDbQuery.mock.calls[0];
    expect(query).toContain('UPDATE venues');
    expect(query).toContain('is_active = false');
    expect(query).toContain('claimed_by_user_id = $2 OR $3::boolean');
    expect(params).toEqual([VENUE_ID, ADMIN_ID, true]);
    expect(mockRevokeAllUserTokens).not.toHaveBeenCalled();
  });

  it('returns 404 when ownership SQL matches no venue', async () => {
    mockDbQuery.mockResolvedValue({ rowCount: 0, rows: [] });
    const app = createApp();

    const response = await request(app).post('/admin/moderate').send({
      action: 'delete_venue',
      targetType: 'venue',
      targetId: VENUE_ID,
    });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Venue not found' },
    });
  });
});
