import { Router } from 'express';
import { VenueController } from '../controllers/VenueController';
import { EventController } from '../controllers/EventController';
import { authenticateToken, optionalAuth, rateLimit } from '../middleware/auth';

const router = Router();
const venueController = new VenueController();
const eventController = new EventController();

// Rate limiting
const generalRateLimit = rateLimit(15 * 60 * 1000, 100); // 100 requests per 15 minutes
const createRateLimit = rateLimit(15 * 60 * 1000, 10); // 10 create requests per 15 minutes

// Public routes (no authentication required)
router.get('/popular', generalRateLimit, venueController.getPopularVenues);
router.get('/near', generalRateLimit, venueController.getVenuesNear);
router.get('/', generalRateLimit, optionalAuth, venueController.getVenues);
router.get('/:id', generalRateLimit, optionalAuth, venueController.getVenueById);

// Protected routes (authentication required)
router.post('/', authenticateToken, createRateLimit, venueController.createVenue);
router.post('/import', authenticateToken, createRateLimit, venueController.importVenue);
router.put('/:id', authenticateToken, generalRateLimit, venueController.updateVenue);
router.delete('/:id', authenticateToken, generalRateLimit, venueController.deleteVenue);

// Venue events
router.get('/:id/events', generalRateLimit, eventController.getEventsByVenue);

export default router;