import Database from '../config/database';

export interface ExportedProfile {
  id: string;
  email: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  bio: string | null;
  profileImageUrl: string | null;
  location: string | null;
  dateOfBirth: string | null;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExportedCheckin {
  id: string;
  venueName: string | null;
  venueCity: string | null;
  bandName: string | null;
  bandGenre: string | null;
  rating: number;
  comment: string | null;
  photoUrl: string | null;
  eventDate: string | null;
  checkinLatitude: number | null;
  checkinLongitude: number | null;
  createdAt: string;
}

export interface ExportedFollower {
  id: string;
  username: string;
  followedAt: string;
}

export interface ExportedWishlistItem {
  id: string;
  bandName: string;
  bandGenre: string | null;
  notifyWhenNearby: boolean;
  createdAt: string;
}

export interface ExportedBadge {
  id: string;
  name: string;
  description: string;
  badgeType: string;
  earnedAt: string;
}

export interface ExportedToast {
  id: string;
  checkinId: string;
  checkinOwnerUsername: string;
  createdAt: string;
}

export interface ExportedComment {
  id: string;
  checkinId: string;
  checkinOwnerUsername: string;
  content: string;
  createdAt: string;
}

export interface ExportedNotification {
  id: string;
  type: string;
  message: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface ExportedRsvp {
  id: string;
  eventId: string;
  eventName: string | null;
  createdAt: string;
}

export interface ExportedGenrePreference {
  id: string;
  genre: string;
  createdAt: string;
}

export interface ExportedConsent {
  id: string;
  purpose: string;
  granted: boolean;
  recordedAt: string;
}

export interface ExportedBlock {
  id: string;
  otherUserId: string;
  direction: 'blocked' | 'blocked_by';
  createdAt: string;
}

export interface ExportedBandRating {
  id: string;
  checkinId: string;
  bandId: string;
  bandName: string | null;
  rating: number;
  createdAt: string;
}

export interface ExportedVerificationClaim {
  id: string;
  entityType: string;
  entityId: string;
  status: string;
  createdAt: string;
}

export interface ExportedReport {
  id: string;
  contentType: string;
  contentId: string;
  reason: string;
  status: string;
  createdAt: string;
}

export interface ExportedSocialAccount {
  id: string;
  provider: string;
  providerId: string;
  createdAt: string;
}

export interface ExportedDeviceToken {
  id: string;
  platform: string | null;
  createdAt: string;
}

export interface ExportedAuditLog {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface GDPRExport {
  format: 'GDPR_EXPORT_V1';
  exportedAt: string;
  profile: ExportedProfile;
  checkins: ExportedCheckin[];
  followers: ExportedFollower[];
  following: ExportedFollower[];
  wishlist: ExportedWishlistItem[];
  badges: ExportedBadge[];
  toasts: ExportedToast[];
  comments: ExportedComment[];
  notifications: ExportedNotification[];
  rsvps: ExportedRsvp[];
  genrePreferences: ExportedGenrePreference[];
  consents: ExportedConsent[];
  blocks: ExportedBlock[];
  bandRatings: ExportedBandRating[];
  verificationClaims: ExportedVerificationClaim[];
  reportsFiled: ExportedReport[];
  socialAccounts: ExportedSocialAccount[];
  deviceTokens: ExportedDeviceToken[];
  auditLog: ExportedAuditLog[];
}

export class DataExportService {
  private db = Database.getInstance();

  /**
   * Maximum rows per export section.
   * DB-019/CFR-024: Prevents unbounded SELECT queries that could cause
   * memory exhaustion on accounts with very large datasets.
   * 10,000 is generous enough for any realistic beta user while still
   * providing a safety cap.
   */
  private static readonly EXPORT_ROW_LIMIT = 10000;

  /**
   * Export all user data for GDPR compliance
   * Collects profile, checkins, followers, following, wishlist, badges,
   * toasts, comments, and notifications
   * Excludes sensitive fields like password_hash
   */
  async exportUserData(userId: string): Promise<GDPRExport> {
    // Get profile (excluding password_hash)
    const profile = await this.getProfile(userId);
    if (!profile) {
      throw new Error('User not found');
    }

    // Collect all data in parallel for efficiency
    const [
      checkins,
      followers,
      following,
      wishlist,
      badges,
      toasts,
      comments,
      notifications,
      rsvps,
      genrePreferences,
      consents,
      blocks,
      bandRatings,
      verificationClaims,
      reportsFiled,
      socialAccounts,
      deviceTokens,
      auditLog,
    ] = await Promise.all([
      this.getCheckins(userId),
      this.getFollowers(userId),
      this.getFollowing(userId),
      this.getWishlist(userId),
      this.getBadges(userId),
      this.getToasts(userId),
      this.getComments(userId),
      this.getNotifications(userId),
      this.getRsvps(userId),
      this.getGenrePreferences(userId),
      this.getConsents(userId),
      this.getBlocks(userId),
      this.getBandRatings(userId),
      this.getVerificationClaims(userId),
      this.getReportsFiled(userId),
      this.getSocialAccounts(userId),
      this.getDeviceTokens(userId),
      this.getAuditLog(userId),
    ]);

    return {
      format: 'GDPR_EXPORT_V1',
      exportedAt: new Date().toISOString(),
      profile,
      checkins,
      followers,
      following,
      wishlist,
      badges,
      toasts,
      comments,
      notifications,
      rsvps,
      genrePreferences,
      consents,
      blocks,
      bandRatings,
      verificationClaims,
      reportsFiled,
      socialAccounts,
      deviceTokens,
      auditLog,
    };
  }

