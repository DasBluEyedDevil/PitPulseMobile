"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const VenueController_1 = require("../controllers/VenueController");
const EventController_1 = require("../controllers/EventController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const venueController = new VenueController_1.VenueController();
const eventController = new EventController_1.EventController();
// Rate limiting
const generalRateLimit = (0, auth_1.rateLimit)(15 * 60 * 1000, 100); // 100 requests per 15 minutes
const createRateLimit = (0, auth_1.rateLimit)(15 * 60 * 1000, 10); // 10 create requests per 15 minutes
// Public routes (no authentication required)
router.get('/popular', generalRateLimit, venueController.getPopularVenues);
router.get('/near', generalRateLimit, venueController.getVenuesNear);
router.get('/', generalRateLimit, auth_1.optionalAuth, venueController.getVenues);
router.get('/:id', generalRateLimit, auth_1.optionalAuth, venueController.getVenueById);
// Protected routes (authentication required)
router.post('/', auth_1.authenticateToken, createRateLimit, venueController.createVenue);
router.post('/import', auth_1.authenticateToken, createRateLimit, venueController.importVenue);
router.put('/:id', auth_1.authenticateToken, generalRateLimit, venueController.updateVenue);
router.delete('/:id', auth_1.authenticateToken, generalRateLimit, venueController.deleteVenue);
// Venue events
router.get('/:id/events', generalRateLimit, eventController.getEventsByVenue);
exports.default = router;
//# sourceMappingURL=venueRoutes.js.map