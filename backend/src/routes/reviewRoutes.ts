import { Router } from 'express';
import { ReviewController } from '../controllers/ReviewController';
import { authenticateToken, optionalAuth, rateLimit } from '../middleware/auth';

const router = Router();
const reviewController = new ReviewController();

// Rate limiting
const generalRateLimit = rateLimit(15 * 60 * 1000, 100); // 100 requests per 15 minutes
const createRateLimit = rateLimit(15 * 60 * 1000, 20); // 20 review operations per 15 minutes

// Public routes (no authentication required)
router.get('/', generalRateLimit, optionalAuth, reviewController.getReviews);

// Specific routes MUST come before parameterized routes
router.get('/venue/:venueId', generalRateLimit, optionalAuth, reviewController.getReviewsByVenue);
router.get('/band/:bandId', generalRateLimit, optionalAuth, reviewController.getReviewsByBand);
router.get('/user/:userId', generalRateLimit, optionalAuth, reviewController.getReviewsByUser);

// Protected specific routes MUST come before /:id
router.get('/my-review', authenticateToken, generalRateLimit, reviewController.getMyReview);
router.post('/', authenticateToken, createRateLimit, reviewController.createReview);

// Generic :id routes - MUST be last
router.get('/:id', generalRateLimit, optionalAuth, reviewController.getReviewById);
router.put('/:id', authenticateToken, createRateLimit, reviewController.updateReview);
router.delete('/:id', authenticateToken, createRateLimit, reviewController.deleteReview);
router.post('/:id/helpful', authenticateToken, generalRateLimit, reviewController.markReviewHelpful);

export default router;
