import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import Database from '../../config/database';
import { CheckinToastService } from '../../services/checkin/CheckinToastService';

jest.mock('../../config/database');
jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

const mockDb = {
  query: jest.fn<(...args: unknown[]) => Promise<any>>(),
};

(Database.getInstance as jest.Mock).mockReturnValue(mockDb);

describe('CheckinToastService visibility enforcement', () => {
  const checkinId = '550e8400-e29b-41d4-a716-446655440000';
  const viewerId = '550e8400-e29b-41d4-a716-446655440001';
  const ownerId = '550e8400-e29b-41d4-a716-446655440002';
  let service: CheckinToastService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.query.mockReset();
    service = new CheckinToastService();
  });

  it('rejects toast creation before insert when the check-in is hidden or blocked', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [] });

    await expect(service.toastCheckin(viewerId, checkinId)).rejects.toMatchObject({
      statusCode: 404,
    });

    expect(mockDb.query).toHaveBeenCalledTimes(1);
    expect(mockDb.query.mock.calls[0][0]).toContain('user_blocks');
    expect(mockDb.query.mock.calls[0][0]).toContain('c.is_hidden IS NOT TRUE');
  });

  it('checks visibility before returning comments', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: [{ user_id: ownerId }] })
      .mockResolvedValueOnce({ rows: [] });

    await service.getComments(checkinId, viewerId);

    expect(mockDb.query).toHaveBeenCalledTimes(2);
    expect(mockDb.query.mock.calls[0][0]).toContain('user_blocks');
    expect(mockDb.query.mock.calls[1][0]).toContain('FROM checkin_comments');
  });

  it('checks visibility before inserting comments and returns the check-in owner', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: [{ user_id: ownerId }] })
      .mockResolvedValueOnce({ rows: [{ id: 'comment-1' }] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'comment-1',
            checkin_id: checkinId,
            user_id: viewerId,
            content: 'Great show',
            created_at: new Date('2026-05-26T00:00:00Z'),
            username: 'viewer',
            profile_image_url: null,
          },
        ],
      });

    const comment = await service.addComment(viewerId, checkinId, 'Great show');

    expect(comment.ownerId).toBe(ownerId);
    expect(mockDb.query.mock.calls[0][0]).toContain('user_blocks');
  });
});
