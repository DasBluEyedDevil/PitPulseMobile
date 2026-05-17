import crypto from 'crypto';
import bcrypt from 'bcryptjs';

/**
 * Refresh token tests — split-token pattern (selector + bcrypt(verifier)).
 */

const mockQuery = jest.fn();
jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    getInstance: () => ({
      query: mockQuery,
    }),
  },
}));

import {
  consumeRefreshToken,
  generateRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  cleanupExpiredTokens,
} from '../../utils/auth';

function splitToken(raw: string): { selector: string; verifier: string } {
  const [selector, verifier] = raw.split('.');
  return { selector, verifier };
}

describe('Refresh Token System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateRefreshToken', () => {
    test('should generate selector.verifier format', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const token = await generateRefreshToken('user-123');

      expect(token.split('.').length).toBe(2);
      const { selector, verifier } = splitToken(token);
      expect(selector.length).toBe(32);
      expect(verifier.length).toBe(64);
    });

    test('should store bcrypt hash of verifier and selector column', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const token = await generateRefreshToken('user-123');
      const { verifier } = splitToken(token);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const [query, params] = mockQuery.mock.calls[0];

      expect(query).toContain('INSERT INTO refresh_tokens');
      expect(query).toContain('selector');
      expect(params[0]).toBe('user-123');
      expect(params[1]).toMatch(/^[a-f0-9]{32}$/);
      expect(params[2]).toMatch(/^\$2b\$/);
      expect(await bcrypt.compare(verifier, params[2])).toBe(true);

      const expiresAt = params[3] as Date;
      expect(expiresAt).toBeInstanceOf(Date);
    });

    test('should generate unique tokens for each call', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 1 });

      const token1 = await generateRefreshToken('user-1');
      const token2 = await generateRefreshToken('user-2');

      expect(token1).not.toBe(token2);
    });
  });

  describe('verifyRefreshToken', () => {
    test('should verify a valid refresh token', async () => {
      const userId = 'user-123';
      const selector = crypto.randomBytes(16).toString('hex');
      const verifier = crypto.randomBytes(32).toString('hex');
      const token = `${selector}.${verifier}`;
      const tokenHash = await bcrypt.hash(verifier, 10);

      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'token-1', user_id: userId, token_hash: tokenHash }],
        rowCount: 1,
      });

      const result = await verifyRefreshToken(token);

      expect(result.valid).toBe(true);
      expect(result.userId).toBe(userId);

      const [query, params] = mockQuery.mock.calls[0];
      expect(query).toContain('selector = $1');
      expect(params[0]).toBe(selector);
    });

    test('should reject legacy format without dot', async () => {
      const token = crypto.randomBytes(32).toString('hex');
      const result = await verifyRefreshToken(token);
      expect(result.valid).toBe(false);
      expect(mockQuery).not.toHaveBeenCalled();
    });

    test('should reject wrong verifier and revoke all user tokens', async () => {
      const userId = 'user-123';
      const selector = crypto.randomBytes(16).toString('hex');
      const verifier = crypto.randomBytes(32).toString('hex');
      const token = `${selector}.${verifier}`;
      const wrongHash = await bcrypt.hash('other', 10);

      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 't1', user_id: userId, token_hash: wrongHash }],
        rowCount: 1,
      });
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const result = await verifyRefreshToken(token);

      expect(result.valid).toBe(false);
      expect(mockQuery.mock.calls[1][0]).toContain('UPDATE refresh_tokens');
    });

    test('should reject when no row for selector', async () => {
      const selector = crypto.randomBytes(16).toString('hex');
      const verifier = crypto.randomBytes(32).toString('hex');
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await verifyRefreshToken(`${selector}.${verifier}`);
      expect(result.valid).toBe(false);
    });
  });

  describe('revokeRefreshToken', () => {
    test('should revoke when verifier matches', async () => {
      const selector = crypto.randomBytes(16).toString('hex');
      const verifier = crypto.randomBytes(32).toString('hex');
      const token = `${selector}.${verifier}`;
      const tokenHash = await bcrypt.hash(verifier, 10);

      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'token-1', token_hash: tokenHash, user_id: 'u1' }],
        rowCount: 1,
      });
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await revokeRefreshToken(token);

      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(mockQuery.mock.calls[1][0]).toContain('UPDATE refresh_tokens');
    });

    test('should not throw if token does not exist', async () => {
      const selector = crypto.randomBytes(16).toString('hex');
      const verifier = crypto.randomBytes(32).toString('hex');
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(revokeRefreshToken(`${selector}.${verifier}`)).resolves.not.toThrow();
    });
  });

  describe('revokeAllUserTokens', () => {
    test('should revoke all tokens for a user', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 5 });

      await revokeAllUserTokens('user-123');

      const [query, params] = mockQuery.mock.calls[0];
      expect(query).toContain('UPDATE refresh_tokens');
      expect(params[0]).toBe('user-123');
    });
  });

  describe('cleanupExpiredTokens', () => {
    test('should delete expired and old revoked tokens', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 15 });

      const deletedCount = await cleanupExpiredTokens();

      expect(deletedCount).toBe(15);
      const [query] = mockQuery.mock.calls[0];
      expect(query).toContain('DELETE FROM refresh_tokens');
    });
  });

  describe('Transaction Support', () => {
    test('generateRefreshToken should use provided client', async () => {
      const mockClient = { query: jest.fn().mockResolvedValue({ rows: [], rowCount: 1 }) };

      await generateRefreshToken('user-123', mockClient);

      expect(mockClient.query).toHaveBeenCalledTimes(1);
      expect(mockQuery).not.toHaveBeenCalled();
    });

    test('revokeRefreshToken should use provided client', async () => {
      const selector = crypto.randomBytes(16).toString('hex');
      const verifier = crypto.randomBytes(32).toString('hex');
      const token = `${selector}.${verifier}`;
      const tokenHash = await bcrypt.hash(verifier, 10);
      const mockClient = {
        query: jest
          .fn()
          .mockResolvedValueOnce({
            rows: [{ id: 'id1', token_hash: tokenHash, user_id: 'u1' }],
            rowCount: 1,
          })
          .mockResolvedValueOnce({ rows: [], rowCount: 1 }),
      };

      await revokeRefreshToken(token, mockClient);

      expect(mockClient.query).toHaveBeenCalledTimes(2);
    });

    test('consumeRefreshToken locks and revokes the token in one transaction', async () => {
      const selector = crypto.randomBytes(16).toString('hex');
      const verifier = crypto.randomBytes(32).toString('hex');
      const token = `${selector}.${verifier}`;
      const tokenHash = await bcrypt.hash(verifier, 10);
      const mockClient = {
        query: jest
          .fn()
          .mockResolvedValueOnce({
            rows: [{ id: 'id1', token_hash: tokenHash, user_id: 'u1' }],
            rowCount: 1,
          })
          .mockResolvedValueOnce({ rows: [{ user_id: 'u1' }], rowCount: 1 }),
      };

      const result = await consumeRefreshToken(token, mockClient);

      expect(result).toEqual({ valid: true, userId: 'u1' });
      expect(mockClient.query.mock.calls[0][0]).toContain('FOR UPDATE');
      expect(mockClient.query.mock.calls[1][0]).toContain('RETURNING user_id');
      expect(mockQuery).not.toHaveBeenCalled();
    });
  });
});
