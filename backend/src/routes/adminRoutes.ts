import { Router } from 'express';
import { z } from 'zod';
import adminController from '../controllers/AdminController';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/validate';

/**
 * Admin dashboard routes — all require JWT + is_admin.
 * Mounted at /api/admin (see index.ts).
 */
const router = Router();

const targetId = z.string().uuid('targetId must be a valid UUID');

export const moderateContentSchema = z.object({
  body: z.discriminatedUnion('action', [
    z.object({
      action: z.literal('ban_user'),
      targetType: z.literal('user'),
      targetId,
      reason: z.string().max(1000).optional(),
    }),
    z.object({
      action: z.literal('delete_venue'),
      targetType: z.literal('venue'),
      targetId,
      reason: z.string().max(1000).optional(),
    }),
  ]),
});

router.use(authenticateToken);
router.use(requireAdmin());

router.get('/stats', adminController.getStats);
router.get('/top-venues', adminController.getTopVenues);
router.get('/user-activity', adminController.getUserActivity);
router.post('/cache/clear', adminController.clearCache);
router.get('/health/database', adminController.getDatabaseHealth);
router.post('/moderate', validate(moderateContentSchema), adminController.moderateContent);

export default router;
