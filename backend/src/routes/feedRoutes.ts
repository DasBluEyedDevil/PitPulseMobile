import { Router } from 'express';
import { z } from 'zod';
import { FeedController } from '../controllers/FeedController';
import { authenticateToken } from '../middleware/auth';
import { createPerUserRateLimit, RateLimitPresets } from '../middleware/perUserRateLimit';
import { validate } from '../middleware/validate';
import { decodeCursor } from '../services/FeedService';
import { eventIdSchema } from './eventRoutes';

const router = Router();
const feedController = new FeedController();

const feedQueryFields = z.object({
  cursor: z
    .string()
    .optional()
    .refine((value) => !value || decodeCursor(value) !== null, {
      message: 'Invalid cursor format',
    }),
  limit: z.string().regex(/^\d+$/, 'limit must be a positive integer').optional(),
});

export const feedQuerySchema = z.object({
  query: feedQueryFields,
});

export const eventFeedSchema = z.object({
  params: z.object({
    eventId: eventIdSchema,
  }),
  query: feedQueryFields,
});

export const markReadSchema = z.object({
  body: z.object({
    feedType: z.enum(['friends', 'event', 'happening_now', 'global']),
    lastSeenAt: z
      .string()
      .min(1, 'lastSeenAt must be a valid ISO 8601 date string')
      .refine((value) => !Number.isNaN(Date.parse(value)), {
        message: 'lastSeenAt must be a valid ISO 8601 date string',
      }),
    lastSeenCheckinId: z.string().uuid('lastSeenCheckinId must be a valid UUID').optional(),
  }),
});

// All feed routes require authentication
router.use(authenticateToken);

// SEC-014/CFR-014: Rate limit feed endpoints
router.use(createPerUserRateLimit(RateLimitPresets.read));

// New feed endpoints (Phase 5)
router.get('/friends', validate(feedQuerySchema), feedController.getFriendsFeed);
router.get('/global', validate(feedQuerySchema), feedController.getGlobalFeed);
router.get('/events/:eventId', validate(eventFeedSchema), feedController.getEventFeed);
router.get('/happening-now', feedController.getHappeningNow);
router.get('/unseen', feedController.getUnseenCounts);
router.post('/mark-read', validate(markReadSchema), feedController.markRead);

// Backward-compat: GET /api/feed/ forwards to friends feed
// so existing mobile app works until updated
router.get('/', validate(feedQuerySchema), feedController.getFriendsFeed);

export default router;
