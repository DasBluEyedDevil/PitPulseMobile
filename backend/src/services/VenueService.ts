import Database from '../config/database';
import { Venue, CreateVenueRequest, SearchQuery } from '../types';

export class VenueService {
  private db = Database.getInstance();

  /**
   * Create a new venue
   */
  async createVenue(venueData: CreateVenueRequest): Promise<Venue> {
    const {
      name,
      description,
      address,
      city,
      state,
      country,
      postalCode,
      latitude,
      longitude,
      websiteUrl,
      phone,
      email,
      capacity,
      venueType,
      imageUrl,
    } = venueData;

    const query = `
      INSERT INTO venues (name, description, address, city, state, country, postal_code,
                         latitude, longitude, website_url, phone, email, capacity, 
                         venue_type, image_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING id, name, description, address, city, state, country, postal_code,
                latitude, longitude, website_url, phone, email, capacity, venue_type,
                image_url, average_rating, total_reviews, is_active, created_at, updated_at
    `;

    const values = [
      name,
      description || null,
      address || null,
      city || null,
      state || null,
      country || null,
      postalCode || null,
      latitude || null,
      longitude || null,
      websiteUrl || null,
      phone || null,
      email || null,
      capacity || null,
      venueType || null,
      imageUrl || null,
    ];

    const result = await this.db.query(query, values);
    return this.mapDbVenueToVenue(result.rows[0]);
  }