  /**
   * Get user profile data (excluding password_hash)
   */
  private async getProfile(userId: string): Promise<ExportedProfile | null> {
    const query = `
      SELECT id, email, username, first_name, last_name, bio, profile_image_url,
             location, date_of_birth, is_verified, is_active, created_at, updated_at
      FROM users
      WHERE id = $1
    `;

    const result = await this.db.query(query, [userId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      username: row.username,
      firstName: row.first_name,
      lastName: row.last_name,
      bio: row.bio,
      profileImageUrl: row.profile_image_url,
      location: row.location,
      dateOfBirth: row.date_of_birth ? row.date_of_birth.toISOString() : null,
      isVerified: row.is_verified,
      isActive: row.is_active,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }

  /**
   * Get user's checkins with venue and band names
   */
  private async getCheckins(userId: string): Promise<ExportedCheckin[]> {
    const query = `
      SELECT c.id, c.rating, c.comment, c.photo_url, c.event_date, c.created_at,
             c.checkin_latitude, c.checkin_longitude,
             v.name as venue_name, v.city as venue_city,
             b.name as band_name, b.genre as band_genre
      FROM checkins c
      LEFT JOIN venues v ON c.venue_id = v.id
      LEFT JOIN bands b ON c.band_id = b.id
      WHERE c.user_id = $1
      ORDER BY c.created_at DESC
      LIMIT ${DataExportService.EXPORT_ROW_LIMIT}
    `;

    const result = await this.db.query(query, [userId]);

    return result.rows.map((row: any) => ({
      id: row.id,
      venueName: row.venue_name,
      venueCity: row.venue_city,
      bandName: row.band_name,
      bandGenre: row.band_genre,
      rating: parseFloat(row.rating) || 0,
      comment: row.comment,
      photoUrl: row.photo_url,
      eventDate: row.event_date ? row.event_date.toISOString() : null,
      checkinLatitude: row.checkin_latitude ? parseFloat(row.checkin_latitude) : null,
      checkinLongitude: row.checkin_longitude ? parseFloat(row.checkin_longitude) : null,
      createdAt: row.created_at.toISOString(),
    }));
  }

  /**
   * Get list of users who follow this user
   */
  private async getFollowers(userId: string): Promise<ExportedFollower[]> {
    const query = `
      SELECT u.id, u.username, uf.created_at as followed_at
      FROM user_followers uf
      INNER JOIN users u ON u.id = uf.follower_id
      WHERE uf.following_id = $1 AND u.is_active = true
      ORDER BY uf.created_at DESC
      LIMIT ${DataExportService.EXPORT_ROW_LIMIT}
    `;

    const result = await this.db.query(query, [userId]);

    return result.rows.map((row: any) => ({
      id: row.id,
      username: row.username,
      followedAt: row.followed_at.toISOString(),
    }));
  }

  /**
   * Get list of users this user is following
   */
  private async getFollowing(userId: string): Promise<ExportedFollower[]> {
    const query = `
      SELECT u.id, u.username, uf.created_at as followed_at
      FROM user_followers uf
      INNER JOIN users u ON u.id = uf.following_id
      WHERE uf.follower_id = $1 AND u.is_active = true
      ORDER BY uf.created_at DESC
      LIMIT ${DataExportService.EXPORT_ROW_LIMIT}
    `;

    const result = await this.db.query(query, [userId]);

    return result.rows.map((row: any) => ({
      id: row.id,
      username: row.username,
      followedAt: row.followed_at.toISOString(),
    }));
  }

  /**
   * Get user's wishlist with band details
   */
  private async getWishlist(userId: string): Promise<ExportedWishlistItem[]> {
    const query = `
      SELECT uw.id, uw.notify_when_nearby, uw.created_at,
             b.name as band_name, b.genre as band_genre
      FROM user_wishlist uw
      INNER JOIN bands b ON b.id = uw.band_id
      WHERE uw.user_id = $1 AND b.is_active = true
      ORDER BY uw.created_at DESC
      LIMIT ${DataExportService.EXPORT_ROW_LIMIT}
    `;

    const result = await this.db.query(query, [userId]);

    return result.rows.map((row: any) => ({
      id: row.id,
      bandName: row.band_name,
      bandGenre: row.band_genre,
      notifyWhenNearby: row.notify_when_nearby,
      createdAt: row.created_at.toISOString(),
    }));
  }

  /**
   * Get user's earned badges
   */
  private async getBadges(userId: string): Promise<ExportedBadge[]> {
    const query = `
      SELECT ub.id, ub.earned_at,
             b.name, b.description, b.badge_type
      FROM user_badges ub
      JOIN badges b ON ub.badge_id = b.id
      WHERE ub.user_id = $1
      ORDER BY ub.earned_at DESC
      LIMIT ${DataExportService.EXPORT_ROW_LIMIT}
    `;

    const result = await this.db.query(query, [userId]);

    return result.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      badgeType: row.badge_type,
      earnedAt: row.earned_at.toISOString(),
    }));
  }

