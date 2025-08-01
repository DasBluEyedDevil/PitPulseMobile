import { Router } from 'express';
import { BandController } from '../controllers/BandController';
import { authenticateToken, optionalAuth, rateLimit } from '../middleware/auth';

const router = Router();
const bandController = new BandController();

// Rate limiting
const generalRateLimit = rateLimit(15 * 60 * 1000, 100); // 100 requests per 15 minutes
const createRateLimit = rateLimit(15 * 60 * 1000, 10); // 10 create requests per 15 minutes

// Public routes (no authentication required)
router.get('/popular', generalRateLimit, bandController.getPopularBands);
router.get('/trending', generalRateLimit, bandController.getTrendingBands);
router.get('/genres', generalRateLimit, bandController.getGenres);
router.get('/genre/:genre', generalRateLimit, bandController.getBandsByGenre);
router.get('/', generalRateLimit, optionalAuth, bandController.getBands);
router.get('/:id', generalRateLimit, optionalAuth, bandController.getBandById);

// Protected routes (authentication required)
router.post('/', authenticateToken, createRateLimit, bandController.createBand);
router.put('/:id', authenticateToken, generalRateLimit, bandController.updateBand);
router.delete('/:id', authenticateToken, generalRateLimit, bandController.deleteBand);

export default router;