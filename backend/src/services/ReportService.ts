/**
 * ReportService - Content Report CRUD Operations
 *
 * Handles user-submitted reports for content (checkins, comments, photos, users).
 * Validates content existence, deduplicates reports via UNIQUE constraint,
 * and enqueues SafeSearch scan jobs for photo reports.
 *
 * Phase 9: Trust & Safety Foundation
 */

import Database from '../config/database';
import { Report, CreateReportRequest, ContentType } from '../types';
import { mapDbRowToReport } from '../utils/dbMappers';
import { moderationQueue } from '../jobs/moderationQueue';
import { QueueContracts } from '../jobs/queueContracts';
import { logInfo } from '../utils/logger';
import { BlockService } from './BlockService';

export class ReportService {
  private db: Database;
  private blockService: BlockService;

  constructor(db?: Database) {
    this.db = db || Database.getInstance();
    this.blockService = new BlockService(db);
  }

  /**
   * Create a new content report.
   *
   * Validates that the reported content exists, resolves the target user,
   * handles deduplication via the UNIQUE constraint (reporter_id, content_type, content_id),
   * and enqueues a SafeSearch scan job for photo reports.
   */
  async createReport(reporterId: string, data: CreateReportRequest): Promise<Report> {
    // Validate content exists and resolve target user
    const contentInfo = await this.validateContentExists(
      reporterId,
      data.contentType,
      data.contentId
    );

    try {
      const result = await this.db.query(
        `INSERT INTO reports (reporter_id, content_type, content_id, target_user_id, reason, description)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          reporterId,
          data.contentType,
          data.contentId,
          contentInfo.targetUserId || null,
          data.reason,
          data.description || null,
        ]
      );

      const report = mapDbRowToReport(result.rows[0]);

      logInfo(`Report created`, {
        reportId: report.id,
        reporterId,
        contentType: data.contentType,
        contentId: data.contentId,
        reason: data.reason,
      });

      // If this is a photo report, enqueue a SafeSearch scan job
      if (data.contentType === 'photo' && contentInfo.imageUrl && moderationQueue) {
        await moderationQueue.add(QueueContracts.imageModeration.jobs.scanImage, {
          contentType: 'photo',
          contentId: data.contentId,
          imageUrl: contentInfo.imageUrl,
          userId: contentInfo.targetUserId,
        });

        logInfo(`SafeSearch scan enqueued for reported photo`, {
          reportId: report.id,
          contentId: data.contentId,
        });
      }

      return report;
    } catch (error: any) {
      // Handle UNIQUE constraint violation (duplicate report)
      if (error.code === '23505' && error.constraint?.includes('reporter_id')) {
        throw Object.assign(new Error('You have already reported this content'), {
          statusCode: 409,
        });
      }
      throw error;
    }
  }

  /**
   * Get all reports for a specific piece of content.
   */
  async getReportsForContent(contentType: ContentType, contentId: string): Promise<Report[]> {
    const result = await this.db.query(
      `SELECT * FROM reports
       WHERE content_type = $1 AND content_id = $2
       ORDER BY created_at DESC`,
      [contentType, contentId]
    );

    return result.rows.map(mapDbRowToReport);
  }

  /**
   * Get the number of reports a user has submitted since a given date.
   * Used for rate limiting (10 reports per user per day).
   */
  async getUserReportCount(userId: string, since: Date): Promise<number> {
    const result = await this.db.query(
      `SELECT COUNT(*) FROM reports WHERE reporter_id = $1 AND created_at > $2`,
      [userId, since]
    );

    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Validate that the reported content exists and resolve its author.
   * Returns the target user ID and image URL (for photo reports).
   */
  private async validateContentExists(
    reporterId: string,
    contentType: ContentType,
    contentId: string
  ): Promise<{ targetUserId: string | null; imageUrl: string | null }> {
    let query: string;
    let imageUrl: string | null = null;

    switch (contentType) {
      case 'checkin':
        query = `
          SELECT c.user_id
          FROM checkins c
          WHERE c.id = $1
            AND (c.is_hidden IS NOT TRUE)
            ${this.blockService.getBlockFilterSQL(reporterId, 'c.user_id')}
        `;
        break;
      case 'comment':
        query = `
          SELECT cc.user_id
          FROM checkin_comments cc
          INNER JOIN checkins c ON c.id = cc.checkin_id
          WHERE cc.id = $1
            AND (cc.is_hidden IS NOT TRUE)
            AND (c.is_hidden IS NOT TRUE)
            ${this.blockService.getBlockFilterSQL(reporterId, 'c.user_id')}
            ${this.blockService.getBlockFilterSQL(reporterId, 'cc.user_id')}
        `;
        break;
      case 'photo':
        // Photos are stored as image_urls array on checkins
        query = `
          SELECT c.user_id, c.image_urls
          FROM checkins c
          WHERE c.id = $1
            AND (c.is_hidden IS NOT TRUE)
            ${this.blockService.getBlockFilterSQL(reporterId, 'c.user_id')}
        `;
        break;
      case 'user':
        query = `SELECT id AS user_id FROM users WHERE id = $1`;
        break;
      default:
        throw Object.assign(new Error(`Invalid content type: ${contentType}`), { statusCode: 400 });
    }

    const result = await this.db.query(query, [contentId]);

    if (result.rows.length === 0) {
      throw Object.assign(new Error(`Content not found: ${contentType} ${contentId}`), {
        statusCode: 404,
      });
    }

    const row = result.rows[0];

    // For photo reports, get the first image URL for scanning
    if (contentType === 'photo' && row.image_urls && row.image_urls.length > 0) {
      imageUrl = row.image_urls[0];
    }

    return {
      targetUserId: row.user_id || null,
      imageUrl,
    };
  }
}
