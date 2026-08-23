import { Router } from 'express';
import { z } from 'zod';
import { EventController } from '../controllers/EventController';
import { authenticateToken } from '../middleware/auth';
import { createPerUserRateLimit, RateLimitPresets } from '../middleware/perUserRateLimit';
import { validate } from '../middleware/validate';

const router = Router();
const eventController = new EventController();

const eventIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Event ID must be a valid UUID'),
  }),
});

const ticketmasterIdParamSchema = z.object({
  params: z.object({
    ticketmasterId: z.string().min(1, 'ticketmasterId is required').max(200),
  }),
});

const genreParamSchema = z.object({
  params: z.object({
    genre: z.string().min(1, 'genre parameter is required').max(100),
  }),
  query: z.object({
    limit: z.string().optional(),
    offset: z.string().optional(),
  }),
});

const optionalLimitQuerySchema = z.object({
  query: z.object({
    limit: z.string().optional(),
  }),
});

const optionalGeoQuerySchema = z.object({
  query: z.object({
    limit: z.string().optional(),
    lat: z.string().optional(),
    lon: z.string().optional(),
    radius: z.string().optional(),
  }),
});

const nearbyQuerySchema = z.object({
  query: z.object({
    lat: z.string().min(1, 'lat query parameter is required'),
    lng: z.string().min(1, 'lng query parameter is required'),
    radius: z.string().optional(),
    limit: z.string().optional(),
  }),
});

const discoverQuerySchema = z.object({
  query: z.object({
    lat: z.string().min(1, 'lat query parameter is required'),
    lon: z.string().min(1, 'lon query parameter is required'),
    radius: z.string().optional(),
    days: z.string().optional(),
    limit: z.string().optional(),
  }),
});

const searchQuerySchema = z.object({
  query: z.object({
    q: z.string().min(1, 'q query parameter is required'),
    limit: z.string().optional(),
  }),
});

const createEventSchema = z.object({
  body: z
    .object({
      venueId: z.string().uuid('venueId must be a valid UUID'),
      bandId: z.string().uuid('bandId must be a valid UUID').optional(),
      eventDate: z
        .string()
        .min(1, 'A valid eventDate is required')
        .refine((value) => !Number.isNaN(new Date(value).getTime()), {
          message: 'A valid eventDate is required',
        }),
      eventName: z.string().max(500).optional(),
      description: z.string().max(5000).optional(),
      doorsTime: z.string().max(32).optional(),
      startTime: z.string().max(32).optional(),
      ticketUrl: z.string().max(2000).optional(),
      lineup: z
        .array(
          z
            .object({
              bandId: z.string().uuid('bandId must be a valid UUID').optional(),
              bandName: z.string().min(1).max(500).optional(),
              setOrder: z.number().int().optional(),
              isHeadliner: z.boolean().optional(),
            })
            .refine((entry) => Boolean(entry.bandId || entry.bandName), {
              message: 'Each lineup entry must have either bandId or bandName',
            })
        )
        .optional(),
    })
    .refine((data) => Boolean(data.bandId || (data.lineup && data.lineup.length > 0)), {
      message: 'At least one band is required (bandId or lineup with bandId/bandName)',
    }),
});

// Get upcoming events (public)
router.get('/upcoming', validate(optionalLimitQuerySchema), eventController.getUpcomingEvents);

// Get trending events (public, enhanced with optional lat/lon)
router.get('/trending', validate(optionalGeoQuerySchema), eventController.getTrendingEvents);

// Discovery: nearby upcoming events (requires auth for GPS-based queries)
router.get(
  '/discover',
  authenticateToken,
  validate(discoverQuerySchema),
  eventController.getNearbyUpcoming
);

// Discovery: events by genre (public)
router.get('/genre/:genre', validate(genreParamSchema), eventController.getByGenre);

// Discovery: event search (public)
router.get('/search', validate(searchQuerySchema), eventController.searchEvents);

// Personalized recommendations (requires auth for user-based scoring)
router.get(
  '/recommended',
  authenticateToken,
  validate(optionalGeoQuerySchema),
  eventController.getRecommendedEvents
);

// Get nearby events (requires auth) - check-in auto-suggest (today only)
// MUST be before /:id to avoid param conflict
router.get(
  '/nearby',
  authenticateToken,
  validate(nearbyQuerySchema),
  eventController.getNearbyEvents
);

// On-demand Ticketmaster event lookup (requires auth)
// MUST be before /:id to avoid param conflict
router.get(
  '/lookup/:ticketmasterId',
  authenticateToken,
  createPerUserRateLimit(RateLimitPresets.expensive),
  validate(ticketmasterIdParamSchema),
  eventController.lookupEvent
);

// Create a new event (requires auth)
// SEC-013/CFR-014: Rate limit event creation
router.post(
  '/',
  authenticateToken,
  createPerUserRateLimit(RateLimitPresets.write),
  validate(createEventSchema),
  eventController.createEvent
);

// Get event by ID (public)
router.get('/:id', validate(eventIdParamSchema), eventController.getEventById);

// Delete event (requires auth)
// SEC-013/CFR-014: Rate limit event deletion
router.delete(
  '/:id',
  authenticateToken,
  createPerUserRateLimit(RateLimitPresets.write),
  validate(eventIdParamSchema),
  eventController.deleteEvent
);

export default router;
