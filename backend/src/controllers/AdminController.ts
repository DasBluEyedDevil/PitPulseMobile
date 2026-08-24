import { Request, Response } from 'express';
import { ApiResponse } from '../types';
import Database from '../config/database';
import { buildErrorResponseForStatus } from '../middleware/validate';
import { realtimePublisher } from '../services/RealtimePublisher';
import { invalidateAuthUserCache } from '../services/user/authUserCache';
import { asyncHandler } from '../utils/asyncHandler';
import { revokeAllUserTokens } from '../utils/auth';
import { cache } from '../utils/cache';
import { BadRequestError } from '../utils/errors';
import { logInfo, logWarn } from '../utils/logger';
import { disconnectUser, getWebSocketStats, WebSocketEvents } from '../utils/websocket';

/**
 * Admin Controller - Dashboard and management utilities
 *
 * SECURITY: All routes should be protected with admin middleware
 * Example: router.get('/admin/stats', requireAdmin, AdminController.getStats);
 */
export class AdminController {
  /**
   * Get system statistics
   * GET /api/admin/stats
   */
  getStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const db = Database.getInstance();

    // Get database stats
    const userCountResult = await db.query('SELECT COUNT(*) as count FROM users');
    const venueCountResult = await db.query('SELECT COUNT(*) as count FROM venues');
    const bandCountResult = await db.query('SELECT COUNT(*) as count FROM bands');
    const checkinCountResult = await db.query('SELECT COUNT(*) as count FROM checkins');

    // Get recent activity (last 24 hours)
    const recentUsersResult = await db.query(
      "SELECT COUNT(*) as count FROM users WHERE created_at > NOW() - INTERVAL '24 hours'"
    );
    const recentCheckinsResult = await db.query(
      "SELECT COUNT(*) as count FROM checkins WHERE created_at > NOW() - INTERVAL '24 hours'"
    );

    // Get cache stats
    const cacheStats = cache.getStats();

    // Get WebSocket stats
    const wsStats = getWebSocketStats();

    const response: ApiResponse = {
      success: true,
      data: {
        counts: {
          users: userCountResult.rows[0].count,
          venues: venueCountResult.rows[0].count,
          bands: bandCountResult.rows[0].count,
          checkins: checkinCountResult.rows[0].count,
        },
        recent24h: {
          newUsers: recentUsersResult.rows[0].count,
          newCheckins: recentCheckinsResult.rows[0].count,
        },
        cache: cacheStats,
        websocket: wsStats,
        timestamp: new Date().toISOString(),
      },
    };

