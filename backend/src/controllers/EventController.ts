/**
 * EventController - Refactored with asyncHandler pattern
 * Standardized async error handling by wrapping all methods with asyncHandler
 * Replaces manual try-catch with automatic error forwarding
 */

import { Request, Response } from 'express';
import { routeParams } from '../utils/requestParams';
import { EventService } from '../services/EventService';
import { EventSyncService } from '../services/EventSyncService';
import { TicketmasterAdapter } from '../services/TicketmasterAdapter';
import { BandMatcher } from '../services/BandMatcher';
import { DiscoveryService } from '../services/DiscoveryService';
import { ApiResponse } from '../types';
import { asyncHandler } from '../utils/asyncHandler';
import { NotFoundError, UnauthorizedError, BadRequestError, ForbiddenError } from '../utils/errors';
import { parseBoundedFloat, parseBoundedInt } from '../utils/queryBounds';
import { buildErrorResponseForStatus } from '../middleware/validate';

export class EventController {
  private eventService = new EventService();
  private eventSyncService = new EventSyncService();
  private bandMatcher = new BandMatcher();
  private discoveryService = new DiscoveryService();

  /**
   * Create a new event
   * POST /api/events
   * Body: { venueId, bandId, eventDate, eventName?, description?, doorsTime?, startTime?, ticketUrl?, lineup? }
   *
   * Lineup entries support either:
   *   - { bandId } -- existing band by UUID
   *   - { bandName } -- resolve or create band by name via BandMatcher
   *   - { bandId, bandName } -- bandId takes priority
   */
  createEvent = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const {
      venueId,
      bandId,
      eventDate,
      eventName,
      description,
      doorsTime,
      startTime,
      ticketUrl,
      lineup,
    } = req.body;
    const userId = req.user?.id; // From auth middleware

    const hasLineup = lineup && Array.isArray(lineup) && lineup.length > 0;

    // Resolve lineup: convert bandName entries to bandId via BandMatcher
    let resolvedLineup: { bandId: string; setOrder?: number; isHeadliner?: boolean }[] | undefined;

    if (hasLineup) {
      resolvedLineup = [];
      for (const entry of lineup) {
        let resolvedBandId = entry.bandId;

        // If no bandId but bandName provided, resolve via BandMatcher
        if (!resolvedBandId && entry.bandName) {
          const matchResult = await this.bandMatcher.matchOrCreateBand(entry.bandName);
          resolvedBandId = matchResult.bandId;
        }

        resolvedLineup.push({
          bandId: resolvedBandId,
          setOrder: entry.setOrder,
          isHeadliner: entry.isHeadliner,
        });
      }
    }

    const event = await this.eventService.createEvent({
      venueId,
      bandId,
      eventDate: new Date(eventDate),
      eventName,
      description,
      doorsTime,
      startTime,
      ticketUrl,
      createdByUserId: userId,
      lineup: resolvedLineup,
    });

    const response: ApiResponse = {
      success: true,
      data: event,
      message: 'Event created successfully',
    };

