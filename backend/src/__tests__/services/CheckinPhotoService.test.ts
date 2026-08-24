import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import Database from '../../config/database';
import { r2Service } from '../../services/R2Service';
import { CheckinPhotoService } from '../../services/checkin/CheckinPhotoService';

jest.mock('../../config/database');
jest.mock('../../services/R2Service', () => ({
  ALLOWED_IMAGE_TYPES: {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/heic': 'heic',
  },
  MAX_UPLOAD_FILE_SIZE_BYTES: 10 * 1024 * 1024,
  r2Service: {
    getPresignedUploadUrl: jest.fn(),
    headObject: jest.fn(),
    deleteObject: jest.fn(),
    getPublicUrl: jest.fn((key: string) => `https://cdn.example.com/${key}`),
    isReady: true,
  },
}));
jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const mockClientQuery = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockClientRelease = jest.fn();
const mockDb = {
  query: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  getClient: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
};

(Database.getInstance as jest.Mock).mockReturnValue(mockDb);

describe('CheckinPhotoService', () => {
  const checkinId = '550e8400-e29b-41d4-a716-446655440000';
  const userId = '550e8400-e29b-41d4-a716-446655440001';
  const photoKeys = [`checkins/${checkinId}/one.jpg`, `checkins/${checkinId}/two.jpg`];
  const mockR2Service = r2Service as jest.Mocked<typeof r2Service>;

  let service: CheckinPhotoService;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env.R2_PUBLIC_URL = 'https://cdn.example.com';
    delete process.env.R2_HISTORICAL_PUBLIC_URLS;
    delete process.env.R2_TRUSTED_HISTORICAL_PUBLIC_URLS;
    (Database.getInstance as jest.Mock).mockReturnValue(mockDb);
    mockDb.query.mockResolvedValue({ rows: [], rowCount: 0 });
    mockDb.getClient.mockResolvedValue({
      query: mockClientQuery,
      release: mockClientRelease,
    });
    mockClientQuery.mockImplementation(async (sql: unknown) => {
      const text = String(sql);
      if (text === 'BEGIN' || text === 'COMMIT' || text === 'ROLLBACK') {
        return { rows: [], rowCount: 0 };
      }
      return { rows: [], rowCount: 0 };
    });
    mockR2Service.getPublicUrl.mockImplementation(
      (key: string) => `https://cdn.example.com/${key}`
    );
    mockR2Service.deleteObject.mockResolvedValue(undefined as never);
    service = new CheckinPhotoService();
  });

  function mockConfirmTransaction(options: {
    lockedUrls: string[];
    lockedUserId?: string;
    updateRowCount?: number;
    updatedUrls?: string[];
  }) {
    mockClientQuery.mockImplementation(async (sql: unknown, values?: unknown) => {
      const text = String(sql);
      if (text === 'BEGIN' || text === 'COMMIT' || text === 'ROLLBACK') {
        return { rows: [], rowCount: 0 };
      }
      if (text.includes('FROM pending_photo_uploads') && text.includes('FOR UPDATE')) {
        const params = Array.isArray(values) ? values : undefined;
        const requestedKeys = Array.isArray(params?.[2]) ? (params[2] as string[]) : photoKeys;
        return {
          rows: requestedKeys.map((object_key) => ({ object_key })),
          rowCount: requestedKeys.length,
        };
      }
      if (text.includes('FOR UPDATE')) {
        return {
          rows: [
            {
              user_id: options.lockedUserId ?? userId,
              image_urls: options.lockedUrls,
            },
          ],
        };
      }
      if (text.includes('UPDATE checkins')) {
        return {
          rowCount: options.updateRowCount ?? 1,
          rows: [{ image_urls: options.updatedUrls ?? options.lockedUrls }],
        };
      }
      if (text.includes('DELETE FROM pending_photo_uploads')) {
        const params = Array.isArray(values) ? values : undefined;
        const keysToConsume = Array.isArray(params?.[2]) ? (params[2] as string[]) : photoKeys;
        return {
          rows: keysToConsume.map((object_key) => ({ object_key })),
          rowCount: keysToConsume.length,
        };
      }
      return { rows: [], rowCount: 0 };
    });
  }

  it('counts unexpired pending uploads before issuing new signed URLs', async () => {
    mockDb.query
      .mockResolvedValueOnce({
        rows: [{ user_id: userId, image_urls: ['https://old.example.com/photo.jpg'] }],
      })
      .mockResolvedValueOnce({ rowCount: 0 })
      .mockResolvedValueOnce({ rows: [{ count: 1 }] })
      .mockResolvedValueOnce({ rowCount: 2 });
    mockR2Service.getPresignedUploadUrl
      .mockResolvedValueOnce({
        uploadUrl: 'https://upload.example.com/one',
        objectKey: photoKeys[0],
        publicUrl: `https://cdn.example.com/${photoKeys[0]}`,
      })
      .mockResolvedValueOnce({
        uploadUrl: 'https://upload.example.com/two',
        objectKey: photoKeys[1],
        publicUrl: `https://cdn.example.com/${photoKeys[1]}`,
      });

    const result = await service.requestPhotoUploadUrls(checkinId, userId, [
      'image/jpeg',
      'image/jpeg',
    ]);

    expect(result.map((item) => item.objectKey)).toEqual(photoKeys);
    expect(mockDb.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("created_at < NOW() - INTERVAL '15 minutes'"),
      [checkinId, userId]
    );
    expect(mockDb.query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('SELECT COUNT(*)::int AS count'),
      [checkinId, userId]
    );
  });

  it('rejects new signed URLs when attached plus pending plus requested photos exceed the cap', async () => {
    mockDb.query
      .mockResolvedValueOnce({
        rows: [{ user_id: userId, image_urls: ['https://old.example.com/photo.jpg'] }],
      })
      .mockResolvedValueOnce({ rowCount: 0 })
      .mockResolvedValueOnce({ rows: [{ count: 2 }] });

    await expect(
      service.requestPhotoUploadUrls(checkinId, userId, ['image/jpeg', 'image/png'])
    ).rejects.toMatchObject({ statusCode: 400 });

    expect(mockR2Service.getPresignedUploadUrl).not.toHaveBeenCalled();
  });

  it('rejects signed URL requests for missing check-ins and non-owners', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [] });

    await expect(
      service.requestPhotoUploadUrls(checkinId, userId, ['image/jpeg'])
    ).rejects.toMatchObject({
      message: 'Check-in not found',
      statusCode: 404,
    });

    mockDb.query.mockResolvedValueOnce({
      rows: [{ user_id: 'another-user', image_urls: [] }],
    });

    await expect(
      service.requestPhotoUploadUrls(checkinId, userId, ['image/jpeg'])
    ).rejects.toMatchObject({
      message: 'Unauthorized to modify this check-in',
      statusCode: 403,
    });
    expect(mockR2Service.getPresignedUploadUrl).not.toHaveBeenCalled();
  });

  it('HEADs all pending keys before storing URLs and deleting pending rows', async () => {
    const existingUrl = 'https://old.example.com/photo.jpg';
    const combinedUrls = [
      existingUrl,
      `https://cdn.example.com/${photoKeys[0]}`,
      `https://cdn.example.com/${photoKeys[1]}`,
    ];
    mockDb.query
      .mockResolvedValueOnce({
        rows: [{ user_id: userId, image_urls: [existingUrl] }],
      })
      .mockResolvedValueOnce({ rows: photoKeys.map((object_key) => ({ object_key })) });
    mockR2Service.headObject.mockResolvedValue({
      exists: true,
      contentLength: 100,
      contentType: 'image/jpeg',
    });
    mockConfirmTransaction({
      lockedUrls: [existingUrl],
      updatedUrls: combinedUrls,
    });

    const result = await service.addPhotos(checkinId, userId, photoKeys);

    expect(mockR2Service.headObject).toHaveBeenCalledTimes(2);
    expect(mockR2Service.headObject).toHaveBeenNthCalledWith(1, photoKeys[0]);
    expect(mockR2Service.headObject).toHaveBeenNthCalledWith(2, photoKeys[1]);
    expect(result).toEqual(combinedUrls);
    expect(mockClientQuery).toHaveBeenCalledWith('BEGIN');
    expect(mockClientQuery).toHaveBeenCalledWith(
      'SELECT user_id, image_urls FROM checkins WHERE id = $1 FOR UPDATE',
      [checkinId]
    );
    expect(mockClientQuery).toHaveBeenCalledWith(
      expect.stringContaining("cardinality(COALESCE(image_urls, '{}'::text[])) + $3 <= $4"),
      [combinedUrls, checkinId, photoKeys.length, service.MAX_PHOTOS_PER_CHECKIN]
    );
    expect(mockClientQuery).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM pending_photo_uploads'),
      [checkinId, userId, photoKeys]
    );
    expect(mockClientQuery).toHaveBeenCalledWith('COMMIT');
    expect(mockClientRelease).toHaveBeenCalled();
  });

  it('returns the same stored URLs when a consumed confirmation is retried', async () => {
    const confirmedUrl = `https://cdn.example.com/${photoKeys[0]}`;
    let imageUrls: string[] = [];
    let pendingAvailable = true;
    let updateCount = 0;
    let deleteCount = 0;

    mockDb.query.mockImplementation(async (sql: unknown) => {
      const text = String(sql);
      if (text.includes('SELECT user_id, image_urls FROM checkins')) {
        return { rows: [{ user_id: userId, image_urls: [...imageUrls] }] };
      }
      if (text.includes('FROM pending_photo_uploads')) {
        return { rows: pendingAvailable ? [{ object_key: photoKeys[0] }] : [] };
      }
      return { rows: [], rowCount: 0 };
    });
    mockR2Service.headObject.mockResolvedValueOnce({
      exists: true,
      contentLength: 100,
      contentType: 'image/jpeg',
    });
    mockClientQuery.mockImplementation(async (sql: unknown, values?: unknown) => {
      const text = String(sql);
      if (text === 'BEGIN' || text === 'COMMIT' || text === 'ROLLBACK') {
        return { rows: [], rowCount: 0 };
      }
      if (text.includes('SELECT user_id, image_urls FROM checkins')) {
        return { rows: [{ user_id: userId, image_urls: [...imageUrls] }] };
      }
      if (text.includes('FROM pending_photo_uploads') && text.includes('FOR UPDATE')) {
        return {
          rows: pendingAvailable ? [{ object_key: photoKeys[0] }] : [],
          rowCount: pendingAvailable ? 1 : 0,
        };
      }
      if (text.includes('UPDATE checkins')) {
        const updatedUrls = (values as unknown[])[0] as string[];
        imageUrls = [...updatedUrls];
        updateCount += 1;
        return { rows: [{ image_urls: [...imageUrls] }], rowCount: 1 };
      }
      if (text.includes('DELETE FROM pending_photo_uploads')) {
        pendingAvailable = false;
        deleteCount += 1;
        return { rows: [{ object_key: photoKeys[0] }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    });

    await expect(service.addPhotos(checkinId, userId, [photoKeys[0]])).resolves.toEqual([
      confirmedUrl,
    ]);
    await expect(service.addPhotos(checkinId, userId, [photoKeys[0]])).resolves.toEqual([
      confirmedUrl,
    ]);

    expect(imageUrls).toEqual([confirmedUrl]);
    expect(updateCount).toBe(1);
    expect(deleteCount).toBe(1);
  });

  it('serializes concurrent confirmations and appends a shared key only once', async () => {
    const confirmedUrl = `https://cdn.example.com/${photoKeys[0]}`;
    let imageUrls: string[] = [];
    let pendingAvailable = true;
    let preflightCount = 0;
    let releasePreflight!: () => void;
    const preflightBarrier = new Promise<void>((resolve) => {
      releasePreflight = resolve;
    });
    let firstLockAvailable = true;
    let releaseFirstCommit!: () => void;
    const firstCommit = new Promise<void>((resolve) => {
      releaseFirstCommit = resolve;
    });
    let updateCount = 0;
    let deleteCount = 0;

    mockDb.query.mockImplementation(async (sql: unknown) => {
      const text = String(sql);
      if (text.includes('SELECT user_id, image_urls FROM checkins')) {
        return { rows: [{ user_id: userId, image_urls: [...imageUrls] }] };
      }
      if (text.includes('FROM pending_photo_uploads')) {
        preflightCount += 1;
        if (preflightCount === 2) {
          releasePreflight();
        }
        await preflightBarrier;
        return { rows: pendingAvailable ? [{ object_key: photoKeys[0] }] : [] };
      }
      return { rows: [], rowCount: 0 };
    });
    mockR2Service.headObject.mockResolvedValue({
      exists: true,
      contentLength: 100,
      contentType: 'image/jpeg',
    });
    mockDb.getClient.mockImplementation(async () => ({
      query: async (sql: unknown, values?: unknown) => {
        const text = String(sql);
        if (text === 'BEGIN' || text === 'ROLLBACK') {
          return { rows: [], rowCount: 0 };
        }
        if (text === 'COMMIT') {
          releaseFirstCommit();
          return { rows: [], rowCount: 0 };
        }
        if (text.includes('SELECT user_id, image_urls FROM checkins')) {
          if (!firstLockAvailable) {
            await firstCommit;
          }
          firstLockAvailable = false;
          return { rows: [{ user_id: userId, image_urls: [...imageUrls] }] };
        }
        if (text.includes('FROM pending_photo_uploads') && text.includes('FOR UPDATE')) {
          return {
            rows: pendingAvailable ? [{ object_key: photoKeys[0] }] : [],
            rowCount: pendingAvailable ? 1 : 0,
          };
        }
        if (text.includes('UPDATE checkins')) {
          const updatedUrls = (values as unknown[])[0] as string[];
          imageUrls = [...updatedUrls];
          updateCount += 1;
          return { rows: [{ image_urls: [...imageUrls] }], rowCount: 1 };
        }
        if (text.includes('DELETE FROM pending_photo_uploads')) {
          pendingAvailable = false;
          deleteCount += 1;
          return { rows: [{ object_key: photoKeys[0] }], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      },
      release: mockClientRelease,
    }));

    const outcomes = await Promise.allSettled([
      service.addPhotos(checkinId, userId, [photoKeys[0]]),
      service.addPhotos(checkinId, userId, [photoKeys[0]]),
    ]);

    expect(outcomes.every((outcome) => outcome.status === 'fulfilled')).toBe(true);
    expect(
      outcomes.map((outcome) => (outcome.status === 'fulfilled' ? outcome.value : null))
    ).toEqual([[confirmedUrl], [confirmedUrl]]);
    expect(imageUrls).toEqual([confirmedUrl]);
    expect(updateCount).toBe(1);
    expect(deleteCount).toBe(1);
  });

  it('rejects missing R2 objects without updating image URLs or deleting pending rows', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: [{ user_id: userId, image_urls: [] }] })
      .mockResolvedValueOnce({ rows: photoKeys.map((object_key) => ({ object_key })) });
    mockR2Service.headObject
      .mockResolvedValueOnce({ exists: true, contentLength: 100, contentType: 'image/jpeg' })
      .mockResolvedValueOnce({ exists: false });

    await expect(service.addPhotos(checkinId, userId, photoKeys)).rejects.toMatchObject({
      statusCode: 409,
    });

    expect(mockDb.query).toHaveBeenCalledTimes(2);
    expect(mockDb.query).not.toHaveBeenCalledWith(
      expect.stringContaining('UPDATE checkins'),
      expect.anything()
    );
    expect(mockDb.query).not.toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM pending_photo_uploads'),
      expect.anything()
    );
  });

  it('surfaces transient R2 errors as retryable server-side failures without DB mutation', async () => {
    const providerError = Object.assign(new Error('R2 unavailable'), { statusCode: 503 });
    mockDb.query
      .mockResolvedValueOnce({ rows: [{ user_id: userId, image_urls: [] }] })
      .mockResolvedValueOnce({ rows: photoKeys.map((object_key) => ({ object_key })) });
    mockR2Service.headObject.mockRejectedValueOnce(providerError);

    await expect(service.addPhotos(checkinId, userId, photoKeys)).rejects.toMatchObject({
      message: 'R2 unavailable',
      statusCode: 503,
    });

    expect(mockDb.query).toHaveBeenCalledTimes(2);
  });

  it('rejects invalid pending keys before HEAD checks', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: [{ user_id: userId, image_urls: [] }] })
      .mockResolvedValueOnce({ rows: [{ object_key: photoKeys[0] }] });

    await expect(service.addPhotos(checkinId, userId, photoKeys)).rejects.toMatchObject({
      statusCode: 400,
    });

    expect(mockR2Service.headObject).not.toHaveBeenCalled();
    expect(mockDb.query).toHaveBeenCalledTimes(2);
  });

  it('rejects uploaded objects with unsigned or mismatched content type metadata', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: [{ user_id: userId, image_urls: [] }] })
      .mockResolvedValueOnce({ rows: [{ object_key: photoKeys[0] }] });
    mockR2Service.headObject.mockResolvedValueOnce({
      exists: true,
      contentLength: 100,
      contentType: 'text/plain',
    });

    await expect(service.addPhotos(checkinId, userId, [photoKeys[0]])).rejects.toMatchObject({
      statusCode: 400,
    });

    expect(mockDb.query).toHaveBeenCalledTimes(2);
    expect(mockDb.query).not.toHaveBeenCalledWith(
      expect.stringContaining('UPDATE checkins'),
      expect.anything()
    );
  });

  it('rejects uploaded objects larger than the configured photo size limit', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: [{ user_id: userId, image_urls: [] }] })
      .mockResolvedValueOnce({ rows: [{ object_key: photoKeys[0] }] });
    mockR2Service.headObject.mockResolvedValueOnce({
      exists: true,
      contentLength: 10 * 1024 * 1024 + 1,
      contentType: 'image/jpeg',
    });

    await expect(service.addPhotos(checkinId, userId, [photoKeys[0]])).rejects.toMatchObject({
      statusCode: 400,
    });

    expect(mockDb.query).toHaveBeenCalledTimes(2);
  });

  it('rejects uploaded objects whose extension does not match the signed image type', async () => {
    const mismatchedKey = `checkins/${checkinId}/renamed.png`;
    mockDb.query
      .mockResolvedValueOnce({ rows: [{ user_id: userId, image_urls: [] }] })
      .mockResolvedValueOnce({ rows: [{ object_key: mismatchedKey }] });
    mockR2Service.headObject.mockResolvedValueOnce({
      exists: true,
      contentLength: 100,
      contentType: 'image/jpeg; charset=binary',
    });

    await expect(service.addPhotos(checkinId, userId, [mismatchedKey])).rejects.toMatchObject({
      message: 'One or more uploaded photos have an invalid type or size',
      statusCode: 400,
    });
    expect(mockDb.query).toHaveBeenCalledTimes(2);
  });

  it('does not attach photos when existing and newly confirmed URLs exceed the cap', async () => {
    const existingUrls = Array.from(
      { length: service.MAX_PHOTOS_PER_CHECKIN },
      (_, index) => `https://cdn.example.com/existing-${index}.jpg`
    );
    mockDb.query
      .mockResolvedValueOnce({ rows: [{ user_id: userId, image_urls: existingUrls }] })
      .mockResolvedValueOnce({ rows: [{ object_key: photoKeys[0] }] });
    mockR2Service.headObject.mockResolvedValueOnce({
      exists: true,
      contentLength: 100,
      contentType: 'image/jpeg',
    });

    await expect(service.addPhotos(checkinId, userId, [photoKeys[0]])).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(mockDb.query).not.toHaveBeenCalledWith(
      expect.stringContaining('UPDATE checkins'),
      expect.anything()
    );
    expect(mockDb.getClient).not.toHaveBeenCalled();
  });

  it('rejects a confirm that would exceed max after locking the check-in row', async () => {
    const existingUrls = ['https://cdn.example.com/a.jpg', 'https://cdn.example.com/b.jpg'];
    const lockedUrls = [
      ...existingUrls,
      'https://cdn.example.com/c.jpg',
      'https://cdn.example.com/d.jpg',
    ];
    mockDb.query
      .mockResolvedValueOnce({ rows: [{ user_id: userId, image_urls: existingUrls }] })
      .mockResolvedValueOnce({ rows: [{ object_key: photoKeys[0] }] });
    mockR2Service.headObject.mockResolvedValueOnce({
      exists: true,
      contentLength: 100,
      contentType: 'image/jpeg',
    });
    mockConfirmTransaction({ lockedUrls });

    await expect(service.addPhotos(checkinId, userId, [photoKeys[0]])).rejects.toMatchObject({
      statusCode: 400,
    });

    expect(mockClientQuery).toHaveBeenCalledWith('BEGIN');
    expect(mockClientQuery).toHaveBeenCalledWith('ROLLBACK');
    expect(mockClientQuery).not.toHaveBeenCalledWith(
      expect.stringContaining('UPDATE checkins'),
      expect.anything()
    );
    expect(mockClientQuery).not.toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM pending_photo_uploads'),
      expect.anything()
    );
    expect(mockClientRelease).toHaveBeenCalled();
  });

  it('enforces max photos with a cardinality predicate when the locked UPDATE matches no row', async () => {
    const existingUrls = [
      'https://cdn.example.com/a.jpg',
      'https://cdn.example.com/b.jpg',
      'https://cdn.example.com/c.jpg',
    ];
    mockDb.query
      .mockResolvedValueOnce({ rows: [{ user_id: userId, image_urls: existingUrls }] })
      .mockResolvedValueOnce({ rows: [{ object_key: photoKeys[0] }] });
    mockR2Service.headObject.mockResolvedValueOnce({
      exists: true,
      contentLength: 100,
      contentType: 'image/jpeg',
    });
    mockConfirmTransaction({ lockedUrls: existingUrls, updateRowCount: 0 });

    await expect(service.addPhotos(checkinId, userId, [photoKeys[0]])).rejects.toMatchObject({
      statusCode: 400,
    });

    expect(mockClientQuery).toHaveBeenCalledWith(
      expect.stringContaining("cardinality(COALESCE(image_urls, '{}'::text[])) + $3 <= $4"),
      expect.anything()
    );
    expect(mockClientQuery).toHaveBeenCalledWith('ROLLBACK');
    expect(mockClientQuery).not.toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM pending_photo_uploads'),
      expect.anything()
    );
  });

  it('fails closed with 503 when R2 is ready but R2_PUBLIC_URL is empty', async () => {
    process.env.R2_PUBLIC_URL = '';
    mockR2Service.getPublicUrl.mockImplementationOnce(() => {
      throw Object.assign(new Error('Photo storage public URL is not configured'), {
        statusCode: 503,
      });
    });
    mockDb.query
      .mockResolvedValueOnce({ rows: [{ user_id: userId, image_urls: [] }] })
      .mockResolvedValueOnce({ rows: [{ object_key: photoKeys[0] }] });
    mockR2Service.headObject.mockResolvedValueOnce({
      exists: true,
      contentLength: 100,
      contentType: 'image/jpeg',
    });

    await expect(service.addPhotos(checkinId, userId, [photoKeys[0]])).rejects.toMatchObject({
      message: 'Photo storage public URL is not configured',
      statusCode: 503,
    });

    expect(mockR2Service.getPublicUrl).toHaveBeenCalledWith(photoKeys[0]);
    expect(mockDb.getClient).not.toHaveBeenCalled();
  });

  it('surfaces unconfigured R2 HEAD as 503 without mutating the check-in', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: [{ user_id: userId, image_urls: [] }] })
      .mockResolvedValueOnce({ rows: [{ object_key: photoKeys[0] }] });
    mockR2Service.headObject.mockRejectedValueOnce(
      Object.assign(new Error('R2 is not configured'), { statusCode: 503 })
    );

    await expect(service.addPhotos(checkinId, userId, [photoKeys[0]])).rejects.toMatchObject({
      message: 'R2 is not configured',
      statusCode: 503,
    });

    expect(mockDb.getClient).not.toHaveBeenCalled();
  });

  it('returns stored photos and degrades to an empty list for missing rows or database errors', async () => {
    const stored = ['https://cdn.example.com/one.jpg'];
    mockDb.query
      .mockResolvedValueOnce({ rows: [{ image_urls: stored }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockRejectedValueOnce(new Error('database unavailable'));

    await expect(service.getPhotos(checkinId)).resolves.toEqual(stored);
    await expect(service.getPhotos('missing')).resolves.toEqual([]);
    await expect(service.getPhotos(checkinId)).resolves.toEqual([]);
  });

  it('removes only selected photos for the check-in owner', async () => {
    const keepUrl = 'https://cdn.example.com/keep.jpg';
    const removeUrl = 'https://cdn.example.com/remove.jpg';
    mockDb.query
      .mockResolvedValueOnce({
        rows: [{ user_id: userId, image_urls: [keepUrl, removeUrl] }],
      })
      .mockResolvedValueOnce({ rowCount: 1 });

    await expect(service.deletePhotos(checkinId, userId, [removeUrl])).resolves.toEqual([keepUrl]);
    expect(mockDb.query).toHaveBeenNthCalledWith(
      2,
      'UPDATE checkins SET image_urls = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [[keepUrl], checkinId]
    );
    expect(mockR2Service.deleteObject).toHaveBeenCalledTimes(1);
    expect(mockR2Service.deleteObject).toHaveBeenCalledWith('remove.jpg');
  });

  it('skips R2 deletion for external or unknown photo URL origins', async () => {
    process.env.R2_PUBLIC_URL = 'https://cdn.example.com/photos';
    const keepUrl = 'https://cdn.example.com/keep.jpg';
    const externalUrl = 'https://untrusted.example.com/remove.jpg';
    const unknownPathUrl = 'https://cdn.example.com/other-bucket/remove.jpg';
    mockDb.query
      .mockResolvedValueOnce({
        rows: [{ user_id: userId, image_urls: [keepUrl, externalUrl, unknownPathUrl] }],
      })
      .mockResolvedValueOnce({ rowCount: 1 });

    await expect(
      service.deletePhotos(checkinId, userId, [externalUrl, unknownPathUrl])
    ).resolves.toEqual([keepUrl]);

    expect(mockR2Service.deleteObject).not.toHaveBeenCalled();
  });

  it('deletes objects from explicitly trusted historical R2 public URL bases', async () => {
    process.env.R2_HISTORICAL_PUBLIC_URLS = 'https://legacy-cdn.example.com/photos';
    const keepUrl = 'https://cdn.example.com/keep.jpg';
    const historicalUrl = 'https://legacy-cdn.example.com/photos/checkins/old.jpg';
    mockDb.query
      .mockResolvedValueOnce({
        rows: [{ user_id: userId, image_urls: [keepUrl, historicalUrl] }],
      })
      .mockResolvedValueOnce({ rowCount: 1 });

    await expect(service.deletePhotos(checkinId, userId, [historicalUrl])).resolves.toEqual([
      keepUrl,
    ]);

    expect(mockR2Service.deleteObject).toHaveBeenCalledWith('checkins/old.jpg');
  });

  it('still removes check-in URLs when R2 object delete fails', async () => {
    const keepUrl = 'https://cdn.example.com/keep.jpg';
    const removeUrl = 'https://cdn.example.com/remove.jpg';
    mockDb.query
      .mockResolvedValueOnce({
        rows: [{ user_id: userId, image_urls: [keepUrl, removeUrl] }],
      })
      .mockResolvedValueOnce({ rowCount: 1 });
    mockR2Service.deleteObject.mockRejectedValueOnce(new Error('R2 delete failed'));

    await expect(service.deletePhotos(checkinId, userId, [removeUrl])).resolves.toEqual([keepUrl]);
    expect(mockR2Service.deleteObject).toHaveBeenCalledWith('remove.jpg');
  });

  it('rejects photo deletion for missing check-ins and non-owners', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [] });

    await expect(service.deletePhotos(checkinId, userId, [])).rejects.toMatchObject({
      statusCode: 404,
    });

    mockDb.query.mockResolvedValueOnce({
      rows: [{ user_id: 'another-user', image_urls: [] }],
    });

    await expect(service.deletePhotos(checkinId, userId, [])).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('reports remaining photo slots without returning a negative value', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: [{ image_urls: ['one.jpg'] }] })
      .mockResolvedValueOnce({
        rows: [{ image_urls: ['1.jpg', '2.jpg', '3.jpg', '4.jpg', '5.jpg'] }],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockRejectedValueOnce(new Error('database unavailable'));

    await expect(service.getRemainingPhotoSlots(checkinId)).resolves.toBe(3);
    await expect(service.getRemainingPhotoSlots(checkinId)).resolves.toBe(0);
    await expect(service.getRemainingPhotoSlots('missing')).resolves.toBe(0);
    await expect(service.getRemainingPhotoSlots(checkinId)).resolves.toBe(0);
  });
});