    logInfo('Admin stats accessed');
    res.status(200).json(response);
  });

  /**
   * Get top venues by rating
   * GET /api/admin/top-venues?limit=10
   */
  getTopVenues = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const limit = parseInt(req.query.limit as string) || 10;
    const db = Database.getInstance();

    const venuesResult = await db.query(
      `
      SELECT
        v.id,
        v.name,
        v.city,
        v.state,
        v.average_rating,
        v.total_checkins as checkin_count
      FROM venues v
      WHERE v.is_active = true AND v.total_checkins > 0
      ORDER BY v.average_rating DESC, v.total_checkins DESC
      LIMIT $1
      `,
      [limit]
    );

    const response: ApiResponse = {
      success: true,
      data: venuesResult.rows,
    };

    res.status(200).json(response);
  });

  /**
   * Get user activity report
   * GET /api/admin/user-activity?userId=123
   */
  getUserActivity = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.query.userId as string;

    const db = Database.getInstance();

    // Get user info -- SEC-012: Exclude email to prevent PII exposure
    const usersResult = await db.query('SELECT id, username, created_at FROM users WHERE id = $1', [
      userId,
    ]);

    if (!usersResult.rows || usersResult.rows.length === 0) {
      res.status(404).json(buildErrorResponseForStatus(404, 'User not found'));
      return;
    }

    // Get user's activity counts
    const checkinCountResult = await db.query(
      'SELECT COUNT(*) as count FROM checkins WHERE user_id = $1',
      [userId]
    );
    const followerCountResult = await db.query(
      'SELECT COUNT(*) as count FROM user_followers WHERE following_id = $1',
      [userId]
    );
    const followingCountResult = await db.query(
      'SELECT COUNT(*) as count FROM user_followers WHERE follower_id = $1',
      [userId]
    );

    // Get recent checkins
    const recentCheckinsResult = await db.query(
      `
      SELECT c.id, c.rating, c.comment, c.created_at,
             v.name as venue_name, b.name as band_name
      FROM checkins c
      LEFT JOIN venues v ON c.venue_id = v.id
      LEFT JOIN bands b ON c.band_id = b.id
      WHERE c.user_id = $1
      ORDER BY c.created_at DESC
      LIMIT 10
      `,
      [userId]
    );

    const response: ApiResponse = {
      success: true,
      data: {
        user: usersResult.rows[0],
        activity: {
          checkinCount: checkinCountResult.rows[0].count,
          followerCount: followerCountResult.rows[0].count,
          followingCount: followingCountResult.rows[0].count,
        },
        recentCheckins: recentCheckinsResult.rows,
      },
    };

    res.status(200).json(response);
  });

  /**
   * Clear application cache keys only (`cache:*`). Never FLUSHDB.
   * POST /api/admin/cache/clear
   */
  clearCache = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const pattern = req.body.pattern as string | undefined;
    const confirm = req.body.confirm;

    if (pattern) {
      await cache.delPattern(pattern);
      logInfo('Admin cleared cache pattern', { pattern });
    } else {
      if (confirm !== true) {
        throw new BadRequestError('Prefix-wide cache clear requires confirm: true');
      }
      await cache.clear();
      logInfo('Admin cleared cache prefix');
    }

    const response: ApiResponse = {
      success: true,
      data: {
        message: pattern ? `Cache cleared for pattern: ${pattern}` : 'Cache prefix cleared',
      },
    };

    res.status(200).json(response);
  });

  /**
   * Get database health check
   * GET /api/admin/health/database
   */
  getDatabaseHealth = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const db = Database.getInstance();
    const isHealthy = await db.healthCheck();

    const response: ApiResponse = {
      success: true,
      data: {
        healthy: isHealthy,
        timestamp: new Date().toISOString(),
      },
    };

    res.status(isHealthy ? 200 : 503).json(response);
  });

  /**
   * Moderate content (ban user, delete venue, etc.)
   * POST /api/admin/moderate
   */
  moderateContent = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { action, targetType, targetId, reason } = req.body;

    const db = Database.getInstance();

    if (action === 'ban_user' && targetType === 'user') {
      await db.query('UPDATE users SET is_active = false WHERE id = $1', [targetId]);
      await invalidateAuthUserCache(targetId);
      await revokeAllUserTokens(targetId);
      await realtimePublisher.publishToUser(targetId, WebSocketEvents.DISCONNECTED, {
        reason: 'account_banned',
      });
      disconnectUser(targetId, 'account_banned');
      logWarn(`Admin banned user: ${targetId}. Reason: ${reason || 'Not specified'}`);
    } else if (action === 'delete_venue' && targetType === 'venue') {
      const result = await db.query(
        `UPDATE venues
         SET is_active = false, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND (claimed_by_user_id = $2 OR $3::boolean)`,
        [targetId, req.user!.id, !!req.user!.isAdmin]
      );

      if (!result.rowCount) {
        res.status(404).json(buildErrorResponseForStatus(404, 'Venue not found'));
        return;
      }

      logWarn(`Admin deleted venue: ${targetId}. Reason: ${reason || 'Not specified'}`);
    }

    const response: ApiResponse = {
      success: true,
      data: {
        message: `${action} completed successfully`,
        action,
        targetType,
        targetId,
      },
    };

    res.status(200).json(response);
  });
}

export default new AdminController();
