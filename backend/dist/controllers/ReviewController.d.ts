import { Request, Response } from 'express';
export declare class ReviewController {
    private reviewService;
    /**
     * Create a new review
     * POST /api/reviews
     */
    createReview: (req: Request, res: Response) => Promise<void>;
    /**
     * Get all reviews with search and filters
     * GET /api/reviews
     */
    getReviews: (req: Request, res: Response) => Promise<void>;
    /**
     * Get review by ID
     * GET /api/reviews/:id
     */
    getReviewById: (req: Request, res: Response) => Promise<void>;
    /**
     * Update review
     * PUT /api/reviews/:id
     */
    updateReview: (req: Request, res: Response) => Promise<void>;
    /**
     * Delete review
     * DELETE /api/reviews/:id
     */
    deleteReview: (req: Request, res: Response) => Promise<void>;
    /**
     * Mark review as helpful
     * POST /api/reviews/:id/helpful
     */
    markReviewHelpful: (req: Request, res: Response) => Promise<void>;
    /**
     * Get user's review for a venue or band
     * GET /api/reviews/my-review
     */
    getMyReview: (req: Request, res: Response) => Promise<void>;
    /**
     * Get reviews by venue
     * GET /api/reviews/venue/:venueId
     */
    getReviewsByVenue: (req: Request, res: Response) => Promise<void>;
    /**
     * Get reviews by band
     * GET /api/reviews/band/:bandId
     */
    getReviewsByBand: (req: Request, res: Response) => Promise<void>;
    /**
     * Get reviews by user
     * GET /api/reviews/user/:userId
     */
    getReviewsByUser: (req: Request, res: Response) => Promise<void>;
}
//# sourceMappingURL=ReviewController.d.ts.map