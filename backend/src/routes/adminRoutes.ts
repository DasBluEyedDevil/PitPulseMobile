import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import adminController from '../controllers/AdminController';

/**
 * Admin dashboard routes — all require JWT + is_admin.
 * Mounted at /api/admin (see index.ts).
 */
const router = Router();

router.use(authenticateToken);
router.use(requireAdmin());

router.get('/stats', adminController.getStats);
router.get('/top-venues', adminController.getTopVenues);
router.get('/user-activity', adminController.getUserActivity);
router.post('/cache/clear', adminController.clearCache);
router.get('/health/database', adminController.getDatabaseHealth);
router.post('/moderate', adminController.moderateContent);

export default router;
