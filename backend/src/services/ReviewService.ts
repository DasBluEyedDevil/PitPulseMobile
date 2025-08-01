import Database from '../config/database';
import { Review, CreateReviewRequest, SearchQuery, User, Venue, Band } from '../types';
import { VenueService } from './VenueService';
import { BandService } from './BandService';
import { BadgeService } from './BadgeService';

export class ReviewService {
  private db = Database.getInstance();
  private venueService = new VenueService();
  private bandService = new BandService();
  private badgeService = new BadgeService();

  /**
   * Create a new review
   */
  async createReview(userId: string, reviewData: CreateReviewRequest): Promise<Review> {
    const {
      venueId,
      bandId,
      rating,
      title,
      content,
      eventDate,
      imageUrls,
    } = reviewData;

    // Validate that exactly one target is specified
    if ((!venueId && !bandId) || (venueId && bandId)) {
      throw new Error('Review must be for either a venue or a band, not both');
    }

    // Validate rating
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    // Check if venue or band exists
    if (venueId) {
      const venue = await this.venueService.getVenueById(venueId);
      if (!venue) {
        throw new Error('Venue not found');
      }
    }

    if (bandId) {
      const band = await this.bandService.getBandById(bandId);
      if (!band) {
        throw new Error('Band not found');
      }
    }

    // Check if user already reviewed this venue/band
    const existingReview = await this.findExistingReview(userId, venueId, bandId);
    if (existingReview) {
      throw new Error('You have already reviewed this venue/band');
    }

    const query = `
      INSERT INTO reviews (user_id, venue_id, band_id, rating, title, content, event_date, image_urls)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, user_id, venue_id, band_id, rating, title, content, event_date,
                image_urls, is_verified, helpful_count, created_at, updated_at
    `;

    const values = [
      userId,
      venueId || null,
      bandId || null,
      rating,
      title || null,
      content || null,
      eventDate || null,
      imageUrls || null,
    ];

    const result = await this.db.query(query, values);
    const review = this.mapDbReviewToReview(result.rows[0]);

    // Update venue or band rating
    if (venueId) {
      await this.venueService.updateVenueRating(venueId);
    } else if (bandId) {
      await this.bandService.updateBandRating(bandId);
    }

    // Check for badge awards (non-blocking)
    this.badgeService.checkAndAwardBadges(userId).catch(error => {
      console.error('Error checking badge awards:', error);
    });

    return review;
  }