  /**
   * Get toasts the user has given to others' check-ins
   */
  private async getToasts(userId: string): Promise<ExportedToast[]> {
    const query = `
      SELECT t.id, t.checkin_id, t.created_at,
             u.username as checkin_owner_username
      FROM toasts t
      INNER JOIN checkins c ON c.id = t.checkin_id
      INNER JOIN users u ON u.id = c.user_id
      WHERE t.user_id = $1
      ORDER BY t.created_at DESC
      LIMIT ${DataExportService.EXPORT_ROW_LIMIT}
    `;

    const result = await this.db.query(query, [userId]);

    return result.rows.map((row: any) => ({
      id: row.id,
      checkinId: row.checkin_id,
      checkinOwnerUsername: row.checkin_owner_username,
      createdAt: row.created_at.toISOString(),
    }));
  }

  /**
   * Get comments the user has made on check-ins
   */
  private async getComments(userId: string): Promise<ExportedComment[]> {
    const query = `
      SELECT cc.id, cc.checkin_id, cc.content, cc.created_at,
             u.username as checkin_owner_username
      FROM checkin_comments cc
      INNER JOIN checkins c ON c.id = cc.checkin_id
      INNER JOIN users u ON u.id = c.user_id
      WHERE cc.user_id = $1
      ORDER BY cc.created_at DESC
      LIMIT ${DataExportService.EXPORT_ROW_LIMIT}
    `;

    const result = await this.db.query(query, [userId]);

    return result.rows.map((row: any) => ({
      id: row.id,
      checkinId: row.checkin_id,
      checkinOwnerUsername: row.checkin_owner_username,
      content: row.content,
      createdAt: row.created_at.toISOString(),
    }));
  }

  /**
   * Get user's notification history
   */
  private async getNotifications(userId: string): Promise<ExportedNotification[]> {
    const query = `
      SELECT id, type, message, is_read, created_at
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT ${DataExportService.EXPORT_ROW_LIMIT}
    `;

    const result = await this.db.query(query, [userId]);

    return result.rows.map((row: any) => ({
      id: row.id,
      type: row.type,
      message: row.message,
      isRead: row.is_read,
      createdAt: row.created_at.toISOString(),
    }));
  }

  private async getRsvps(userId: string): Promise<ExportedRsvp[]> {
    const query = `
      SELECT er.id, er.event_id, er.created_at, e.event_name
      FROM event_rsvps er
      LEFT JOIN events e ON e.id = er.event_id
      WHERE er.user_id = $1
      ORDER BY er.created_at DESC
      LIMIT ${DataExportService.EXPORT_ROW_LIMIT}
    `;
    const result = await this.db.query(query, [userId]);
    return result.rows.map((row: any) => ({
      id: row.id,
      eventId: row.event_id,
      eventName: row.event_name ?? null,
      createdAt: row.created_at.toISOString(),
    }));
  }

  private async getGenrePreferences(userId: string): Promise<ExportedGenrePreference[]> {
    const query = `
      SELECT id, genre, created_at FROM user_genre_preferences
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT ${DataExportService.EXPORT_ROW_LIMIT}
    `;
    const result = await this.db.query(query, [userId]);
    return result.rows.map((row: any) => ({
      id: row.id,
      genre: row.genre,
      createdAt: row.created_at.toISOString(),
    }));
  }

