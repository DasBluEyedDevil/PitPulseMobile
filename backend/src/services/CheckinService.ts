import Database from '../config/database';
import { EventService } from './EventService';
import { VenueService } from './VenueService';
import { BandService } from './BandService';

interface CreateCheckinRequest {
  userId: string;
  venueId: string;
  bandId: string;
  eventDate: Date;
  venueRating?: number;
  bandRating?: number;
  reviewText?: string;
  imageUrls?: string[];
}

interface Checkin {
  id: string;
  userId: string;
  eventId: string;
  venueRating?: number;
  bandRating?: number;
  reviewText?: string;
  imageUrls?: string[];
  createdAt: Date;
  updatedAt: Date;
  user?: any;
  event?: any;
  toastCount?: number;
  commentCount?: number;
  hasUserToasted?: boolean;
}

interface Comment {
  id: string;
  checkinId: string;
  userId: string;
  commentText: string;
  createdAt: Date;
  user?: any;
}

export class CheckinService {
  private db = Database.getInstance();
  private eventService = new EventService();
  private venueService = new VenueService();
  private bandService = new BandService();

  /**
   * Create a new check-in
   * Creates event if it doesn't exist
   */
  async createCheckin(data: CreateCheckinRequest): Promise<Checkin> {
    try {
      const {
        userId,
        venueId,
        bandId,
        eventDate,
        venueRating,
        bandRating,
        reviewText,
        imageUrls,
      } = data;

      // Create or get event
      const event = await this.eventService.createEvent({
        venueId,
        bandId,
        eventDate,
        createdByUserId: userId,
      });

      // Check if user already checked into this event
      const existingCheckin = await this.db.query(
        'SELECT id FROM checkins WHERE user_id = $1 AND event_id = $2',
        [userId, event.id]
      );

      if (existingCheckin.rows.length > 0) {
        throw new Error('User already checked into this event');
      }

      // Create check-in
      const insertQuery = `
        INSERT INTO checkins (
          user_id, event_id, venue_rating, band_rating,
          review_text, image_urls
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const result = await this.db.query(insertQuery, [
        userId,
        event.id,
        venueRating || null,
        bandRating || null,
        reviewText || null,
        imageUrls || null,
      ]);

      // Update venue and band ratings asynchronously
      if (venueRating) {
        this.venueService.updateVenueRating(venueId).catch(err =>
          console.error('Error updating venue rating:', err)
        );
      }
      if (bandRating) {
        this.bandService.updateBandRating(bandId).catch(err =>
          console.error('Error updating band rating:', err)
        );
      }

      // Return full check-in with details
      return this.getCheckinById(result.rows[0].id, userId);
    } catch (error) {
      console.error('Create check-in error:', error);
      throw error;
    }
  }

  /**
   * Get check-in by ID with full details
   */
  async getCheckinById(checkinId: string, currentUserId?: string): Promise<Checkin> {
    try {
      const query = `
        SELECT
          c.*,
          u.id as user_id, u.username, u.profile_image_url,
          e.id as event_id, e.event_date, e.event_name,
          v.id as venue_id, v.name as venue_name, v.city as venue_city,
          v.state as venue_state, v.image_url as venue_image,
          b.id as band_id, b.name as band_name, b.genre as band_genre,
          b.image_url as band_image,
          COUNT(DISTINCT t.id) as toast_count,
          COUNT(DISTINCT cm.id) as comment_count
          ${currentUserId ? `, EXISTS(
            SELECT 1 FROM checkin_toasts
            WHERE checkin_id = c.id AND user_id = $2
          ) as has_user_toasted` : ''}
        FROM checkins c
        LEFT JOIN users u ON c.user_id = u.id
        LEFT JOIN events e ON c.event_id = e.id
        LEFT JOIN venues v ON e.venue_id = v.id
        LEFT JOIN bands b ON e.band_id = b.id
        LEFT JOIN checkin_toasts t ON c.id = t.checkin_id
        LEFT JOIN checkin_comments cm ON c.id = cm.checkin_id
        WHERE c.id = $1
        GROUP BY c.id, u.id, e.id, v.id, b.id
      `;

      const params = currentUserId ? [checkinId, currentUserId] : [checkinId];
      const result = await this.db.query(query, params);

      if (result.rows.length === 0) {
        throw new Error('Check-in not found');
      }

      return this.mapDbCheckinToCheckin(result.rows[0]);
    } catch (error) {
      console.error('Get check-in error:', error);
      throw error;
    }
  }

  /**
   * Get activity feed
   * Filters: 'friends', 'nearby', 'global'
   */
  async getActivityFeed(
    userId: string,
    filter: 'friends' | 'nearby' | 'global' = 'friends',
    options: { limit?: number; offset?: number } = {}
  ): Promise<Checkin[]> {
    try {
      const { limit = 50, offset = 0 } = options;

      let whereClause = '';
      let params: any[] = [userId];

      if (filter === 'friends') {
        // Get check-ins from friends
        whereClause = `
          WHERE c.user_id IN (
            SELECT following_id FROM user_followers WHERE follower_id = $1
          )
        `;
      } else if (filter === 'nearby') {
        // Get check-ins from venues within 40 miles of user's location
        // This would require user's location - placeholder for now
        whereClause = 'WHERE 1=1'; // TODO: Implement geolocation filter
      } else {
        // Global feed - all check-ins
        whereClause = 'WHERE 1=1';
      }

      const query = `
        SELECT
          c.*,
          u.id as user_id, u.username, u.profile_image_url,
          e.id as event_id, e.event_date, e.event_name,
          v.id as venue_id, v.name as venue_name, v.city as venue_city,
          v.state as venue_state, v.image_url as venue_image,
          b.id as band_id, b.name as band_name, b.genre as band_genre,
          b.image_url as band_image,
          COUNT(DISTINCT t.id) as toast_count,
          COUNT(DISTINCT cm.id) as comment_count,
          EXISTS(
            SELECT 1 FROM checkin_toasts
            WHERE checkin_id = c.id AND user_id = $1
          ) as has_user_toasted
        FROM checkins c
        LEFT JOIN users u ON c.user_id = u.id
        LEFT JOIN events e ON c.event_id = e.id
        LEFT JOIN venues v ON e.venue_id = v.id
        LEFT JOIN bands b ON e.band_id = b.id
        LEFT JOIN checkin_toasts t ON c.id = t.checkin_id
        LEFT JOIN checkin_comments cm ON c.id = cm.checkin_id
        ${whereClause}
        GROUP BY c.id, u.id, e.id, v.id, b.id
        ORDER BY c.created_at DESC
        LIMIT $2 OFFSET $3
      `;

      params.push(limit, offset);
      const result = await this.db.query(query, params);

      return result.rows.map((row: any) => this.mapDbCheckinToCheckin(row));
    } catch (error) {
      console.error('Get activity feed error:', error);
      throw error;
    }
  }

  /**
   * Toast a check-in (like Untappd's toast feature)
   */
  async toastCheckin(userId: string, checkinId: string): Promise<void> {
    try {
      // Check if already toasted
      const existingToast = await this.db.query(
        'SELECT id FROM checkin_toasts WHERE checkin_id = $1 AND user_id = $2',
        [checkinId, userId]
      );

      if (existingToast.rows.length > 0) {
        throw new Error('Already toasted this check-in');
      }

      // Create toast
      await this.db.query(
        'INSERT INTO checkin_toasts (checkin_id, user_id) VALUES ($1, $2)',
        [checkinId, userId]
      );
    } catch (error) {
      console.error('Toast check-in error:', error);
      throw error;
    }
  }

  /**
   * Untoast a check-in
   */
  async untoastCheckin(userId: string, checkinId: string): Promise<void> {
    try {
      await this.db.query(
        'DELETE FROM checkin_toasts WHERE checkin_id = $1 AND user_id = $2',
        [checkinId, userId]
      );
    } catch (error) {
      console.error('Untoast check-in error:', error);
      throw error;
    }
  }

  /**
   * Add a comment to a check-in
   */
  async addComment(
    userId: string,
    checkinId: string,
    commentText: string
  ): Promise<Comment> {
    try {
      const query = `
        INSERT INTO checkin_comments (checkin_id, user_id, comment_text)
        VALUES ($1, $2, $3)
        RETURNING *
      `;

      const result = await this.db.query(query, [checkinId, userId, commentText]);

      // Get comment with user details
      return this.getCommentById(result.rows[0].id);
    } catch (error) {
      console.error('Add comment error:', error);
      throw error;
    }
  }

  /**
   * Get comments for a check-in
   */
  async getComments(checkinId: string): Promise<Comment[]> {
    try {
      const query = `
        SELECT
          c.*,
          u.id as user_id, u.username, u.profile_image_url
        FROM checkin_comments c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.checkin_id = $1
        ORDER BY c.created_at ASC
      `;

      const result = await this.db.query(query, [checkinId]);

      return result.rows.map((row: any) => ({
        id: row.id,
        checkinId: row.checkin_id,
        userId: row.user_id,
        commentText: row.comment_text,
        createdAt: row.created_at,
        user: {
          id: row.user_id,
          username: row.username,
          profileImageUrl: row.profile_image_url,
        },
      }));
    } catch (error) {
      console.error('Get comments error:', error);
      throw error;
    }
  }

  /**
   * Delete a check-in
   */
  async deleteCheckin(userId: string, checkinId: string): Promise<void> {
    try {
      // Verify user owns the check-in
      const checkin = await this.db.query(
        'SELECT user_id FROM checkins WHERE id = $1',
        [checkinId]
      );

      if (checkin.rows.length === 0) {
        throw new Error('Check-in not found');
      }

      if (checkin.rows[0].user_id !== userId) {
        throw new Error('Unauthorized to delete this check-in');
      }

      // Delete check-in (cascades to toasts and comments)
      await this.db.query('DELETE FROM checkins WHERE id = $1', [checkinId]);
    } catch (error) {
      console.error('Delete check-in error:', error);
      throw error;
    }
  }

  /**
   * Get comment by ID
   */
  private async getCommentById(commentId: string): Promise<Comment> {
    const query = `
      SELECT
        c.*,
        u.id as user_id, u.username, u.profile_image_url
      FROM checkin_comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.id = $1
    `;

    const result = await this.db.query(query, [commentId]);

    if (result.rows.length === 0) {
      throw new Error('Comment not found');
    }

    const row = result.rows[0];
    return {
      id: row.id,
      checkinId: row.checkin_id,
      userId: row.user_id,
      commentText: row.comment_text,
      createdAt: row.created_at,
      user: {
        id: row.user_id,
        username: row.username,
        profileImageUrl: row.profile_image_url,
      },
    };
  }

  /**
   * Map database check-in row to Checkin type
   */
  private mapDbCheckinToCheckin(row: any): Checkin {
    return {
      id: row.id,
      userId: row.user_id,
      eventId: row.event_id,
      venueRating: row.venue_rating,
      bandRating: row.band_rating,
      reviewText: row.review_text,
      imageUrls: row.image_urls || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      user: row.username ? {
        id: row.user_id,
        username: row.username,
        profileImageUrl: row.profile_image_url,
      } : undefined,
      event: row.event_date ? {
        id: row.event_id,
        eventDate: row.event_date,
        eventName: row.event_name,
        venue: {
          id: row.venue_id,
          name: row.venue_name,
          city: row.venue_city,
          state: row.venue_state,
          imageUrl: row.venue_image,
        },
        band: {
          id: row.band_id,
          name: row.band_name,
          genre: row.band_genre,
          imageUrl: row.band_image,
        },
      } : undefined,
      toastCount: parseInt(row.toast_count || 0),
      commentCount: parseInt(row.comment_count || 0),
      hasUserToasted: row.has_user_toasted || false,
    };
  }
}
