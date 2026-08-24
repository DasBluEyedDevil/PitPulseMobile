/**
 * FeedController - Refactored with asyncHandler pattern
 * Standardized async error handling by wrapping all methods with asyncHandler
 * Replaces manual try-catch with automatic error forwarding
 */

import { Request, Response } from 'express';
import { routeParams } from '../utils/requestParams';
import { FeedService } from '../services/FeedService';
import { ApiResponse } from '../types';
import { asyncHandler } from '../utils/asyncHandler';
import { UnauthorizedError } from '../utils/errors';

function parseFeedLimit(value: unknown): number {
  if (typeof value !== 'string') {
    return 20;
  }
  const rawLimit = Number.parseInt(value, 10);
  return Math.max(1, Math.min(50, Number.isNaN(rawLimit) ? 20 : rawLimit));
}

export class FeedController {
  private feedService = new FeedService();

  /**
   * Get friends feed with cursor pagination
   * GET /api/feed/friends?cursor=X&limit=N
   */
  getFriendsFeed = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
    const limit = parseFeedLimit(req.query.limit);

    const result = await this.feedService.getFriendsFeed(userId, cursor, limit);

    const response: ApiResponse = { success: true, data: result };
    res.status(200).json(response);
  });

  /**
   * Get global feed with cursor pagination
   * GET /api/feed/global?cursor=X&limit=N
   */
  getGlobalFeed = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
    const limit = parseFeedLimit(req.query.limit);

    const result = await this.feedService.getGlobalFeed(userId, cursor, limit);

    const response: ApiResponse = { success: true, data: result };
    res.status(200).json(response);
  });

  /**
   * Get event feed with cursor pagination
   * GET /api/feed/events/:eventId?cursor=X&limit=N
   */
  getEventFeed = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { eventId } = routeParams(req);

    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
    const limit = parseFeedLimit(req.query.limit);

    const userId = req.user?.id;
    const result = await this.feedService.getEventFeed(eventId, userId, cursor, limit);

    const response: ApiResponse = { success: true, data: result };
    res.status(200).json(response);
  });

  /**
   * Get happening now feed (friends at shows today)
   * GET /api/feed/happening-now
   */
  getHappeningNow = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    const result = await this.feedService.getHappeningNow(userId);

    const response: ApiResponse = { success: true, data: result };
    res.status(200).json(response);
  });

  /**
   * Get unseen counts per feed tab
   * GET /api/feed/unseen
   */
  getUnseenCounts = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    const result = await this.feedService.getUnseenCounts(userId);

    const response: ApiResponse = { success: true, data: result };
    res.status(200).json(response);
  });

  /**
   * Mark a feed tab as read
   * POST /api/feed/mark-read
   * Body: { feedType, lastSeenAt, lastSeenCheckinId? }
   */
  markRead = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    const { feedType, lastSeenAt, lastSeenCheckinId } = req.body;

    await this.feedService.markFeedRead(userId, feedType, lastSeenAt, lastSeenCheckinId);

    const response: ApiResponse = { success: true };
    res.status(200).json(response);
  });
}
