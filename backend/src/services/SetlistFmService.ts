import axios, { AxiosInstance } from 'axios';
import Database from '../config/database';

interface SetlistFmVenue {
  id: string;
  name: string;
  city: {
    id: string;
    name: string;
    stateCode?: string;
    state?: string;
    coords?: {
      lat: number;
      long: number;
    };
    country: {
      code: string;
      name: string;
    };
  };
  url?: string;
}

interface SetlistFmArtist {
  mbid: string; // MusicBrainz ID!
  name: string;
  sortName: string;
  disambiguation?: string;
  url?: string;
}

interface SetlistFmSetlist {
  id: string;
  versionId: string;
  eventDate: string; // DD-MM-YYYY format
  artist: SetlistFmArtist;
  venue: SetlistFmVenue;
  tour?: {
    name: string;
  };
  sets?: {
    set: Array<{
      song: Array<{
        name: string;
        cover?: {
          mbid: string;
          name: string;
        };
      }>;
    }>;
  };
  url?: string;
}

interface VenueSearchResponse {
  venue: SetlistFmVenue[];
  total: number;
  page: number;
  itemsPerPage: number;
}

interface ArtistSearchResponse {
  artist: SetlistFmArtist[];
  total: number;
  page: number;
  itemsPerPage: number;
}

interface SetlistSearchResponse {
  setlist: SetlistFmSetlist[];
  total: number;
  page: number;
  itemsPerPage: number;
}

export class SetlistFmService {
  private client: AxiosInstance;
  private db = Database.getInstance();
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.SETLISTFM_API_KEY || '';

    if (!this.apiKey) {
      throw new Error('SETLISTFM_API_KEY environment variable is required');
    }

    this.client = axios.create({
      baseURL: 'https://api.setlist.fm/rest/1.0',
      headers: {
        'x-api-key': this.apiKey,
        'Accept': 'application/json',
        'Accept-Language': 'en',
      },
    });
  }

  /**
   * Search for venues by name and/or city
   */
  async searchVenues(
    venueName?: string,
    cityName?: string,
    countryCode?: string,
    page: number = 1
  ): Promise<SetlistFmVenue[]> {
    try {
      const params: any = {
        p: page,
      };

      if (venueName) {
        params.name = venueName;
      }

      if (cityName) {
        params.cityName = cityName;
      }

      if (countryCode) {
        params.country = countryCode;
      }

      const response = await this.client.get<VenueSearchResponse>('/search/venues', {
        params,
      });

      return response.data.venue || [];
    } catch (error) {
      console.error('setlist.fm venue search error:', error);
      throw new Error('Failed to search venues from setlist.fm');
    }
  }

  /**
   * Search for artists by name
   */
  async searchArtists(
    artistName: string,
    page: number = 1
  ): Promise<SetlistFmArtist[]> {
    try {
      const response = await this.client.get<ArtistSearchResponse>('/search/artists', {
        params: {
          artistName,
          p: page,
        },
      });

      return response.data.artist || [];
    } catch (error) {
      console.error('setlist.fm artist search error:', error);
      throw new Error('Failed to search artists from setlist.fm');
    }
  }

  /**
   * Search for setlists by artist, venue, date, etc.
   */
  async searchSetlists(options: {
    artistName?: string;
    artistMbid?: string;
    venueId?: string;
    cityName?: string;
    date?: string; // DD-MM-YYYY format
    year?: number;
    page?: number;
  }): Promise<SetlistFmSetlist[]> {
    try {
      const params: any = {
        p: options.page || 1,
      };

      if (options.artistName) params.artistName = options.artistName;
      if (options.artistMbid) params.artistMbid = options.artistMbid;
      if (options.venueId) params.venueId = options.venueId;
      if (options.cityName) params.cityName = options.cityName;
      if (options.date) params.date = options.date;
      if (options.year) params.year = options.year;

      const response = await this.client.get<SetlistSearchResponse>('/search/setlists', {
        params,
      });

      return response.data.setlist || [];
    } catch (error) {
      console.error('setlist.fm setlist search error:', error);
      throw new Error('Failed to search setlists from setlist.fm');
    }
  }

  /**
   * Get a specific setlist by ID
   */
  async getSetlistById(setlistId: string): Promise<SetlistFmSetlist> {
    try {
      const response = await this.client.get<SetlistFmSetlist>(
        `/setlist/${setlistId}`
      );

      return response.data;
    } catch (error) {
      console.error('setlist.fm getSetlistById error:', error);
      throw new Error('Failed to get setlist from setlist.fm');
    }
  }

  /**
   * Import a venue from setlist.fm to our database
   * Returns the venue if already exists or creates new one
   */
  async importVenue(venueId: string): Promise<any> {
    try {
      // Check if venue already exists
      const existingVenue = await this.db.query(
        'SELECT * FROM venues WHERE setlistfm_venue_id = $1',
        [venueId]
      );

      if (existingVenue.rows.length > 0) {
        return {
          ...this.mapDbVenueToVenue(existingVenue.rows[0]),
          alreadyExists: true,
        };
      }

      // Fetch venue details from setlist.fm by searching
      // Note: setlist.fm API doesn't have a direct "get venue by ID" endpoint
      // We need to get it from a setlist that used this venue
      const setlists = await this.searchSetlists({ venueId, page: 1 });

      if (!setlists || setlists.length === 0) {
        throw new Error('Venue not found on setlist.fm');
      }

      const venueData = setlists[0].venue;

      // Determine venue type (default to club for now)
      const venueType = 'club'; // setlist.fm doesn't provide venue type

      // Insert venue into database
      const insertQuery = `
        INSERT INTO venues (
          name, address, city, state, country, postal_code,
          latitude, longitude, venue_type,
          setlistfm_venue_id, source
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;

      const values = [
        venueData.name,
        null, // setlist.fm doesn't provide street address
        venueData.city.name,
        venueData.city.state || venueData.city.stateCode || null,
        venueData.city.country.name,
        null, // setlist.fm doesn't provide postal code
        venueData.city.coords?.lat || null,
        venueData.city.coords?.long || null,
        venueType,
        venueId,
        'setlistfm',
      ];

      const result = await this.db.query(insertQuery, values);

      return {
        ...this.mapDbVenueToVenue(result.rows[0]),
        alreadyExists: false,
      };
    } catch (error) {
      console.error('setlist.fm import venue error:', error);
      throw error;
    }
  }

  /**
   * Map database venue row to Venue type
   */
  private mapDbVenueToVenue(row: any): any {
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
      setlistfmVenueId: row.setlistfm_venue_id,
      source: row.source,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
