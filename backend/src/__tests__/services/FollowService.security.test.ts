import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import Database from '../../config/database';
import { FollowService } from '../../services/FollowService';

jest.mock('../../config/database');
jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

const mockDb = {
  query: jest.fn<(...args: unknown[]) => Promise<any>>(),
};

(Database.getInstance as jest.Mock).mockReturnValue(mockDb);

describe('FollowService security behavior', () => {
  const followerId = '11111111-1111-4111-8111-111111111111';
  const followingId = '22222222-2222-4222-8222-222222222222';
  const notificationService = {
    createNotification: jest.fn<(...args: unknown[]) => Promise<void>>(),
  };
  const blockService = {
    isBlocked: jest.fn<(...args: unknown[]) => Promise<boolean>>(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects follow creation when either user has blocked the other', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [{ id: followingId }] });
    blockService.isBlocked.mockResolvedValueOnce(true);

    const service = new FollowService(notificationService as any, blockService as any);

    await expect(service.followUser(followerId, followingId)).rejects.toMatchObject({
      statusCode: 403,
    });

    expect(mockDb.query).toHaveBeenCalledTimes(1);
    expect(notificationService.createNotification).not.toHaveBeenCalled();
  });

  it('returns public followers without email, date of birth, admin, or premium fields', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: [{ id: followingId }] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: followerId,
            email: 'private@example.com',
            username: 'public_user',
            first_name: 'Public',
            last_name: 'User',
            bio: null,
            profile_image_url: null,
            location: null,
            date_of_birth: '1990-01-01',
            is_verified: true,
            is_active: true,
            is_admin: true,
            is_premium: true,
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-01-02T00:00:00.000Z',
            total_count: '1',
          },
        ],
      });

    const service = new FollowService(notificationService as any, blockService as any);
    const result = await service.getFollowers(followingId);

    expect(result?.users).toHaveLength(1);
    expect(result?.users[0]).toMatchObject({
      id: followerId,
      username: 'public_user',
      isVerified: true,
      isActive: true,
    });
    expect(result?.users[0]).not.toHaveProperty('email');
    expect(result?.users[0]).not.toHaveProperty('dateOfBirth');
    expect(result?.users[0]).not.toHaveProperty('isAdmin');
    expect(result?.users[0]).not.toHaveProperty('isPremium');
    expect(mockDb.query.mock.calls[1][0]).not.toContain('u.email');
    expect(mockDb.query.mock.calls[1][0]).not.toContain('u.date_of_birth');
  });
});
