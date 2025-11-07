"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ReviewController_1 = require("../controllers/ReviewController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const reviewController = new ReviewController_1.ReviewController();
// Rate limiting
const generalRateLimit = (0, auth_1.rateLimit)(15 * 60 * 1000, 100); // 100 requests per 15 minutes
const createRateLimit = (0, auth_1.rateLimit)(15 * 60 * 1000, 20); // 20 review operations per 15 minutes
// Public routes (no authentication required)
router.get('/', generalRateLimit, auth_1.optionalAuth, reviewController.getReviews);
// Specific routes MUST come before parameterized routes
router.get('/venue/:venueId', generalRateLimit, auth_1.optionalAuth, reviewController.getReviewsByVenue);
router.get('/band/:bandId', generalRateLimit, auth_1.optionalAuth, reviewController.getReviewsByBand);
router.get('/user/:userId', generalRateLimit, auth_1.optionalAuth, reviewController.getReviewsByUser);
// Protected specific routes MUST come before /:id
router.get('/my-review', auth_1.authenticateToken, generalRateLimit, reviewController.getMyReview);
router.post('/', auth_1.authenticateToken, createRateLimit, reviewController.createReview);
// Generic :id routes - MUST be last
router.get('/:id', generalRateLimit, auth_1.optionalAuth, reviewController.getReviewById);
router.put('/:id', auth_1.authenticateToken, createRateLimit, reviewController.updateReview);
router.delete('/:id', auth_1.authenticateToken, createRateLimit, reviewController.deleteReview);
router.post('/:id/helpful', auth_1.authenticateToken, generalRateLimit, reviewController.markReviewHelpful);
exports.default = router;
//# sourceMappingURL=reviewRoutes.js.map