  /**
   * Get venue by ID
   */
  async getVenueById(venueId: string): Promise<Venue | null> {
    const query = `
      SELECT id, name, description, address, city, state, country, postal_code,
             latitude, longitude, website_url, phone, email, capacity, venue_type,
             image_url, average_rating, total_reviews, is_active, created_at, updated_at
      FROM venues
      WHERE id = $1 AND is_active = true
    `;

    const result = await this.db.query(query, [venueId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapDbVenueToVenue(result.rows[0]);
  }

  /**
   * Search venues with filters and pagination
   */
  async searchVenues(searchQuery: SearchQuery): Promise<{
    venues: Venue[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const {
      q = '',
      city,
      venueType,
      rating,
      page = 1,
      limit = 20,
      sort = 'name',
      order = 'asc',
    } = searchQuery;

    const offset = (page - 1) * limit;
    const conditions: string[] = ['is_active = true'];
    const values: any[] = [];
    let paramCount = 1;

    // Text search
    if (q.trim()) {
      conditions.push(`(name ILIKE $${paramCount} OR description ILIKE $${paramCount} OR city ILIKE $${paramCount})`);
      values.push(`%${q.trim()}%`);
      paramCount++;
    }

    // City filter
    if (city) {
      conditions.push(`city ILIKE $${paramCount}`);
      values.push(`%${city}%`);
      paramCount++;
    }

    // Venue type filter
    if (venueType) {
      conditions.push(`venue_type = $${paramCount}`);
      values.push(venueType);
      paramCount++;
    }

    // Rating filter
    if (rating) {
      conditions.push(`average_rating >= $${paramCount}`);
      values.push(rating);
      paramCount++;
    }

    // Validate sort column
    const allowedSortColumns = ['name', 'city', 'average_rating', 'total_reviews', 'capacity', 'created_at'];
    const sortColumn = allowedSortColumns.includes(sort) ? sort : 'name';
    const sortOrder = order === 'desc' ? 'DESC' : 'ASC';

    // Count query
    const countQuery = `
      SELECT COUNT(*) as total
      FROM venues
      WHERE ${conditions.join(' AND ')}
    `;

    // Main query
    const mainQuery = `
      SELECT id, name, description, address, city, state, country, postal_code,
             latitude, longitude, website_url, phone, email, capacity, venue_type,
             image_url, average_rating, total_reviews, is_active, created_at, updated_at
      FROM venues
      WHERE ${conditions.join(' AND ')}
      ORDER BY ${sortColumn} ${sortOrder}
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    values.push(limit, offset);

    const [countResult, venuesResult] = await Promise.all([
      this.db.query(countQuery, values.slice(0, -2)),
      this.db.query(mainQuery, values),
    ]);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);
    const venues = venuesResult.rows.map(row => this.mapDbVenueToVenue(row));

    return {
      venues,
      total,
      page,
      totalPages,
    };
  }

  /**
   * Update venue
   */
  async updateVenue(venueId: string, updateData: Partial<CreateVenueRequest>): Promise<Venue> {
    const allowedFields = [
      'name', 'description', 'address', 'city', 'state', 'country', 'postalCode',
      'latitude', 'longitude', 'websiteUrl', 'phone', 'email', 'capacity', 
      'venueType', 'imageUrl'
    ];
    
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key) && value !== undefined) {
        const dbField = this.camelToSnakeCase(key);
        updates.push(`${dbField} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(venueId);
    const query = `
      UPDATE venues 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount} AND is_active = true
      RETURNING id, name, description, address, city, state, country, postal_code,
                latitude, longitude, website_url, phone, email, capacity, venue_type,
                image_url, average_rating, total_reviews, is_active, created_at, updated_at
    `;

    const result = await this.db.query(query, values);
    
    if (result.rows.length === 0) {
      throw new Error('Venue not found or inactive');
    }

    return this.mapDbVenueToVenue(result.rows[0]);
  }

  /**
   * Delete venue (soft delete)
   */
  async deleteVenue(venueId: string): Promise<void> {
    const query = `
      UPDATE venues 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    await this.db.query(query, [venueId]);
  }

  /**
   * Get popular venues (by average rating and review count)
   */
  async getPopularVenues(limit: number = 10): Promise<Venue[]> {
    const query = `
      SELECT id, name, description, address, city, state, country, postal_code,
             latitude, longitude, website_url, phone, email, capacity, venue_type,
             image_url, average_rating, total_reviews, is_active, created_at, updated_at
      FROM venues
      WHERE is_active = true AND total_reviews >= 5
      ORDER BY (average_rating * 0.7 + LEAST(total_reviews/100.0, 1.0) * 0.3) DESC
      LIMIT $1
    `;

    const result = await this.db.query(query, [limit]);
    return result.rows.map(row => this.mapDbVenueToVenue(row));
  }

  /**
   * Get venues near coordinates
   */
  async getVenuesNear(
    latitude: number,
    longitude: number,
    radiusKm: number = 50,
    limit: number = 20
  ): Promise<Venue[]> {
    const query = `
      SELECT id, name, description, address, city, state, country, postal_code,
             latitude, longitude, website_url, phone, email, capacity, venue_type,
             image_url, average_rating, total_reviews, is_active, created_at, updated_at,
             (6371 * acos(cos(radians($1)) * cos(radians(latitude)) * 
              cos(radians(longitude) - radians($2)) + 
              sin(radians($1)) * sin(radians(latitude)))) AS distance
      FROM venues
      WHERE is_active = true 
        AND latitude IS NOT NULL 
        AND longitude IS NOT NULL
      HAVING distance <= $3
      ORDER BY distance
      LIMIT $4
    `;

    const result = await this.db.query(query, [latitude, longitude, radiusKm, limit]);
    return result.rows.map(row => this.mapDbVenueToVenue(row));
  }

  /**
   * Update venue rating after review
   */
  async updateVenueRating(venueId: string): Promise<void> {
    const query = `
      UPDATE venues 
      SET 
        average_rating = (
          SELECT COALESCE(AVG(rating::numeric), 0)
          FROM reviews 
          WHERE venue_id = $1
        ),
        total_reviews = (
          SELECT COUNT(*)
          FROM reviews
          WHERE venue_id = $1
        ),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    await this.db.query(query, [venueId]);
  }

  /**
   * Map database venue row to Venue type
   */
  private mapDbVenueToVenue(row: any): Venue {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      address: row.address,
      city: row.city,
      state: row.state,
      country: row.country,
      postalCode: row.postal_code,
      latitude: row.latitude ? parseFloat(row.latitude) : undefined,
      longitude: row.longitude ? parseFloat(row.longitude) : undefined,
      websiteUrl: row.website_url,
      phone: row.phone,
      email: row.email,
      capacity: row.capacity,
      venueType: row.venue_type,
      imageUrl: row.image_url,
      averageRating: parseFloat(row.average_rating || 0),
      totalReviews: parseInt(row.total_reviews || 0),
      isActive: row.is_active,
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