  private async getConsents(userId: string): Promise<ExportedConsent[]> {
    const query = `
      SELECT id, purpose, granted, recorded_at FROM user_consents
      WHERE user_id = $1
      ORDER BY recorded_at DESC
      LIMIT ${DataExportService.EXPORT_ROW_LIMIT}
    `;
    const result = await this.db.query(query, [userId]);
    return result.rows.map((row: any) => ({
      id: row.id,
      purpose: row.purpose,
      granted: row.granted,
      recordedAt: row.recorded_at.toISOString(),
    }));
  }

  private async getBlocks(userId: string): Promise<ExportedBlock[]> {
    const query = `
      SELECT id, blocker_id, blocked_id, created_at FROM user_blocks
      WHERE blocker_id = $1 OR blocked_id = $1
      ORDER BY created_at DESC
      LIMIT ${DataExportService.EXPORT_ROW_LIMIT}
    `;
    const result = await this.db.query(query, [userId]);
    return result.rows.map((row: any) => ({
      id: row.id,
      otherUserId: row.blocker_id === userId ? row.blocked_id : row.blocker_id,
      direction: row.blocker_id === userId ? 'blocked' : 'blocked_by',
      createdAt: row.created_at.toISOString(),
    }));
  }

  private async getBandRatings(userId: string): Promise<ExportedBandRating[]> {
    const query = `
      SELECT cbr.id, cbr.checkin_id, cbr.band_id, cbr.rating, cbr.created_at, b.name AS band_name
      FROM checkin_band_ratings cbr
      JOIN checkins c ON c.id = cbr.checkin_id
      LEFT JOIN bands b ON b.id = cbr.band_id
      WHERE c.user_id = $1
      ORDER BY cbr.created_at DESC
      LIMIT ${DataExportService.EXPORT_ROW_LIMIT}
    `;
    const result = await this.db.query(query, [userId]);
    return result.rows.map((row: any) => ({
      id: row.id,
      checkinId: row.checkin_id,
      bandId: row.band_id,
      bandName: row.band_name ?? null,
      rating: parseFloat(row.rating) || 0,
      createdAt: row.created_at.toISOString(),
    }));
  }

  private async getVerificationClaims(userId: string): Promise<ExportedVerificationClaim[]> {
    const query = `
      SELECT id, entity_type, entity_id, status, created_at
      FROM verification_claims
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT ${DataExportService.EXPORT_ROW_LIMIT}
    `;
    const result = await this.db.query(query, [userId]);
    return result.rows.map((row: any) => ({
      id: row.id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      status: row.status,
      createdAt: row.created_at.toISOString(),
    }));
  }

  private async getReportsFiled(userId: string): Promise<ExportedReport[]> {
    const query = `
      SELECT id, content_type::text AS content_type, content_id, reason::text AS reason,
             status::text AS status, created_at
      FROM reports
      WHERE reporter_id = $1
      ORDER BY created_at DESC
      LIMIT ${DataExportService.EXPORT_ROW_LIMIT}
    `;
    const result = await this.db.query(query, [userId]);
    return result.rows.map((row: any) => ({
      id: row.id,
      contentType: row.content_type,
      contentId: row.content_id,
      reason: row.reason,
      status: row.status,
      createdAt: row.created_at.toISOString(),
    }));
  }

  private async getSocialAccounts(userId: string): Promise<ExportedSocialAccount[]> {
    const query = `
      SELECT id, provider, provider_id, created_at
      FROM user_social_accounts
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT ${DataExportService.EXPORT_ROW_LIMIT}
    `;
    const result = await this.db.query(query, [userId]);
    return result.rows.map((row: any) => ({
      id: row.id,
      provider: row.provider,
      providerId: row.provider_id,
      createdAt: row.created_at.toISOString(),
    }));
  }

  private async getDeviceTokens(userId: string): Promise<ExportedDeviceToken[]> {
    const query = `
      SELECT id, platform, created_at FROM device_tokens
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT ${DataExportService.EXPORT_ROW_LIMIT}
    `;
    const result = await this.db.query(query, [userId]);
    return result.rows.map((row: any) => ({
      id: row.id,
      platform: row.platform ?? null,
      createdAt: row.created_at.toISOString(),
    }));
  }

  private async getAuditLog(userId: string): Promise<ExportedAuditLog[]> {
    const query = `
      SELECT id, action, resource_type, resource_id, metadata, created_at
      FROM audit_logs
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT ${DataExportService.EXPORT_ROW_LIMIT}
    `;
    const result = await this.db.query(query, [userId]);
    return result.rows.map((row: any) => ({
      id: row.id,
      action: row.action,
      resourceType: row.resource_type,
      resourceId: row.resource_id ?? null,
      metadata: (row.metadata && typeof row.metadata === 'object' ? row.metadata : {}) as Record<
        string,
        unknown
      >,
      createdAt: row.created_at.toISOString(),
    }));
  }
}
