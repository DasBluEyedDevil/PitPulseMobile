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
  },
}));
jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const mockDb = {
  query: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
};

(Database.getInstance as jest.Mock).mockReturnValue(mockDb);

describe('CheckinPhotoService', () => {
  const checkinId = '550e8400-e29b-41d4-a716-446655440000';
  const userId = '550e8400-e29b-41d4-a716-446655440001';
  const photoKeys = [`checkins/${checkinId}/one.jpg`, `checkins/${checkinId}/two.jpg`];
  const mockR2Service = r2Service as jest.Mocked<typeof r2Service>;

  let service: CheckinPhotoService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.R2_PUBLIC_URL = 'https://cdn.example.com';
    service = new CheckinPhotoService();
  });

  it('HEADs all pending keys before storing URLs and deleting pending rows', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: [{ user_id: userId, image_urls: ['https://old.example.com/photo.jpg'] }] })
      .mockResolvedValueOnce({ rows: photoKeys.map((object_key) => ({ object_key })) })
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({ rowCount: 2 });
    mockR2Service.headObject.mockResolvedValue({ exists: true, contentLength: 100, contentType: 'image/jpeg' });

    const result = await service.addPhotos(checkinId, userId, photoKeys);

    expect(mockR2Service.headObject).toHaveBeenCalledTimes(2);
    expect(mockR2Service.headObject).toHaveBeenNthCalledWith(1, photoKeys[0]);
    expect(mockR2Service.headObject).toHaveBeenNthCalledWith(2, photoKeys[1]);
    expect(result).toEqual([
      'https://old.example.com/photo.jpg',
      `https://cdn.example.com/${photoKeys[0]}`,
      `https://cdn.example.com/${photoKeys[1]}`,
    ]);
    expect(mockDb.query).toHaveBeenNthCalledWith(
      3,
      'UPDATE checkins SET image_urls = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [result, checkinId]
    );
    expect(mockDb.query).toHaveBeenNthCalledWith(
      4,
      `DELETE FROM pending_photo_uploads WHERE checkin_id = $1 AND object_key = ANY($2::text[])`,
      [checkinId, photoKeys]
    );
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
});