    res.status(201).json(response);
  });

  /**
   * Get event by ID
   * GET /api/events/:id
   */
  getEventById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = routeParams(req);

    const event = await this.eventService.getEventById(id);

    const response: ApiResponse = {
      success: true,
      data: event,
    };

    res.status(200).json(response);
  });

  /**
   * Get events at a venue
   * GET /api/venues/:id/events?upcoming=true&limit=50
   */
  getEventsByVenue = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = routeParams(req);
    const upcoming = req.query.upcoming === 'true';
    // API-014: Bounded parseInt with NaN handling
    const rawLimit = parseInt(req.query.limit as string, 10);
    const limit = isNaN(rawLimit) ? 50 : Math.max(1, Math.min(200, rawLimit));

    const events = await this.eventService.getEventsByVenue(id, { upcoming, limit });

    const response: ApiResponse = {
      success: true,
      data: events,
    };

    res.status(200).json(response);
  });

  /**
   * Get events for a band
   * GET /api/bands/:id/events?upcoming=true&limit=50
   */
  getEventsByBand = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = routeParams(req);
    const upcoming = req.query.upcoming === 'true';
    const rawLimit2 = parseInt(req.query.limit as string, 10);
    const limit = isNaN(rawLimit2) ? 50 : Math.max(1, Math.min(200, rawLimit2));

    const events = await this.eventService.getEventsByBand(id, { upcoming, limit });

    const response: ApiResponse = {
      success: true,
      data: events,
    };

    res.status(200).json(response);
  });

  /**
   * Get upcoming events
   * GET /api/events/upcoming?limit=50
   */
  getUpcomingEvents = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const rawUpLimit = parseInt(req.query.limit as string, 10);
    const limit = isNaN(rawUpLimit) ? 50 : Math.max(1, Math.min(200, rawUpLimit));

    const events = await this.eventService.getUpcomingEvents(limit);

    const response: ApiResponse = {
      success: true,
      data: events,
    };

    res.status(200).json(response);
  });

  /**
   * Get trending events
   * GET /api/events/trending?limit=20&lat=&lon=&radius=
   * Enhanced: if lat/lon provided, returns trending near user.
   * Without lat/lon, falls back to global trending (backward compat).
   */
  getTrendingEvents = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const limit = parseBoundedInt(req.query.limit, 20, { min: 1, max: 100 });
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
    const lon = req.query.lon ? parseFloat(req.query.lon as string) : undefined;
    const radius = parseBoundedFloat(req.query.radius, 50, { min: 0.1, max: 500 });

    // If lat/lon provided, use location-aware trending
    // API-021: Validate geo coordinate ranges
    if (lat !== undefined && lon !== undefined && !isNaN(lat) && !isNaN(lon)) {
      if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        throw new BadRequestError(
          'lat must be between -90 and 90, lon must be between -180 and 180'
        );
      }
      const events = await this.eventService.getTrendingNearby(lat, lon, radius, 7, limit);

      const response: ApiResponse = {
        success: true,
        data: events,
      };

      res.status(200).json(response);
      return;
    }

    // Fallback: global trending (backward compat)
    const events = await this.eventService.getTrendingEvents(limit);

    const response: ApiResponse = {
      success: true,
      data: events,
    };

    res.status(200).json(response);
  });

  /**
   * On-demand Ticketmaster event lookup
   * GET /api/events/lookup/:ticketmasterId
   *
   * Fetches a specific event from the Ticketmaster API by its TM event ID,
   * normalizes it, matches/creates venue and bands, and stores it in the DB.
   * Returns the full event record.
   *
   * Use case: mobile app encounters a Ticketmaster event ID (e.g., from a
   * deep link or search) that is outside the synced coverage area. This
   * endpoint fetches and ingests it on demand.
   */
  lookupEvent = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { ticketmasterId } = routeParams(req);

    // Guard: if TICKETMASTER_API_KEY not configured, lookup is unavailable
    if (!process.env.TICKETMASTER_API_KEY) {
      res
        .status(503)
        .json(
          buildErrorResponseForStatus(
            503,
            'Event lookup not available: Ticketmaster API key not configured'
          )
        );
      return;
    }

    // Fetch from Ticketmaster API
    let adapter: TicketmasterAdapter;
    try {
      adapter = new TicketmasterAdapter();
    } catch {
      res.status(503).json(buildErrorResponseForStatus(503, 'Event lookup not available'));
      return;
    }

    const tmEvent = await adapter.getEventById(ticketmasterId);

    if (!tmEvent) {
      throw new NotFoundError('Ticketmaster event not found');
    }

    // Ingest via EventSyncService (normalizes, matches entities, upserts)
    const eventId = await this.eventSyncService.ingestSingleEvent(tmEvent);

    if (!eventId) {
      throw new BadRequestError('Event could not be ingested (missing venue data)');
    }

    // Return the full event record
    const event = await this.eventService.getEventById(eventId);

    res.status(200).json({
      success: true,
      data: event,
    } as ApiResponse);
  });

  /**
   * Get nearby events
   * GET /api/events/nearby?lat=X&lng=Y&radius=10&limit=20
   *
   * Returns today's events sorted by distance from the given GPS coordinates.
   * Requires lat and lng query parameters.
   */
  getNearbyEvents = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);

    // API-021: Range-validate geo coordinates
    if (isNaN(lat) || isNaN(lng)) {
      throw new BadRequestError('lat and lng query parameters are required and must be numeric');
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new BadRequestError('lat must be between -90 and 90, lng must be between -180 and 180');
    }

    const radius = parseBoundedFloat(req.query.radius, 10, { min: 0.1, max: 500 });
    const limit = parseBoundedInt(req.query.limit, 20, { min: 1, max: 100 });

    const events = await this.eventService.getNearbyEvents(lat, lng, radius, limit);

    const response: ApiResponse = {
      success: true,
      data: events,
    };

    res.status(200).json(response);
  });

  /**
   * Get nearby upcoming events
   * GET /api/events/discover?lat=&lon=&radius=50&days=30&limit=20
   */
  getNearbyUpcoming = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const lat = parseFloat(req.query.lat as string);
    const lon = parseFloat(req.query.lon as string);

    // API-021: Range-validate geo coordinates
    if (isNaN(lat) || isNaN(lon)) {
      throw new BadRequestError('lat and lon query parameters are required and must be numeric');
    }
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      throw new BadRequestError('lat must be between -90 and 90, lon must be between -180 and 180');
    }

    const radius = parseBoundedFloat(req.query.radius, 50, { min: 0.1, max: 500 });
    const days = parseBoundedInt(req.query.days, 30, { min: 1, max: 365 });
    const limit = parseBoundedInt(req.query.limit, 20, { min: 1, max: 100 });

    const events = await this.eventService.getNearbyUpcoming(lat, lon, radius, days, limit);

    const response: ApiResponse = {
      success: true,
      data: events,
    };

    res.status(200).json(response);
  });

  /**
   * Get events by genre
   * GET /api/events/genre/:genre?limit=20&offset=0
   */
  getByGenre = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { genre } = routeParams(req);

    // API-014: Bounded parseInt with NaN handling
    const rawGenreLimit = parseInt(req.query.limit as string, 10);
    const limit = isNaN(rawGenreLimit) ? 20 : Math.max(1, Math.min(100, rawGenreLimit));
    const rawGenreOffset = parseInt(req.query.offset as string, 10);
    const offset = isNaN(rawGenreOffset) ? 0 : Math.max(0, rawGenreOffset);

    const events = await this.eventService.getByGenre(genre, limit, offset);

    const response: ApiResponse = {
      success: true,
      data: events,
    };

    res.status(200).json(response);
  });

  /**
   * Search events
   * GET /api/events/search?q=&limit=20
   */
  searchEvents = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const q = req.query.q as string;

    const limit = parseBoundedInt(req.query.limit, 20, { min: 1, max: 100 });

    const events = await this.eventService.searchEvents(q.trim(), limit);

    const response: ApiResponse = {
      success: true,
      data: events,
    };

    res.status(200).json(response);
  });

  /**
   * Get personalized event recommendations
   * GET /api/events/recommended?lat=&lon=&radius=&limit=
   * Requires auth (userId from token).
   *
   * Returns events scored by: genre affinity (3x), friend attendance (5x),
   * trending (1x). Already-attended events excluded. New users get trending fallback.
   */
  getRecommendedEvents = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
    const lon = req.query.lon ? parseFloat(req.query.lon as string) : undefined;
    const radius =
      req.query.radius === undefined
        ? undefined
        : parseBoundedFloat(req.query.radius, 50, { min: 0.1, max: 500 });
    const limit = parseBoundedInt(req.query.limit, 20, { min: 1, max: 100 });

    const events = await this.discoveryService.getRecommendedEvents(
      userId,
      lat,
      lon,
      radius,
      limit
    );

    const response: ApiResponse = {
      success: true,
      data: events,
    };

    res.status(200).json(response);
  });

  /**
   * Delete an event
   * DELETE /api/events/:id
   * Authorized for admins and the user who created the event (created_by_user_id)
   */
  deleteEvent = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const { id } = routeParams(req);

    // Fetch event to check ownership
    let event: any;
    try {
      event = await this.eventService.getEventById(id);
    } catch {
      throw new NotFoundError('Event not found');
    }

    // Authorization: admin or event creator
    const isAdmin = !!req.user.isAdmin;
    const isCreator = event.createdByUserId === req.user.id;

    if (!isAdmin && !isCreator) {
      throw new ForbiddenError('Only admins or event creators can delete this event');
    }

    const actor = { id: req.user.id, isAdmin };
    const outcome = await this.eventService.deleteEvent(id, actor);

    const response: ApiResponse = {
      success: true,
      data: outcome,
      message: outcome.cancelled ? 'Event cancelled' : 'Event deleted successfully',
    };

    res.status(200).json(response);
  });
}
