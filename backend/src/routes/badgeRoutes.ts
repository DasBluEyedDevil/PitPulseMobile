import { Router } from 'express';
import { BadgeController } from '../controllers/BadgeController';
import { authenticateToken, optionalAuth, rateLimit } from '../middleware/auth';

const router = Router();
const badgeController = new BadgeController();

// Rate limiting
const generalRateLimit = rateLimit(15 * 60 * 1000, 100); // 100 requests per 15 minutes
const badgeCheckRateLimit = rateLimit(15 * 60 * 1000, 10); // 10 badge check requests per 15 minutes

// Public routes (no authentication required)
router.get('/', generalRateLimit, badgeController.getAllBadges);
router.get('/leaderboard', generalRateLimit, badgeController.getBadgeLeaderboard);
router.get('/user/:userId', generalRateLimit, badgeController.getUserBadges);
router.get('/:id', generalRateLimit, badgeController.getBadgeById);

// Protected routes (authentication required)
router.get('/my-badges', authenticateToken, generalRateLimit, badgeController.getMyBadges);
router.get('/my-progress', authenticateToken, generalRateLimit, badgeController.getMyBadgeProgress);
router.post('/check-awards', authenticateToken, badgeCheckRateLimit, badgeController.checkAndAwardBadges);

export default router;