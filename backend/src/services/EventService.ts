import Database from '../config/database';

interface CreateEventRequest {
  venueId: string;
  bandId: string;
  eventDate: Date;
  eventName?: string;
  createdByUserId?: string;
}

interface Event {
  id: string;
  venueId: string;
  bandId: string;
  eventDate: Date;
  eventName?: string;
  createdByUserId?: string;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  venue?: any;
  band?: any;
  checkinCount?: number;
}

export class EventService {
  private db = Database.getInstance();

  /**
   * Create a new event or return existing one
   * Events are unique by venue + band + date combination
   */
  async createEvent(data: CreateEventRequest): Promise<Event> {
    try {
      const { venueId, bandId, eventDate, eventName, createdByUserId } = data;

      // Check if event already exists
      const existingEvent = await this.db.query(
        `SELECT * FROM events
         WHERE venue_id = $1 AND band_id = $2 AND event_date = $3`,
        [venueId, bandId, eventDate]
      );

      if (existingEvent.rows.length > 0) {
        // Return existing event with venue and band details
        return this.getEventById(existingEvent.rows[0].id);
      }

      // Create new event
      const insertQuery = `
        INSERT INTO events (venue_id, band_id, event_date, event_name, created_by_user_id)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;

      const result = await this.db.query(insertQuery, [
        venueId,
        bandId,
        eventDate,
        eventName || null,
        createdByUserId || null,
      ]);

      // Return new event with venue and band details
      return this.getEventById(result.rows[0].id);
    } catch (error) {
      console.error('Create event error:', error);
      throw error;
    }
  }

  /**
   * Get event by ID with venue and band details
   */
  async getEventById(eventId: string): Promise<Event> {
    try {
      const query = `
        SELECT
          e.*,
          v.id as venue_id, v.name as venue_name, v.city as venue_city,
          v.state as venue_state, v.image_url as venue_image,
          b.id as band_id, b.name as band_name, b.genre as band_genre,
          b.image_url as band_image,
          COUNT(c.id) as checkin_count
        FROM events e
        LEFT JOIN venues v ON e.venue_id = v.id
        LEFT JOIN bands b ON e.band_id = b.id
        LEFT JOIN checkins c ON e.id = c.event_id
        WHERE e.id = $1
        GROUP BY e.id, v.id, b.id
      `;

      const result = await this.db.query(query, [eventId]);

      if (result.rows.length === 0) {
        throw new Error('Event not found');
      }

      return this.mapDbEventToEvent(result.rows[0]);
    } catch (error) {
      console.error('Get event error:', error);
      throw error;
    }
  }

  /**
   * Get events at a specific venue
   */
  async getEventsByVenue(
    venueId: string,
    options: { upcoming?: boolean; limit?: number } = {}
  ): Promise<Event[]> {
    try {
      const { upcoming = true, limit = 50 } = options;

      let whereClause = 'WHERE e.venue_id = $1';
      if (upcoming) {
        whereClause += ' AND e.event_date >= CURRENT_DATE';
      }

      const query = `
        SELECT
          e.*,
          v.id as venue_id, v.name as venue_name, v.city as venue_city,
          v.state as venue_state, v.image_url as venue_image,
          b.id as band_id, b.name as band_name, b.genre as band_genre,
          b.image_url as band_image,
          COUNT(c.id) as checkin_count
        FROM events e
        LEFT JOIN venues v ON e.venue_id = v.id
        LEFT JOIN bands b ON e.band_id = b.id
        LEFT JOIN checkins c ON e.id = c.event_id
        ${whereClause}
        GROUP BY e.id, v.id, b.id
        ORDER BY e.event_date ${upcoming ? 'ASC' : 'DESC'}
        LIMIT $2
      `;

      const result = await this.db.query(query, [venueId, limit]);

      return result.rows.map((row: any) => this.mapDbEventToEvent(row));
    } catch (error) {
      console.error('Get events by venue error:', error);
      throw error;
    }
  }

  /**
   * Get events for a specific band
   */
  async getEventsByBand(
    bandId: string,
    options: { upcoming?: boolean; limit?: number } = {}
  ): Promise<Event[]> {
    try {
      const { upcoming = true, limit = 50 } = options;

      let whereClause = 'WHERE e.band_id = $1';
      if (upcoming) {
        whereClause += ' AND e.event_date >= CURRENT_DATE';
      }

      const query = `
        SELECT
          e.*,
          v.id as venue_id, v.name as venue_name, v.city as venue_city,
          v.state as venue_state, v.image_url as venue_image,
          b.id as band_id, b.name as band_name, b.genre as band_genre,
          b.image_url as band_image,
          COUNT(c.id) as checkin_count
        FROM events e
        LEFT JOIN venues v ON e.venue_id = v.id
        LEFT JOIN bands b ON e.band_id = b.id
        LEFT JOIN checkins c ON e.id = c.event_id
        ${whereClause}
        GROUP BY e.id, v.id, b.id
        ORDER BY e.event_date ${upcoming ? 'ASC' : 'DESC'}
        LIMIT $2
      `;

      const result = await this.db.query(query, [bandId, limit]);

      return result.rows.map((row: any) => this.mapDbEventToEvent(row));
    } catch (error) {
      console.error('Get events by band error:', error);
      throw error;
    }
  }

  /**
   * Get upcoming events (across all venues/bands)
   */
  async getUpcomingEvents(limit: number = 50): Promise<Event[]> {
    try {
      const query = `
        SELECT
          e.*,
          v.id as venue_id, v.name as venue_name, v.city as venue_city,
          v.state as venue_state, v.image_url as venue_image,
          b.id as band_id, b.name as band_name, b.genre as band_genre,
          b.image_url as band_image,
          COUNT(c.id) as checkin_count
        FROM events e
        LEFT JOIN venues v ON e.venue_id = v.id
        LEFT JOIN bands b ON e.band_id = b.id
        LEFT JOIN checkins c ON e.id = c.event_id
        WHERE e.event_date >= CURRENT_DATE
        GROUP BY e.id, v.id, b.id
        ORDER BY e.event_date ASC, e.created_at DESC
        LIMIT $1
      `;

      const result = await this.db.query(query, [limit]);

      return result.rows.map((row: any) => this.mapDbEventToEvent(row));
    } catch (error) {
      console.error('Get upcoming events error:', error);
      throw error;
    }
  }

  /**
   * Get trending events (most check-ins recently)
   */
  async getTrendingEvents(limit: number = 20): Promise<Event[]> {
    try {
      const query = `
        SELECT
          e.*,
          v.id as venue_id, v.name as venue_name, v.city as venue_city,
          v.state as venue_state, v.image_url as venue_image,
          b.id as band_id, b.name as band_name, b.genre as band_genre,
          b.image_url as band_image,
          COUNT(c.id) as checkin_count
        FROM events e
        LEFT JOIN venues v ON e.venue_id = v.id
        LEFT JOIN bands b ON e.band_id = b.id
        LEFT JOIN checkins c ON e.id = c.event_id
        WHERE e.event_date >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY e.id, v.id, b.id
        HAVING COUNT(c.id) > 0
        ORDER BY COUNT(c.id) DESC, e.event_date DESC
        LIMIT $1
      `;

      const result = await this.db.query(query, [limit]);

      return result.rows.map((row: any) => this.mapDbEventToEvent(row));
    } catch (error) {
      console.error('Get trending events error:', error);
      throw error;
    }
  }

  /**
   * Delete an event (soft delete or hard delete based on check-ins)
   */
  async deleteEvent(eventId: string): Promise<void> {
    try {
      // Check if event has any check-ins
      const checkinCount = await this.db.query(
        'SELECT COUNT(*) as count FROM checkins WHERE event_id = $1',
        [eventId]
      );

      if (parseInt(checkinCount.rows[0].count) > 0) {
        throw new Error('Cannot delete event with existing check-ins');
      }

      // Delete event (cascades to check-ins if any)
      await this.db.query('DELETE FROM events WHERE id = $1', [eventId]);
    } catch (error) {
      console.error('Delete event error:', error);
      throw error;
    }
  }

  /**
   * Map database event row to Event type
   */
  private mapDbEventToEvent(row: any): Event {
    return {
      id: row.id,
      venueId: row.venue_id,
      bandId: row.band_id,
      eventDate: row.event_date,
      eventName: row.event_name,
      createdByUserId: row.created_by_user_id,
      isVerified: row.is_verified,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      venue: row.venue_name ? {
        id: row.venue_id,
        name: row.venue_name,
        city: row.venue_city,
        state: row.venue_state,
        imageUrl: row.venue_image,
      } : undefined,
      band: row.band_name ? {
        id: row.band_id,
        name: row.band_name,
        genre: row.band_genre,
        imageUrl: row.band_image,
      } : undefined,
      checkinCount: parseInt(row.checkin_count || 0),
    };
  }
}
