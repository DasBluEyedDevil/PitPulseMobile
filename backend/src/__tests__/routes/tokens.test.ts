import { describe, it, expect, beforeEach, beforeAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

/**
 * Token routes — split refresh tokens (selector.verifier).
 */

const mockQuery = jest.fn();
const mockGetClient = jest.fn();
const mockClientQuery = jest.fn();
const mockClientRelease = jest.fn();

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    getInstance: () => ({
      query: mockQuery,
      getClient: mockGetClient,
    }),
  },
}));

const mockFindById = jest.fn();

jest.mock('../../services/UserService', () => ({
  UserService: jest.fn().mockImplementation(() => ({
    findById: mockFindById,
  })),
}));

jest.mock('../../middleware/auth', () => ({
  rateLimit: () => (_req: any, _res: any, next: any) => next(),
  authenticate: jest.fn((_req, _res, next) => next()),
}));

jest.mock('../../services/AuditService', () => ({
  AuditService: jest.fn().mockImplementation(() => ({
    logLogout: jest.fn().mockResolvedValue(undefined),
  })),
}));

import tokenRoutes from '../../routes/tokenRoutes';

describe('Token Routes', () => {
  let app: express.Express;

  let validRefreshToken: string;
  let validTokenHash: string;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    isVerified: true,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  beforeAll(async () => {
    const selector = crypto.randomBytes(16).toString('hex');
    const verifier = crypto.randomBytes(32).toString('hex');
    validRefreshToken = `${selector}.${verifier}`;
    validTokenHash = await bcrypt.hash(verifier, 10);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockFindById.mockClear();

    app = express();
    app.use(express.json());
    app.use('/api/tokens', tokenRoutes);

    mockGetClient.mockResolvedValue({
      query: mockClientQuery,
      release: mockClientRelease,
    });
  });

  describe('POST /api/tokens/refresh', () => {
    it('should refresh tokens successfully with valid refresh token', async () => {
      mockClientQuery
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ id: 'tid', token_hash: validTokenHash, user_id: mockUser.id }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rows: [{ user_id: mockUser.id }], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [
            {
              id: mockUser.id,
              email: mockUser.email,
              username: mockUser.username,
              is_active: true,
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const response = await request(app)
        .post('/api/tokens/refresh')
        .send({ refreshToken: validRefreshToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');

      expect(mockGetClient).toHaveBeenCalled();
      expect(mockClientQuery).toHaveBeenCalledWith('BEGIN');
      expect(mockClientQuery).toHaveBeenCalledWith('COMMIT');
      expect(mockClientRelease).toHaveBeenCalled();
    });

    it('should return 400 when refresh token is missing', async () => {
      const response = await request(app).post('/api/tokens/refresh').send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Refresh token required');
    });

    it('should return 400 when refresh token has invalid format', async () => {
      const response = await request(app).post('/api/tokens/refresh').send({ refreshToken: 12345 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid refresh token format');
    });

    it('should return 401 when refresh token is invalid or expired', async () => {
      mockClientQuery
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      const response = await request(app)
        .post('/api/tokens/refresh')
        .send({ refreshToken: validRefreshToken });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid or expired refresh token');
    });

    it('should return 401 when user not found', async () => {
      mockClientQuery
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ id: 'tid', user_id: mockUser.id, token_hash: validTokenHash }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rows: [{ user_id: mockUser.id }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      const response = await request(app)
        .post('/api/tokens/refresh')
        .send({ refreshToken: validRefreshToken });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('User not found or inactive');
    });

    it('should return 401 when user is inactive', async () => {
      mockClientQuery
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ id: 'tid', user_id: mockUser.id, token_hash: validTokenHash }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rows: [{ user_id: mockUser.id }], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [
            {
              id: mockUser.id,
              email: mockUser.email,
              username: mockUser.username,
              is_active: false,
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      const response = await request(app)
        .post('/api/tokens/refresh')
        .send({ refreshToken: validRefreshToken });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('User not found or inactive');
    });

    it('should rollback transaction on error and return 500', async () => {
      mockClientQuery.mockResolvedValueOnce({ rows: [] });
      mockClientQuery.mockRejectedValueOnce(new Error('Database error'));
      mockClientQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/tokens/refresh')
        .send({ refreshToken: validRefreshToken });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Token refresh failed');

      expect(mockClientQuery).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClientRelease).toHaveBeenCalled();
    });

    it('should handle general errors gracefully', async () => {
      mockGetClient.mockRejectedValueOnce(new Error('Connection error'));

      const response = await request(app)
        .post('/api/tokens/refresh')
        .send({ refreshToken: validRefreshToken });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Token refresh failed');
    });
  });

  describe('POST /api/tokens/revoke', () => {
    it('should revoke token successfully', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'tid', user_id: 'test-user-id', token_hash: validTokenHash }],
        rowCount: 1,
      });
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'tid', token_hash: validTokenHash, user_id: 'test-user-id' }],
        rowCount: 1,
      });
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const response = await request(app)
        .post('/api/tokens/revoke')
        .send({ refreshToken: validRefreshToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Token revoked');
    });

    it('should return success even when token does not exist (idempotent)', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await request(app)
        .post('/api/tokens/revoke')
        .send({ refreshToken: validRefreshToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return success when no token provided (idempotent)', async () => {
      const response = await request(app).post('/api/tokens/revoke').send({});

      expect(response.status).toBe(200);
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should ignore non-string token values', async () => {
      const response = await request(app).post('/api/tokens/revoke').send({ refreshToken: 12345 });

      expect(response.status).toBe(200);
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database connection error'));

      const response = await request(app)
        .post('/api/tokens/revoke')
        .send({ refreshToken: validRefreshToken });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Token revocation failed');
    });
  });

  describe('Token Rotation Security', () => {
    it('should use database transaction for token rotation', async () => {
      mockClientQuery.mockReset();
      mockClientRelease.mockReset();
      mockGetClient.mockReset();
      mockGetClient.mockResolvedValue({
        query: mockClientQuery,
        release: mockClientRelease,
      });

      mockClientQuery
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ id: 'tid', token_hash: validTokenHash, user_id: mockUser.id }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rows: [{ user_id: mockUser.id }], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [
            {
              id: mockUser.id,
              email: mockUser.email,
              username: mockUser.username,
              is_active: true,
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const response = await request(app)
        .post('/api/tokens/refresh')
        .send({ refreshToken: validRefreshToken });

      expect(response.status).toBe(200);
      expect(mockClientQuery).toHaveBeenCalledWith('BEGIN');
      expect(mockClientQuery).toHaveBeenCalledWith('COMMIT');
      expect(mockClientRelease).toHaveBeenCalled();
    });

    it('should ensure client is always released even on error', async () => {
      mockClientQuery.mockReset();
      mockClientRelease.mockReset();
      mockGetClient.mockReset();
      mockGetClient.mockResolvedValue({
        query: mockClientQuery,
        release: mockClientRelease,
      });

      mockClientQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockRejectedValueOnce(new Error('DB Error'))
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/tokens/refresh')
        .send({ refreshToken: validRefreshToken });

      expect(response.status).toBe(500);
      expect(mockClientRelease).toHaveBeenCalled();
    });
  });
});
