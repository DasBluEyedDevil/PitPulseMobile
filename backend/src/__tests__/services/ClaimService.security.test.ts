import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import Database from '../../config/database';
import { ClaimService } from '../../services/ClaimService';

jest.mock('../../config/database');

const mockDb = {
  query: jest.fn<(...args: unknown[]) => Promise<any>>(),
};

(Database.getInstance as jest.Mock).mockReturnValue(mockDb);

describe('ClaimService authorization filters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('scopes non-admin claim reads to the requesting owner', async () => {
    mockDb.query.mockResolvedValueOnce({
      rows: [
        {
          id: 'claim-1',
          user_id: 'user-1',
          entity_type: 'venue',
          entity_id: 'venue-1',
          status: 'pending',
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-02T00:00:00.000Z',
        },
      ],
    });

    const service = new ClaimService();
    await service.getClaimById('claim-1', { requestingUserId: 'user-1' });

    expect(mockDb.query).toHaveBeenCalledWith(expect.stringContaining('AND vc.user_id = $2'), [
      'claim-1',
      'user-1',
    ]);
  });

  it('does not add the owner filter for admin claim reads', async () => {
    mockDb.query.mockResolvedValueOnce({
      rows: [
        {
          id: 'claim-1',
          user_id: 'user-1',
          entity_type: 'venue',
          entity_id: 'venue-1',
          status: 'pending',
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-02T00:00:00.000Z',
        },
      ],
    });

    const service = new ClaimService();
    await service.getClaimById('claim-1', {
      requestingUserId: 'admin-1',
      isAdmin: true,
    });

    const [query, params] = mockDb.query.mock.calls[0];
    expect(query).not.toContain('AND vc.user_id = $2');
    expect(params).toEqual(['claim-1']);
  });
});
