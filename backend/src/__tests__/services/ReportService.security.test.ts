import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ReportService } from '../../services/ReportService';

jest.mock('../../jobs/moderationQueue', () => ({
  moderationQueue: null,
}));

jest.mock('../../utils/logger', () => ({
  logInfo: jest.fn(),
}));

const mockDb = {
  query: jest.fn<(...args: unknown[]) => Promise<any>>(),
};

describe('ReportService visibility enforcement', () => {
  const reporterId = '550e8400-e29b-41d4-a716-446655440001';
  const contentId = '550e8400-e29b-41d4-a716-446655440002';
  const targetUserId = '550e8400-e29b-41d4-a716-446655440003';
  let service: ReportService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.query.mockReset();
    service = new ReportService(mockDb as any);
  });

  it('uses viewer-aware hidden and block checks before accepting check-in reports', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [] });

    await expect(
      service.createReport(reporterId, {
        contentType: 'checkin',
        contentId,
        reason: 'harassment',
      })
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(mockDb.query).toHaveBeenCalledTimes(1);
    expect(mockDb.query.mock.calls[0][0]).toContain('c.is_hidden IS NOT TRUE');
    expect(mockDb.query.mock.calls[0][0]).toContain('user_blocks');
  });

  it('creates a report after visible content is resolved', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: [{ user_id: targetUserId }] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'report-1',
            reporter_id: reporterId,
            content_type: 'checkin',
            content_id: contentId,
            target_user_id: targetUserId,
            reason: 'harassment',
            description: null,
            status: 'pending',
            created_at: '2026-05-26T00:00:00.000Z',
          },
        ],
      });

    const report = await service.createReport(reporterId, {
      contentType: 'checkin',
      contentId,
      reason: 'harassment',
    });

    expect(report.targetUserId).toBe(targetUserId);
    expect(mockDb.query.mock.calls[1][0]).toContain('INSERT INTO reports');
  });

  it('applies both check-in owner and comment author block filters for comment reports', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [] });

    await expect(
      service.createReport(reporterId, {
        contentType: 'comment',
        contentId,
        reason: 'harassment',
      })
    ).rejects.toMatchObject({ statusCode: 404 });

    const query = mockDb.query.mock.calls[0][0] as string;
    expect(query).toContain('INNER JOIN checkins c');
    expect(query).toContain('c.is_hidden IS NOT TRUE');
    expect(query).toContain('cc.is_hidden IS NOT TRUE');
    expect(query.match(/user_blocks/g)).toHaveLength(2);
  });
});
