import { Router } from 'express';
import { DiscoveryController } from '../controllers/DiscoveryController';

const router = Router();
const discoveryController = new DiscoveryController();

// Search venues from setlist.fm
router.get('/venues', discoveryController.searchVenues);

// Search setlists (concerts/events) from setlist.fm
router.get('/setlists', discoveryController.searchSetlists);

// Search bands from MusicBrainz
router.get('/bands', discoveryController.searchBands);

// Search bands by genre from MusicBrainz
router.get('/bands/genre', discoveryController.searchBandsByGenre);

export default router;
