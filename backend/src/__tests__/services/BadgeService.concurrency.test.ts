import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockQuery = jest.fn<(...args: any[]) => Promise<any>>();
const mockCreateNotification = jest.fn<(...args: any[]) => Promise<any>>();
const mockLogBadgeAwarded = jest.fn();
const mockPublishToUser = jest.fn<(...args: any[]) => Promise<boolean>>();
const mockSendToUser = jest.fn();

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    getInstance: () => ({
      query: mockQuery,
    }),
  },
}));

jest.mock('../../services/NotificationService', () => ({
  NotificationService: jest.fn().mockImplementation(() => ({
    createNotification: mockCreateNotification,
  })),
}));

jest.mock('../../services/AuditService', () => ({
  AuditService: jest.fn().mockImplementation(() => ({
    logBadgeAwarded: mockLogBadgeAwarded,
  })),
}));

jest.mock('../../services/RealtimePublisher', () => ({
  realtimePublisher: {
    publishToUser: mockPublishToUser,
  },
}));

jest.mock('../../utils/websocket', () => ({
  sendToUser: mockSendToUser,
}));

import { BadgeService } from '../../services/BadgeService';

describe('BadgeService concurrent awards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    let inserted = false;

    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM badges')) {
        return {
          rows: [
            {
              id: 'badge-1',
              name: 'First Show',
              badge_type: 'milestone',
              requirement_value: 1,
              criteria: { type: 'checkin_count', threshold: 1 },
              description: 'Attend one show',
              icon_url: null,
              color: '#FF5500',
            },
          ],
        };
      }
      if (sql.includes('SELECT badge_id FROM user_badges')) {
        return { rows: [] };
      }
      if (sql.includes('SELECT COUNT(*)::int as cnt FROM checkins')) {
        return { rows: [{ cnt: 1 }] };
      }
      if (sql.includes('INSERT INTO user_badges')) {
        if (inserted) {
          return { rows: [], rowCount: 0 };
        }
        inserted = true;
        return { rows: [{ id: 'award-1' }], rowCount: 1 };
      }
      throw new Error(`Unexpected query: ${sql}`);
    });
    mockCreateNotification.mockResolvedValue({ id: 'notification-1' });
    mockPublishToUser.mockResolvedValue(true);
  });

  it('reports and emits side effects for only the winning concurrent insert', async () => {
    const service = new BadgeService();

    const results = await Promise.all([
      service.evaluateAndAward('user-1'),
      service.evaluateAndAward('user-1'),
    ]);

    expect(results.map((badges) => badges.length).sort()).toEqual([0, 1]);
    expect(mockLogBadgeAwarded).toHaveBeenCalledTimes(1);
    expect(mockCreateNotification).toHaveBeenCalledTimes(1);
    expect(mockPublishToUser).toHaveBeenCalledTimes(1);
    expect(mockSendToUser).not.toHaveBeenCalled();
  });

  it('returns whether awardBadge inserted a new row', async () => {
    const service = new BadgeService();

    await expect(service.awardBadge('user-1', 'badge-1')).resolves.toBe(true);
    await expect(service.awardBadge('user-1', 'badge-1')).resolves.toBe(false);

    const insertSql = mockQuery.mock.calls[0][0];
    expect(insertSql).toContain('RETURNING');
  });
});
