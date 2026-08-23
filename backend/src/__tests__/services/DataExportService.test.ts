import { DataExportService, GDPRExport } from '../../services/DataExportService';
import Database from '../../config/database';

// Mock dependencies
jest.mock('../../config/database');

const mockDb = {
  query: jest.fn(),
};

(Database.getInstance as jest.Mock).mockReturnValue(mockDb);

/** Profile + 18 parallel section queries (Promise.all) — each returns { rows: [] } unless overridden */
function mockEmptyParallelTail(mock: jest.Mock, count = 18) {
  for (let i = 0; i < count; i++) {
    mock.mockResolvedValueOnce({ rows: [] });
  }
}

describe('DataExportService', () => {
  let dataExportService: DataExportService;

  beforeEach(() => {
    dataExportService = new DataExportService();
    jest.clearAllMocks();
  });

  describe('exportUserData', () => {
    const userId = 'user-123';
    const mockProfile = {
      id: userId,
      email: 'test@example.com',
      username: 'testuser',
      first_name: 'Test',
      last_name: 'User',
      bio: 'Test bio',
      profile_image_url: 'https://example.com/image.jpg',
      location: 'New York',
      date_of_birth: new Date('1990-01-01'),
      is_verified: true,
      is_active: true,
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-06-01'),
    };

    it('should export all user data categories', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [mockProfile] });
      mockEmptyParallelTail(mockDb.query);

      const result = await dataExportService.exportUserData(userId);

      expect(result.format).toBe('GDPR_EXPORT_V1');
      expect(result.exportedAt).toBeDefined();
      expect(result.profile).toBeDefined();
      expect(result.checkins).toBeDefined();
      expect(result.followers).toBeDefined();
      expect(result.following).toBeDefined();
      expect(result.wishlist).toBeDefined();
      expect(result.badges).toBeDefined();
      expect(result.toasts).toBeDefined();
      expect(result.comments).toBeDefined();
      expect(result.notifications).toBeDefined();
      expect(result.rsvps).toBeDefined();
      expect(result.genrePreferences).toBeDefined();
      expect(result.consents).toBeDefined();
      expect(result.blocks).toBeDefined();
      expect(result.bandRatings).toBeDefined();
      expect(result.verificationClaims).toBeDefined();
      expect(result.reportsFiled).toBeDefined();
      expect(result.socialAccounts).toBeDefined();
      expect(result.deviceTokens).toBeDefined();
      expect(result.auditLog).toBeDefined();
    });

    it('should NOT include password_hash in profile', async () => {
      const profileWithPassword = {
        ...mockProfile,
        password_hash: 'secret_hash_should_not_appear',
      };

      mockDb.query.mockResolvedValueOnce({ rows: [profileWithPassword] });
      mockEmptyParallelTail(mockDb.query);

      const result = await dataExportService.exportUserData(userId);

      // Verify password_hash is not in the export
      expect((result.profile as any).passwordHash).toBeUndefined();
      expect((result.profile as any).password_hash).toBeUndefined();

      // Verify the query does not select password_hash
      const profileQuery = mockDb.query.mock.calls[0][0];
      expect(profileQuery).not.toContain('password_hash');
    });

    it('should throw error if user not found', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await expect(dataExportService.exportUserData(userId)).rejects.toThrow('User not found');
    });

    it('should handle empty data gracefully', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [mockProfile] });
      mockEmptyParallelTail(mockDb.query);

      const result = await dataExportService.exportUserData(userId);

      expect(result.checkins).toEqual([]);
      expect(result.followers).toEqual([]);
      expect(result.following).toEqual([]);
      expect(result.wishlist).toEqual([]);
      expect(result.badges).toEqual([]);
      expect(result.toasts).toEqual([]);
      expect(result.comments).toEqual([]);
      expect(result.notifications).toEqual([]);
    });

    it('should include checkins with venue and band names', async () => {
      const mockCheckin = {
        id: 'checkin-1',
        rating: 4.5,
        comment: 'Great show!',
        photo_url: 'https://example.com/photo.jpg',
        event_date: new Date('2024-03-15'),
        created_at: new Date('2024-03-16'),
        venue_name: 'The Roxy',
        venue_city: 'Los Angeles',
        band_name: 'The Strokes',
        band_genre: 'Rock',
        checkin_latitude: '34.0900',
        checkin_longitude: '-118.3877',
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockProfile] });
      mockDb.query.mockResolvedValueOnce({ rows: [mockCheckin] });
      mockEmptyParallelTail(mockDb.query, 17);

      const result = await dataExportService.exportUserData(userId);

      expect(result.checkins).toHaveLength(1);
      expect(result.checkins[0].venueName).toBe('The Roxy');
      expect(result.checkins[0].venueCity).toBe('Los Angeles');
      expect(result.checkins[0].bandName).toBe('The Strokes');
      expect(result.checkins[0].bandGenre).toBe('Rock');
      expect(result.checkins[0].rating).toBe(4.5);
      expect(result.checkins[0].comment).toBe('Great show!');
      expect(result.checkins[0].photoUrl).toBe('https://example.com/photo.jpg');
      expect(result.checkins[0].checkinLatitude).toBe(34.09);
      expect(result.checkins[0].checkinLongitude).toBe(-118.3877);

      const checkinQuery = mockDb.query.mock.calls[1][0] as string;
      expect(checkinQuery).toContain('c.image_urls');
      expect(checkinQuery).toContain('c.photo_url');
    });

    it('prefers image_urls over legacy photo_url in check-in export', async () => {
      const mockCheckin = {
        id: 'checkin-1',
        rating: 4.5,
        comment: 'Great show!',
        image_urls: ['https://cdn.example.com/new.jpg', 'https://cdn.example.com/two.jpg'],
        photo_url: 'https://example.com/legacy.jpg',
        event_date: new Date('2024-03-15'),
        created_at: new Date('2024-03-16'),
        venue_name: 'The Roxy',
        venue_city: 'Los Angeles',
        band_name: 'The Strokes',
        band_genre: 'Rock',
        checkin_latitude: null,
        checkin_longitude: null,
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockProfile] });
      mockDb.query.mockResolvedValueOnce({ rows: [mockCheckin] });
      mockEmptyParallelTail(mockDb.query, 17);

      const result = await dataExportService.exportUserData(userId);

      expect(result.checkins[0].photoUrl).toBe('https://cdn.example.com/new.jpg');
    });

    it('falls back to photo_url when image_urls is empty', async () => {
      const mockCheckin = {
        id: 'checkin-1',
        rating: 4,
        comment: null,
        image_urls: [],
        photo_url: 'https://example.com/legacy.jpg',
        event_date: null,
        created_at: new Date('2024-03-16'),
        venue_name: null,
        venue_city: null,
        band_name: null,
        band_genre: null,
        checkin_latitude: null,
        checkin_longitude: null,
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockProfile] });
      mockDb.query.mockResolvedValueOnce({ rows: [mockCheckin] });
      mockEmptyParallelTail(mockDb.query, 17);

      const result = await dataExportService.exportUserData(userId);

      expect(result.checkins[0].photoUrl).toBe('https://example.com/legacy.jpg');
    });

    it('should include followers list', async () => {
      const mockFollower = {
        id: 'follower-1',
        username: 'followeruser',
        followed_at: new Date('2024-02-01'),
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockProfile] });
      mockDb.query.mockResolvedValueOnce({ rows: [] });
      mockDb.query.mockResolvedValueOnce({ rows: [mockFollower] });
      mockEmptyParallelTail(mockDb.query, 16);

      const result = await dataExportService.exportUserData(userId);

      expect(result.followers).toHaveLength(1);
      expect(result.followers[0].username).toBe('followeruser');
      expect(result.followers[0].followedAt).toBeDefined();
    });

    it('should include following list', async () => {
      const mockFollowing = {
        id: 'following-1',
        username: 'followinguser',
        followed_at: new Date('2024-02-15'),
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockProfile] });
      mockDb.query.mockResolvedValueOnce({ rows: [] });
      mockDb.query.mockResolvedValueOnce({ rows: [] });
      mockDb.query.mockResolvedValueOnce({ rows: [mockFollowing] });
      mockEmptyParallelTail(mockDb.query, 15);

      const result = await dataExportService.exportUserData(userId);

      expect(result.following).toHaveLength(1);
      expect(result.following[0].username).toBe('followinguser');
    });

    it('should include wishlist with band details', async () => {
      const mockWishlistItem = {
        id: 'wishlist-1',
        band_name: 'Arctic Monkeys',
        band_genre: 'Indie Rock',
        notify_when_nearby: true,
        created_at: new Date('2024-01-20'),
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockProfile] });
      mockDb.query.mockResolvedValueOnce({ rows: [] });
      mockDb.query.mockResolvedValueOnce({ rows: [] });
      mockDb.query.mockResolvedValueOnce({ rows: [] });
      mockDb.query.mockResolvedValueOnce({ rows: [mockWishlistItem] });
      mockEmptyParallelTail(mockDb.query, 14);

      const result = await dataExportService.exportUserData(userId);

      expect(result.wishlist).toHaveLength(1);
      expect(result.wishlist[0].bandName).toBe('Arctic Monkeys');
      expect(result.wishlist[0].bandGenre).toBe('Indie Rock');
      expect(result.wishlist[0].notifyWhenNearby).toBe(true);
    });

    it('should include earned badges', async () => {
      const mockBadge = {
        id: 'userbadge-1',
        name: 'Concert Veteran',
        description: 'Attended 50 concerts',
        badge_type: 'checkin_count',
        earned_at: new Date('2024-04-01'),
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockProfile] });
      mockDb.query.mockResolvedValueOnce({ rows: [] });
      mockDb.query.mockResolvedValueOnce({ rows: [] });
      mockDb.query.mockResolvedValueOnce({ rows: [] });
      mockDb.query.mockResolvedValueOnce({ rows: [] });
      mockDb.query.mockResolvedValueOnce({ rows: [mockBadge] });
      mockEmptyParallelTail(mockDb.query, 13);

      const result = await dataExportService.exportUserData(userId);

      expect(result.badges).toHaveLength(1);
      expect(result.badges[0].name).toBe('Concert Veteran');
      expect(result.badges[0].description).toBe('Attended 50 concerts');
      expect(result.badges[0].badgeType).toBe('checkin_count');
    });

    it('should format dates as ISO strings', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [mockProfile] });
      mockEmptyParallelTail(mockDb.query);

      const result = await dataExportService.exportUserData(userId);

      // Check that dates are ISO strings
      expect(result.profile.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(result.profile.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(result.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should handle null optional fields gracefully', async () => {
      const profileWithNulls = {
        id: userId,
        email: 'test@example.com',
        username: 'testuser',
        first_name: null,
        last_name: null,
        bio: null,
        profile_image_url: null,
        location: null,
        date_of_birth: null,
        is_verified: false,
        is_active: true,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
      };

      mockDb.query.mockResolvedValueOnce({ rows: [profileWithNulls] });
      mockEmptyParallelTail(mockDb.query);

      const result = await dataExportService.exportUserData(userId);

      expect(result.profile.firstName).toBeNull();
      expect(result.profile.lastName).toBeNull();
      expect(result.profile.bio).toBeNull();
      expect(result.profile.profileImageUrl).toBeNull();
      expect(result.profile.location).toBeNull();
      expect(result.profile.dateOfBirth).toBeNull();
    });

    it('should use correct format version', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [mockProfile] });
      mockEmptyParallelTail(mockDb.query);

      const result = await dataExportService.exportUserData(userId);

      expect(result.format).toBe('GDPR_EXPORT_V1');
    });

    it('should handle checkins with null venue or band', async () => {
      const checkinWithNulls = {
        id: 'checkin-1',
        rating: 4,
        comment: null,
        photo_url: null,
        event_date: null,
        created_at: new Date('2024-03-16'),
        venue_name: null,
        venue_city: null,
        band_name: null,
        band_genre: null,
        checkin_latitude: null,
        checkin_longitude: null,
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockProfile] });
      mockDb.query.mockResolvedValueOnce({ rows: [checkinWithNulls] });
      mockEmptyParallelTail(mockDb.query, 17);

      const result = await dataExportService.exportUserData(userId);

      expect(result.checkins).toHaveLength(1);
      expect(result.checkins[0].venueName).toBeNull();
      expect(result.checkins[0].bandName).toBeNull();
      expect(result.checkins[0].eventDate).toBeNull();
      expect(result.checkins[0].checkinLatitude).toBeNull();
      expect(result.checkins[0].checkinLongitude).toBeNull();
    });

    it('should include toasts given to others check-ins', async () => {
      const mockToast = {
        id: 'toast-1',
        checkin_id: 'checkin-abc',
        checkin_owner_username: 'otheruser',
        created_at: new Date('2024-05-01'),
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockProfile] });
      mockDb.query.mockResolvedValueOnce({ rows: [] });
      mockDb.query.mockResolvedValueOnce({ rows: [] });
      mockDb.query.mockResolvedValueOnce({ rows: [] });
      mockDb.query.mockResolvedValueOnce({ rows: [] });
      mockDb.query.mockResolvedValueOnce({ rows: [] });
      mockDb.query.mockResolvedValueOnce({ rows: [mockToast] });
      mockEmptyParallelTail(mockDb.query, 12);

      const result = await dataExportService.exportUserData(userId);

      expect(result.toasts).toHaveLength(1);
      expect(result.toasts[0].id).toBe('toast-1');
      expect(result.toasts[0].checkinId).toBe('checkin-abc');
      expect(result.toasts[0].checkinOwnerUsername).toBe('otheruser');
      expect(result.toasts[0].createdAt).toBeDefined();
    });

    it('should include comments made on check-ins', async () => {
      const mockComment = {
        id: 'comment-1',
        checkin_id: 'checkin-xyz',
        checkin_owner_username: 'anotheruser',
        content: 'Great show, wish I was there!',
        created_at: new Date('2024-05-02'),
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockProfile] });
      mockDb.query.mockResolvedValueOnce({ rows: [] });
      mockDb.query.mockResolvedValueOnce({ rows: [] });
      mockDb.query.mockResolvedValueOnce({ rows: [] });
      mockDb.query.mockResolvedValueOnce({ rows: [] });
      mockDb.query.mockResolvedValueOnce({ rows: [] });
      mockDb.query.mockResolvedValueOnce({ rows: [] });
      mockDb.query.mockResolvedValueOnce({ rows: [mockComment] });
      mockEmptyParallelTail(mockDb.query, 11);

      const result = await dataExportService.exportUserData(userId);

      expect(result.comments).toHaveLength(1);
      expect(result.comments[0].id).toBe('comment-1');
      expect(result.comments[0].checkinId).toBe('checkin-xyz');
      expect(result.comments[0].checkinOwnerUsername).toBe('anotheruser');
      expect(result.comments[0].content).toBe('Great show, wish I was there!');
      expect(result.comments[0].createdAt).toBeDefined();
    });

    it('should include notification history', async () => {
      const mockNotification = {
        id: 'notif-1',
        type: 'toast',
        message: 'Someone liked your check-in!',
        is_read: false,
        created_at: new Date('2024-05-03'),
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockProfile] });
      mockDb.query.mockResolvedValueOnce({ rows: [] });
      mockDb.query.mockResolvedValueOnce({ rows: [] });
      mockDb.query.mockResolvedValueOnce({ rows: [] });
      mockDb.query.mockResolvedValueOnce({ rows: [] });
      mockDb.query.mockResolvedValueOnce({ rows: [] });
      mockDb.query.mockResolvedValueOnce({ rows: [] });
      mockDb.query.mockResolvedValueOnce({ rows: [] });
      mockDb.query.mockResolvedValueOnce({ rows: [mockNotification] });
      mockEmptyParallelTail(mockDb.query, 10);

      const result = await dataExportService.exportUserData(userId);

      expect(result.notifications).toHaveLength(1);
      expect(result.notifications[0].id).toBe('notif-1');
      expect(result.notifications[0].type).toBe('toast');
      expect(result.notifications[0].message).toBe('Someone liked your check-in!');
      expect(result.notifications[0].isRead).toBe(false);
      expect(result.notifications[0].createdAt).toBeDefined();
    });

    it('should include checkin location coordinates', async () => {
      const mockCheckinWithLocation = {
        id: 'checkin-loc',
        rating: 5,
        comment: 'Amazing concert!',
        photo_url: null,
        event_date: new Date('2024-04-20'),
        created_at: new Date('2024-04-20'),
        venue_name: 'Red Rocks',
        venue_city: 'Morrison',
        band_name: 'Phish',
        band_genre: 'Jam Band',
        checkin_latitude: '39.6654',
        checkin_longitude: '-105.2057',
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockProfile] });
      mockDb.query.mockResolvedValueOnce({ rows: [mockCheckinWithLocation] });
      mockEmptyParallelTail(mockDb.query, 17);

      const result = await dataExportService.exportUserData(userId);

      expect(result.checkins).toHaveLength(1);
      expect(result.checkins[0].checkinLatitude).toBe(39.6654);
      expect(result.checkins[0].checkinLongitude).toBe(-105.2057);
    });
  });
});
