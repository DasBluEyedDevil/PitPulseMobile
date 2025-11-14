import { Router } from 'express';
import { EventController } from '../controllers/EventController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const eventController = new EventController();

// Get upcoming events (public)
router.get('/upcoming', eventController.getUpcomingEvents);

// Get trending events (public)
router.get('/trending', eventController.getTrendingEvents);

// Create a new event (requires auth)
router.post('/', authenticateToken, eventController.createEvent);

// Get event by ID (public)
router.get('/:id', eventController.getEventById);

// Delete event (requires auth)
router.delete('/:id', authenticateToken, eventController.deleteEvent);

export default router;
