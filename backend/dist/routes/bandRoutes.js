"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const BandController_1 = require("../controllers/BandController");
const EventController_1 = require("../controllers/EventController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const bandController = new BandController_1.BandController();
const eventController = new EventController_1.EventController();
// Rate limiting
const generalRateLimit = (0, auth_1.rateLimit)(15 * 60 * 1000, 100); // 100 requests per 15 minutes
const createRateLimit = (0, auth_1.rateLimit)(15 * 60 * 1000, 10); // 10 create requests per 15 minutes
// Public routes (no authentication required)
router.get('/popular', generalRateLimit, bandController.getPopularBands);
router.get('/trending', generalRateLimit, bandController.getTrendingBands);
router.get('/genres', generalRateLimit, bandController.getGenres);
router.get('/genre/:genre', generalRateLimit, bandController.getBandsByGenre);
router.get('/', generalRateLimit, auth_1.optionalAuth, bandController.getBands);
router.get('/:id', generalRateLimit, auth_1.optionalAuth, bandController.getBandById);
// Protected routes (authentication required)
router.post('/', auth_1.authenticateToken, createRateLimit, bandController.createBand);
router.post('/import', auth_1.authenticateToken, createRateLimit, bandController.importBand);
router.put('/:id', auth_1.authenticateToken, generalRateLimit, bandController.updateBand);
router.delete('/:id', auth_1.authenticateToken, generalRateLimit, bandController.deleteBand);
// Band events
router.get('/:id/events', generalRateLimit, eventController.getEventsByBand);
exports.default = router;
//# sourceMappingURL=bandRoutes.js.map