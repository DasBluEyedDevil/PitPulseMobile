/**
 * CheckinPhotoService -- Photo upload management for check-ins
 *
 * Extracted from CheckinService as part of P1 service decomposition.
 * Handles:
 *   - Requesting presigned upload URLs for photos
 *   - Confirming photo uploads and storing public URLs
 *   - Photo validation and limits
 */

import Database from '../../config/database';
import {
  ALLOWED_IMAGE_TYPES,
  MAX_UPLOAD_FILE_SIZE_BYTES,
  R2ObjectMetadata,
  r2Service,
} from '../R2Service';
import logger from '../../utils/logger';

export interface PhotoUploadUrl {
  uploadUrl: string;
  objectKey: string;
  publicUrl: string;
}

export interface PhotoUploadRequest {
  checkinId: string;
  userId: string;
  contentTypes: string[];
}

export interface PhotoConfirmationRequest {
  checkinId: string;
  userId: string;
  photoKeys: string[];
}

type ServiceError = Error & {
  statusCode?: number;
};

function normalizeContentType(contentType?: string): string {
  return (contentType || '').split(';')[0].trim().toLowerCase();
}

function expectedExtensionForObjectKey(objectKey: string): string | undefined {
  const extension = objectKey.split('.').pop()?.toLowerCase();
  return extension || undefined;
}

function configuredPublicUrlBases(): URL[] {
  const configuredBases = [
    process.env.R2_PUBLIC_URL,
    process.env.R2_HISTORICAL_PUBLIC_URLS,
    process.env.R2_TRUSTED_HISTORICAL_PUBLIC_URLS,
  ]
    .flatMap((value) => (value || '').split(','))
    .map((value) => value.trim())
    .filter(Boolean);

  return configuredBases.flatMap((value) => {
    try {
      return [new URL(value.replace(/\/+$/, ''))];
    } catch {
      return [];
    }
  });
}

