import { Band, CreateBandRequest, SearchQuery } from '../types';
export declare class BandService {
    private db;
    /**
     * Create a new band
     */
    createBand(bandData: CreateBandRequest): Promise<Band>;
    /**
     * Get band by ID
     */
    getBandById(bandId: string): Promise<Band | null>;
    /**
     * Search bands with filters and pagination
     */
    searchBands(searchQuery: SearchQuery): Promise<{
        bands: Band[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    /**
     * Update band
     */
    updateBand(bandId: string, updateData: Partial<CreateBandRequest>): Promise<Band>;
    /**
     * Delete band (soft delete)
     */
    deleteBand(bandId: string): Promise<void>;
    /**
     * Get popular bands (by average rating and review count)
     */
    getPopularBands(limit?: number): Promise<Band[]>;
    /**
     * Get bands by genre
     */
    getBandsByGenre(genre: string, limit?: number): Promise<Band[]>;
    /**
     * Get trending bands (recently added with good ratings)
     */
    getTrendingBands(limit?: number): Promise<Band[]>;
    /**
     * Get all unique genres
     */
    getGenres(): Promise<string[]>;
    /**
     * Update band rating after review
     */
    updateBandRating(bandId: string): Promise<void>;
    /**
     * Map database band row to Band type
     */
    private mapDbBandToBand;
    /**
     * Convert camelCase to snake_case
     */
    private camelToSnakeCase;
}
//# sourceMappingURL=BandService.d.ts.map