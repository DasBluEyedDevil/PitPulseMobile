import Database from '../../config/database';
import { NotificationService } from '../../services/NotificationService';

jest.mock('../../config/database');
jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

const mockDb = {
  query: jest.fn(),
};

(Database.getInstance as jest.Mock).mockReturnValue(mockDb);

describe('NotificationService', () => {
  const userId = '11111111-1111-4111-8111-111111111111';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps related actor, check-in, badge, and event data into the mobile notification feed', async () => {
    mockDb.query.mockResolvedValue({
      rows: [
        {
          id: 'notification-1',
          user_id: userId,
          type: 'badge_earned',
          title: 'Badge earned',
          message: 'Night Owl',
          is_read: false,
          created_at: new Date('2026-07-26T12:00:00.000Z'),
          total_count: '3',
          unread_count: '2',
          from_user_id: 'user-2',
          from_user_username: 'alice',
          from_user_profile_image: 'https://images.example/alice.png',
          checkin_id: 'checkin-1',
          checkin_comment: 'Great set',
          checkin_band_id: 'band-1',
          checkin_band_name: 'The Tests',
          checkin_band_image: 'https://images.example/band.png',
          checkin_venue_id: 'venue-1',
          checkin_venue_name: 'The Hall',
          badge_id: 'badge-1',
          badge_name: 'Night Owl',
          badge_icon_url: 'https://images.example/badge.png',
          badge_color: '#123456',
          event_id: 'event-1',
          event_date: new Date('2026-07-26T20:00:00.000Z'),
          event_band_id: 'band-1',
          event_band_name: 'The Tests',
          event_venue_id: 'venue-1',
          event_venue_name: 'The Hall',
        },
      ],
    });

    const feed = await new NotificationService().getNotifications(userId, {
      limit: 1,
      offset: 1,
    });

    expect(mockDb.query).toHaveBeenCalledWith(expect.stringContaining('COUNT(*) OVER()'), [
      userId,
      1,
      1,
    ]);
    expect(feed).toEqual({
      notifications: [
        expect.objectContaining({
          id: 'notification-1',
          userId,
          fromUser: {
            id: 'user-2',
            username: 'alice',
            profileImageUrl: 'https://images.example/alice.png',
          },
          checkin: {
            id: 'checkin-1',
            noteText: 'Great set',
            band: {
              id: 'band-1',
              name: 'The Tests',
              imageUrl: 'https://images.example/band.png',
            },
            venue: { id: 'venue-1', name: 'The Hall' },
          },
          badge: {
            id: 'badge-1',
            name: 'Night Owl',
            iconUrl: 'https://images.example/badge.png',
            color: '#123456',
          },
          showId: 'event-1',
          eventId: 'event-1',
          show: {
            id: 'event-1',
            showDate: new Date('2026-07-26T20:00:00.000Z'),
            band: { id: 'band-1', name: 'The Tests' },
            venue: { id: 'venue-1', name: 'The Hall' },
          },
        }),
      ],
      unreadCount: 2,
      total: 3,
      hasMore: true,
    });
  });

  it('returns zero counts for an empty page instead of issuing serial count queries', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });

    const feed = await new NotificationService().getNotifications(userId);

    expect(feed).toEqual({
      notifications: [],
      unreadCount: 0,
      total: 0,
      hasMore: false,
    });
    expect(mockDb.query).toHaveBeenCalledTimes(1);
  });

  it('creates with the canonical event ID and then returns the fully populated notification', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [{ id: 'notification-1' }] }).mockResolvedValueOnce({
      rows: [
        {
          id: 'notification-1',
          user_id: 'user-1',
          type: 'event_reminder',
          title: null,
          message: null,
          event_id: 'event-1',
          is_read: false,
          created_at: new Date('2026-07-26T12:00:00.000Z'),
          event_date: new Date('2026-07-27T20:00:00.000Z'),
        },
      ],
    });

    const notification = await new NotificationService().createNotification({
      userId: 'user-1',
      type: 'event_reminder',
      showId: 'legacy-event-id',
      eventId: 'event-1',
    });

    expect(mockDb.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('INSERT INTO notifications'),
      ['user-1', 'event_reminder', null, null, null, null, null, 'event-1']
    );
    expect(mockDb.query).toHaveBeenNthCalledWith(2, expect.stringContaining('WHERE n.id = $1'), [
      'notification-1',
    ]);
    expect(notification).toEqual(
      expect.objectContaining({
        id: 'notification-1',
        eventId: 'event-1',
        showId: 'event-1',
      })
    );
  });

  it('falls back to a legacy show ID when creating an event notification', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [{ id: 'notification-1' }] }).mockResolvedValueOnce({
      rows: [
        {
          id: 'notification-1',
          user_id: 'user-1',
          type: 'event_reminder',
          event_id: 'legacy-event-id',
          is_read: false,
          created_at: new Date('2026-07-26T12:00:00.000Z'),
        },
      ],
    });

    await new NotificationService().createNotification({
      userId: 'user-1',
      type: 'event_reminder',
      showId: 'legacy-event-id',
    });

    expect(mockDb.query).toHaveBeenNthCalledWith(1, expect.any(String), [
      'user-1',
      'event_reminder',
      null,
      null,
      null,
      null,
      null,
      'legacy-event-id',
    ]);
  });

  it('enforces notification ownership for read and delete mutations', async () => {
    mockDb.query.mockResolvedValue({ rowCount: 0, rows: [] });
    const service = new NotificationService();

    await expect(service.markAsRead('notification-1', 'other-user')).rejects.toThrow(
      'Notification not found or access denied'
    );
    await expect(service.deleteNotification('notification-1', 'other-user')).rejects.toThrow(
      'Notification not found or access denied'
    );
    expect(mockDb.query).toHaveBeenNthCalledWith(
      1,
      'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2',
      ['notification-1', 'other-user']
    );
    expect(mockDb.query).toHaveBeenNthCalledWith(
      2,
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2',
      ['notification-1', 'other-user']
    );
  });

  it('returns mutation and unread counts from PostgreSQL results', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rowCount: 4, rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '7' }] });
    const service = new NotificationService();

    await expect(service.markAllAsRead('user-1')).resolves.toBe(4);
    await expect(service.getUnreadCount('user-1')).resolves.toBe(7);
  });

  it('propagates database failures so the API can return a retryable error', async () => {
    mockDb.query.mockRejectedValue(new Error('database unavailable'));

    await expect(new NotificationService().getNotifications(userId)).rejects.toThrow(
      'database unavailable'
    );
  });
});