function objectKeyFromPhotoUrl(photoUrl: string): string | undefined {
  try {
    const parsedPhotoUrl = new URL(photoUrl);

    for (const base of configuredPublicUrlBases()) {
      if (parsedPhotoUrl.origin !== base.origin) {
        continue;
      }

      const basePath = base.pathname.replace(/\/+$/, '');
      if (
        basePath &&
        parsedPhotoUrl.pathname !== basePath &&
        !parsedPhotoUrl.pathname.startsWith(`${basePath}/`)
      ) {
        continue;
      }

      const objectKey = basePath
        ? parsedPhotoUrl.pathname.slice(basePath.length + 1)
        : parsedPhotoUrl.pathname.replace(/^\/+/, '');
      return objectKey || undefined;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function invalidPendingPhotoKeysError(): ServiceError {
  const error: ServiceError = new Error(
    'One or more photo keys are invalid or were not issued for this check-in'
  );
  error.statusCode = 400;
  return error;
}

function validateUploadedPhotoMetadata(objectKey: string, metadata: R2ObjectMetadata): boolean {
  if (!metadata.exists) {
    return false;
  }

  const contentLength = metadata.contentLength ?? 0;
  if (contentLength <= 0 || contentLength > MAX_UPLOAD_FILE_SIZE_BYTES) {
    return false;
  }

  const contentType = normalizeContentType(metadata.contentType);
  const expectedExtension = ALLOWED_IMAGE_TYPES[contentType];
  if (!expectedExtension) {
    return false;
  }

  return expectedExtensionForObjectKey(objectKey) === expectedExtension;
}

export class CheckinPhotoService {
  private db = Database.getInstance();

  /**
   * Maximum photos allowed per check-in
   */
  readonly MAX_PHOTOS_PER_CHECKIN = 4;

  /**
   * Request presigned upload URLs for photos.
   * Validates that the checkin belongs to the user and enforces max photo count.
   */
  async requestPhotoUploadUrls(
    checkinId: string,
    userId: string,
    contentTypes: string[]
  ): Promise<PhotoUploadUrl[]> {
    try {
      // Verify checkin belongs to user
      const checkinResult = await this.db.query(
        'SELECT user_id, image_urls FROM checkins WHERE id = $1',
        [checkinId]
      );

      if (checkinResult.rows.length === 0) {
        const err = new Error('Check-in not found');
        (err as any).statusCode = 404;
        throw err;
      }

      if (checkinResult.rows[0].user_id !== userId) {
        const err = new Error('Unauthorized to modify this check-in');
        (err as any).statusCode = 403;
        throw err;
      }

      // Check existing photo count + requested count <= max
      const existingUrls: string[] = checkinResult.rows[0].image_urls || [];
      await this.db.query(
        `DELETE FROM pending_photo_uploads
         WHERE checkin_id = $1
           AND user_id = $2
           AND created_at < NOW() - INTERVAL '15 minutes'`,
        [checkinId, userId]
      );

      const pendingResult = await this.db.query(
        `SELECT COUNT(*)::int AS count
         FROM pending_photo_uploads
         WHERE checkin_id = $1
           AND user_id = $2`,
        [checkinId, userId]
      );
      const pendingCount = Number(pendingResult.rows[0]?.count || 0);
      const totalAfter = existingUrls.length + pendingCount + contentTypes.length;
      if (totalAfter > this.MAX_PHOTOS_PER_CHECKIN) {
        const err = new Error(
          `Maximum ${this.MAX_PHOTOS_PER_CHECKIN} photos per check-in. Currently ${existingUrls.length} attached and ${pendingCount} pending, requesting ${contentTypes.length}.`
        );
        (err as any).statusCode = 400;
        throw err;
      }

      // Generate presigned URLs for each content type
      const results = await Promise.all(
        contentTypes.map((ct) => r2Service.getPresignedUploadUrl(ct, `checkins/${checkinId}`))
      );

      // Track each issued object key in `pending_photo_uploads` so
      // `addPhotos` can verify the keys it's asked to attach are ones we
      // actually handed out. Keeping the DB write here (rather than inside
      // R2Service) keeps storage and domain concerns separate.
      const objectKeys = results.map((r) => r.objectKey);
      if (objectKeys.length > 0) {
        await this.db.query(
          `INSERT INTO pending_photo_uploads (checkin_id, user_id, object_key)
           SELECT $1, $2, UNNEST($3::text[])
           ON CONFLICT (object_key) DO NOTHING`,
          [checkinId, userId, objectKeys]
        );
      }

      return results.map((result) => ({
        uploadUrl: result.uploadUrl,
        objectKey: result.objectKey,
        publicUrl: result.publicUrl,
      }));
    } catch (error) {
      logger.error('[CheckinPhotoService] Request photo upload URLs error', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Confirm photo uploads and store their public URLs in the check-in.
   * Combines existing URLs with new ones and enforces max photo count.
   */
  async addPhotos(checkinId: string, userId: string, photoKeys: string[]): Promise<string[]> {
    try {
      // Verify checkin belongs to user
      const checkinResult = await this.db.query(
        'SELECT user_id, image_urls FROM checkins WHERE id = $1',
        [checkinId]
      );

      if (checkinResult.rows.length === 0) {
        const err = new Error('Check-in not found');
        (err as any).statusCode = 404;
        throw err;
      }

      if (checkinResult.rows[0].user_id !== userId) {
        const err = new Error('Unauthorized to modify this check-in');
        (err as any).statusCode = 403;
        throw err;
      }

      if (new Set(photoKeys).size !== photoKeys.length) {
        throw invalidPendingPhotoKeysError();
      }

      const existingUrls: string[] = checkinResult.rows[0].image_urls || [];
      const newUrls = photoKeys.map((key) => r2Service.getPublicUrl(key));
      const existingUrlSet = new Set(existingUrls);
      const photoKeysRequiringConfirmation = photoKeys.filter(
        (_, index) => !existingUrlSet.has(newUrls[index])
      );

      if (photoKeysRequiringConfirmation.length > 0) {
        const headResults = await Promise.all(
          photoKeysRequiringConfirmation.map((key) => r2Service.headObject(key))
        );
        const missingPhotoKeys = photoKeysRequiringConfirmation.filter(
          (_, index) => !headResults[index].exists
        );

        if (missingPhotoKeys.length > 0) {
          logger.warn('[CheckinPhotoService] Photo confirmation rejected for missing R2 objects', {
            checkinId,
            userId,
            missingCount: missingPhotoKeys.length,
          });

          const err: ServiceError = new Error(
            'One or more photos have not finished uploading. Please retry confirmation after upload completes.'
          );
          err.statusCode = 409;
          throw err;
        }

        const invalidPhotoKeys = photoKeysRequiringConfirmation.filter(
          (key, index) => !validateUploadedPhotoMetadata(key, headResults[index])
        );

        if (invalidPhotoKeys.length > 0) {
          logger.warn('[CheckinPhotoService] Photo confirmation rejected for invalid R2 metadata', {
            checkinId,
            userId,
            invalidCount: invalidPhotoKeys.length,
          });

          const err: ServiceError = new Error(
            'One or more uploaded photos have an invalid type or size'
          );
          err.statusCode = 400;
          throw err;
        }
      }

      if (
        existingUrls.length + photoKeysRequiringConfirmation.length >
        this.MAX_PHOTOS_PER_CHECKIN
      ) {
        const err = new Error(
          `Maximum ${this.MAX_PHOTOS_PER_CHECKIN} photos per check-in. Would have ${existingUrls.length + photoKeysRequiringConfirmation.length}.`
        );
        (err as any).statusCode = 400;
        throw err;
      }

      return await this.confirmPhotosInTransaction(checkinId, userId, photoKeys, newUrls);
    } catch (error) {
      logger.error('[CheckinPhotoService] Add photos error', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Lock the check-in row, append confirmed URLs only when
   * cardinality(image_urls)+n stays at or under MAX, and drop pending keys.
   */
  private async confirmPhotosInTransaction(
    checkinId: string,
    userId: string,
    photoKeys: string[],
    newUrls: string[]
  ): Promise<string[]> {
    const client = await this.db.getClient();

    try {
      await client.query('BEGIN');

      const lockedResult = await client.query(
        'SELECT user_id, image_urls FROM checkins WHERE id = $1 FOR UPDATE',
        [checkinId]
      );

      if (lockedResult.rows.length === 0) {
        const err: ServiceError = new Error('Check-in not found');
        err.statusCode = 404;
        throw err;
      }

      if (lockedResult.rows[0].user_id !== userId) {
        const err: ServiceError = new Error('Unauthorized to modify this check-in');
        err.statusCode = 403;
        throw err;
      }

      const lockedUrls: string[] = lockedResult.rows[0].image_urls || [];
      const pendingResult = await client.query(
        `SELECT object_key FROM pending_photo_uploads
         WHERE checkin_id = $1 AND user_id = $2 AND object_key = ANY($3::text[])
         FOR UPDATE`,
        [checkinId, userId, photoKeys]
      );
      const pendingKeys = new Set(
        pendingResult.rows.map((row: { object_key: string }) => row.object_key)
      );
      const keysToConsume = photoKeys.filter((key) => pendingKeys.has(key));
      const urlsToAppend = photoKeys
        .map((key, index) =>
          pendingKeys.has(key) && !lockedUrls.includes(newUrls[index]) ? newUrls[index] : undefined
        )
        .filter((url): url is string => Boolean(url));
      const missingKeys = photoKeys.filter(
        (key, index) => !pendingKeys.has(key) && !lockedUrls.includes(newUrls[index])
      );

      if (missingKeys.length > 0) {
        throw invalidPendingPhotoKeysError();
      }

      if (urlsToAppend.length === 0) {
        if (keysToConsume.length > 0) {
          const consumedResult = await client.query(
            `DELETE FROM pending_photo_uploads
             WHERE checkin_id = $1 AND user_id = $2 AND object_key = ANY($3::text[])
             RETURNING object_key`,
            [checkinId, userId, keysToConsume]
          );

          if (consumedResult.rowCount !== keysToConsume.length) {
            throw invalidPendingPhotoKeysError();
          }
        }

        await client.query('COMMIT');
        return lockedUrls;
      }

      const combinedUrls = [...lockedUrls, ...urlsToAppend];

      if (combinedUrls.length > this.MAX_PHOTOS_PER_CHECKIN) {
        const err: ServiceError = new Error(
          `Maximum ${this.MAX_PHOTOS_PER_CHECKIN} photos per check-in. Would have ${combinedUrls.length}.`
        );
        err.statusCode = 400;
        throw err;
      }

      const updateResult = await client.query(
        `UPDATE checkins
         SET image_urls = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
           AND cardinality(COALESCE(image_urls, '{}'::text[])) + $3 <= $4
         RETURNING image_urls`,
        [combinedUrls, checkinId, urlsToAppend.length, this.MAX_PHOTOS_PER_CHECKIN]
      );

      if (updateResult.rowCount !== 1) {
        const err: ServiceError = new Error(
          `Maximum ${this.MAX_PHOTOS_PER_CHECKIN} photos per check-in. Would have ${combinedUrls.length}.`
        );
        err.statusCode = 400;
        throw err;
      }

      const consumedResult = await client.query(
        `DELETE FROM pending_photo_uploads
         WHERE checkin_id = $1 AND user_id = $2 AND object_key = ANY($3::text[])
         RETURNING object_key`,
        [checkinId, userId, keysToConsume]
      );

      if (consumedResult.rowCount !== keysToConsume.length) {
        throw invalidPendingPhotoKeysError();
      }

      await client.query('COMMIT');
      return (updateResult.rows[0]?.image_urls as string[]) || combinedUrls;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get photos for a check-in
   */
  async getPhotos(checkinId: string): Promise<string[]> {
    try {
      const result = await this.db.query('SELECT image_urls FROM checkins WHERE id = $1', [
        checkinId,
      ]);

      if (result.rows.length === 0) {
        return [];
      }

      return result.rows[0].image_urls || [];
    } catch (error) {
      logger.error('[CheckinPhotoService] Get photos error', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return [];
    }
  }

  /**
   * Delete photos from a check-in (admin/rollback function)
   */
  async deletePhotos(
    checkinId: string,
    userId: string,
    photoUrlsToRemove: string[]
  ): Promise<string[]> {
    try {
      // Verify checkin belongs to user
      const checkinResult = await this.db.query(
        'SELECT user_id, image_urls FROM checkins WHERE id = $1',
        [checkinId]
      );

      if (checkinResult.rows.length === 0) {
        const err = new Error('Check-in not found');
        (err as any).statusCode = 404;
        throw err;
      }

      if (checkinResult.rows[0].user_id !== userId) {
        const err = new Error('Unauthorized to modify this check-in');
        (err as any).statusCode = 403;
        throw err;
      }

      const existingUrls: string[] = checkinResult.rows[0].image_urls || [];
      const remainingUrls = existingUrls.filter((url) => !photoUrlsToRemove.includes(url));
      const removedUrls = existingUrls.filter((url) => photoUrlsToRemove.includes(url));

      // Update the check-in with remaining URLs
      await this.db.query(
        'UPDATE checkins SET image_urls = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [remainingUrls, checkinId]
      );

      await Promise.all(
        removedUrls.map(async (url) => {
          const objectKey = objectKeyFromPhotoUrl(url);
          if (!objectKey) {
            logger.warn('[CheckinPhotoService] Skipping R2 delete for unparseable photo URL', {
              checkinId,
            });
            return;
          }

          try {
            await r2Service.deleteObject(objectKey);
          } catch (error) {
            logger.error('[CheckinPhotoService] Failed to delete R2 object', {
              checkinId,
              objectKey,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        })
      );

      return remainingUrls;
    } catch (error) {
      logger.error('[CheckinPhotoService] Delete photos error', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Check how many photos can still be added to a check-in
   */
  async getRemainingPhotoSlots(checkinId: string): Promise<number> {
    try {
      const result = await this.db.query('SELECT image_urls FROM checkins WHERE id = $1', [
        checkinId,
      ]);

      if (result.rows.length === 0) {
        return 0;
      }

      const existingUrls: string[] = result.rows[0].image_urls || [];
      return Math.max(0, this.MAX_PHOTOS_PER_CHECKIN - existingUrls.length);
    } catch (error) {
      logger.error('[CheckinPhotoService] Get remaining slots error', {
        error: error instanceof Error ? error.message : String(error),
      });
      return 0;
    }
  }
}