  /**
   * Get review by ID
   */
  async getReviewById(reviewId: string, includeRelated: boolean = true): Promise<Review | null> {
    let query = `
      SELECT r.id, r.user_id, r.venue_id, r.band_id, r.rating, r.title, r.content,
             r.event_date, r.image_urls, r.is_verified, r.helpful_count, 
             r.created_at, r.updated_at
    `;

    if (includeRelated) {
      query += `,
             u.username, u.first_name, u.last_name, u.profile_image_url, u.is_verified as user_verified,
             v.name as venue_name, v.city as venue_city, v.image_url as venue_image,
             b.name as band_name, b.genre as band_genre, b.image_url as band_image
      `;
    }

    query += `
      FROM reviews r
    `;

    if (includeRelated) {
      query += `
        LEFT JOIN users u ON r.user_id = u.id
        LEFT JOIN venues v ON r.venue_id = v.id
        LEFT JOIN bands b ON r.band_id = b.id
      `;
    }

    query += `
      WHERE r.id = $1
    `;

    const result = await this.db.query(query, [reviewId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const review = this.mapDbReviewToReview(result.rows[0]);

    if (includeRelated) {
      const row = result.rows[0];
      
      // Add user info
      if (row.username) {
        review.user = {
          id: row.user_id,
          username: row.username,
          firstName: row.first_name,
          lastName: row.last_name,
          profileImageUrl: row.profile_image_url,
          isVerified: row.user_verified,
        } as User;
      }

      // Add venue info
      if (row.venue_name) {
        review.venue = {
          id: review.venueId!,
          name: row.venue_name,
          city: row.venue_city,
          imageUrl: row.venue_image,
        } as Venue;
      }

      // Add band info
      if (row.band_name) {
        review.band = {
          id: review.bandId!,
          name: row.band_name,
          genre: row.band_genre,
          imageUrl: row.band_image,
        } as Band;
      }
    }

    return review;
  }

  /**
   * Search reviews with filters and pagination
   */
  async searchReviews(searchQuery: SearchQuery & {
    userId?: string;
    venueId?: string;
    bandId?: string;
    minRating?: number;
    maxRating?: number;
  }): Promise<{
    reviews: Review[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const {
      q = '',
      userId,
      venueId,
      bandId,
      minRating,
      maxRating,
      page = 1,
      limit = 20,
      sort = 'created_at',
      order = 'desc',
    } = searchQuery;

    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    // Text search
    if (q.trim()) {
      conditions.push(`(r.title ILIKE $${paramCount} OR r.content ILIKE $${paramCount})`);
      values.push(`%${q.trim()}%`);
      paramCount++;
    }

    // User filter
    if (userId) {
      conditions.push(`r.user_id = $${paramCount}`);
      values.push(userId);
      paramCount++;
    }

    // Venue filter
    if (venueId) {
      conditions.push(`r.venue_id = $${paramCount}`);
      values.push(venueId);
      paramCount++;
    }

    // Band filter
    if (bandId) {
      conditions.push(`r.band_id = $${paramCount}`);
      values.push(bandId);
      paramCount++;
    }

    // Rating filters
    if (minRating) {
      conditions.push(`r.rating >= $${paramCount}`);
      values.push(minRating);
      paramCount++;
    }

    if (maxRating) {
      conditions.push(`r.rating <= $${paramCount}`);
      values.push(maxRating);
      paramCount++;
    }

    // Validate sort column
    const allowedSortColumns = ['created_at', 'rating', 'helpful_count'];
    const sortColumn = allowedSortColumns.includes(sort) ? `r.${sort}` : 'r.created_at';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count query
    const countQuery = `
      SELECT COUNT(*) as total
      FROM reviews r
      ${whereClause}
    `;

    // Main query with related data
    const mainQuery = `
      SELECT r.id, r.user_id, r.venue_id, r.band_id, r.rating, r.title, r.content,
             r.event_date, r.image_urls, r.is_verified, r.helpful_count, 
             r.created_at, r.updated_at,
             u.username, u.first_name, u.last_name, u.profile_image_url, u.is_verified as user_verified,
             v.name as venue_name, v.city as venue_city, v.image_url as venue_image,
             b.name as band_name, b.genre as band_genre, b.image_url as band_image
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN venues v ON r.venue_id = v.id
      LEFT JOIN bands b ON r.band_id = b.id
      ${whereClause}
      ORDER BY ${sortColumn} ${sortOrder}
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    values.push(limit, offset);

    const [countResult, reviewsResult] = await Promise.all([
      this.db.query(countQuery, values.slice(0, -2)),
      this.db.query(mainQuery, values),
    ]);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);
    const reviews = reviewsResult.rows.map(row => {
      const review = this.mapDbReviewToReview(row);
      
      // Add related data
      if (row.username) {
        review.user = {
          id: row.user_id,
          username: row.username,
          firstName: row.first_name,
          lastName: row.last_name,
          profileImageUrl: row.profile_image_url,
          isVerified: row.user_verified,
        } as User;
      }

      if (row.venue_name) {
        review.venue = {
          id: review.venueId!,
          name: row.venue_name,
          city: row.venue_city,
          imageUrl: row.venue_image,
        } as Venue;
      }

      if (row.band_name) {
        review.band = {
          id: review.bandId!,
          name: row.band_name,
          genre: row.band_genre,
          imageUrl: row.band_image,
        } as Band;
      }

      return review;
    });

    return {
      reviews,
      total,
      page,
      totalPages,
    };
  }

  /**
   * Update review
   */
  async updateReview(reviewId: string, userId: string, updateData: Partial<CreateReviewRequest>): Promise<Review> {
    // First check if review exists and belongs to user
    const existingReview = await this.getReviewById(reviewId, false);
    if (!existingReview) {
      throw new Error('Review not found');
    }

    if (existingReview.userId !== userId) {
      throw new Error('You can only update your own reviews');
    }

    const allowedFields = ['rating', 'title', 'content', 'eventDate', 'imageUrls'];
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key) && value !== undefined) {
        if (key === 'rating' && (value < 1 || value > 5)) {
          throw new Error('Rating must be between 1 and 5');
        }
        
        const dbField = this.camelToSnakeCase(key);
        updates.push(`${dbField} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(reviewId);
    const query = `
      UPDATE reviews 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING id, user_id, venue_id, band_id, rating, title, content, event_date,
                image_urls, is_verified, helpful_count, created_at, updated_at
    `;

    const result = await this.db.query(query, values);
    const review = this.mapDbReviewToReview(result.rows[0]);

    // Update venue or band rating if rating changed
    if (updateData.rating !== undefined) {
      if (existingReview.venueId) {
        await this.venueService.updateVenueRating(existingReview.venueId);
      } else if (existingReview.bandId) {
        await this.bandService.updateBandRating(existingReview.bandId);
      }
    }

    return review;
  }

  /**
   * Delete review
   */
  async deleteReview(reviewId: string, userId: string): Promise<void> {
    // First check if review exists and belongs to user
    const existingReview = await this.getReviewById(reviewId, false);
    if (!existingReview) {
      throw new Error('Review not found');
    }

    if (existingReview.userId !== userId) {
      throw new Error('You can only delete your own reviews');
    }

    const query = `DELETE FROM reviews WHERE id = $1`;
    await this.db.query(query, [reviewId]);

    // Update venue or band rating
    if (existingReview.venueId) {
      await this.venueService.updateVenueRating(existingReview.venueId);
    } else if (existingReview.bandId) {
      await this.bandService.updateBandRating(existingReview.bandId);
    }
  }

  /**
   * Mark review as helpful or not helpful
   */
  async markReviewHelpful(reviewId: string, userId: string, isHelpful: boolean): Promise<void> {
    // Check if review exists
    const review = await this.getReviewById(reviewId, false);
    if (!review) {
      throw new Error('Review not found');
    }

    // Can't mark own review as helpful
    if (review.userId === userId) {
      throw new Error('You cannot mark your own review as helpful');
    }

    // Check if user already marked this review
    const existingQuery = `
      SELECT id, is_helpful FROM review_helpfulness 
      WHERE user_id = $1 AND review_id = $2
    `;
    const existingResult = await this.db.query(existingQuery, [userId, reviewId]);

    if (existingResult.rows.length > 0) {
      // Update existing
      if (existingResult.rows[0].is_helpful !== isHelpful) {
        const updateQuery = `
          UPDATE review_helpfulness 
          SET is_helpful = $1 
          WHERE user_id = $2 AND review_id = $3
        `;
        await this.db.query(updateQuery, [isHelpful, userId, reviewId]);
      }
    } else {
      // Insert new
      const insertQuery = `
        INSERT INTO review_helpfulness (user_id, review_id, is_helpful)
        VALUES ($1, $2, $3)
      `;
      await this.db.query(insertQuery, [userId, reviewId, isHelpful]);
    }

    // Update helpful count on review
    const updateCountQuery = `
      UPDATE reviews 
      SET helpful_count = (
        SELECT COUNT(*) FROM review_helpfulness 
        WHERE review_id = $1 AND is_helpful = true
      )
      WHERE id = $1
    `;
    await this.db.query(updateCountQuery, [reviewId]);
  }

  /**
   * Get user's review for a venue or band
   */
  async getUserReview(userId: string, venueId?: string, bandId?: string): Promise<Review | null> {
    if ((!venueId && !bandId) || (venueId && bandId)) {
      throw new Error('Must specify either venueId or bandId');
    }

    const query = `
      SELECT id, user_id, venue_id, band_id, rating, title, content, event_date,
             image_urls, is_verified, helpful_count, created_at, updated_at
      FROM reviews
      WHERE user_id = $1 AND ${venueId ? 'venue_id = $2' : 'band_id = $2'}
    `;

    const result = await this.db.query(query, [userId, venueId || bandId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapDbReviewToReview(result.rows[0]);
  }

  /**
   * Check if user already reviewed venue/band
   */
  private async findExistingReview(userId: string, venueId?: string, bandId?: string): Promise<Review | null> {
    return await this.getUserReview(userId, venueId, bandId);
  }

  /**
   * Map database review row to Review type
   */
  private mapDbReviewToReview(row: any): Review {
    return {
      id: row.id,
      userId: row.user_id,
      venueId: row.venue_id,
      bandId: row.band_id,
      rating: row.rating,
      title: row.title,
      content: row.content,
      eventDate: row.event_date,
      imageUrls: row.image_urls,
      isVerified: row.is_verified,
      helpfulCount: row.helpful_count || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Convert camelCase to snake_case
   */
  private camelToSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}