import { Request, Response } from 'express';
export declare class VenueController {
    private venueService;
    /**
     * Create a new venue
     * POST /api/venues
     */
    createVenue: (req: Request, res: Response) => Promise<void>;
    /**
     * Get all venues with search and filters
     * GET /api/venues
     */
    getVenues: (req: Request, res: Response) => Promise<void>;
    /**
     * Get venue by ID
     * GET /api/venues/:id
     */
    getVenueById: (req: Request, res: Response) => Promise<void>;
    /**
     * Update venue
     * PUT /api/venues/:id
     */
    updateVenue: (req: Request, res: Response) => Promise<void>;
    /**
     * Delete venue
     * DELETE /api/venues/:id
     */
    deleteVenue: (req: Request, res: Response) => Promise<void>;
    /**
     * Get popular venues
     * GET /api/venues/popular
     */
    getPopularVenues: (req: Request, res: Response) => Promise<void>;
    /**
     * Get venues near location
     * GET /api/venues/near
     */
    getVenuesNear: (req: Request, res: Response) => Promise<void>;
}
//# sourceMappingURL=VenueController.d.ts.map