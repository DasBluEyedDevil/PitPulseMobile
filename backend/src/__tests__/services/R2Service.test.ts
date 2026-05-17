import { describe, it, expect, beforeEach, afterAll, jest } from '@jest/globals';

const mockS3Send = jest.fn<(...args: unknown[]) => Promise<unknown>>();

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: mockS3Send,
  })),
  PutObjectCommand: jest.fn().mockImplementation((input: unknown) => ({ input })),
  DeleteObjectCommand: jest.fn().mockImplementation((input: unknown) => ({ input })),
  HeadObjectCommand: jest.fn().mockImplementation((input: unknown) => ({ input })),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { HeadObjectCommand } from '@aws-sdk/client-s3';
import { R2Service } from '../../services/R2Service';

describe('R2Service', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      CLOUDFLARE_ACCOUNT_ID: 'account-id',
      R2_ACCESS_KEY_ID: 'access-key',
      R2_SECRET_ACCESS_KEY: 'secret-key',
      R2_BUCKET_NAME: 'photos-bucket',
      R2_PUBLIC_URL: 'https://cdn.example.com',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns metadata for an existing object', async () => {
    mockS3Send.mockResolvedValueOnce({
      ContentLength: 12345,
      ContentType: 'image/jpeg',
    });

    const service = new R2Service();
    const result = await service.headObject('checkins/photo.jpg');

    expect(result).toEqual({
      exists: true,
      contentLength: 12345,
      contentType: 'image/jpeg',
    });
    expect(HeadObjectCommand).toHaveBeenCalledWith({
      Bucket: 'photos-bucket',
      Key: 'checkins/photo.jpg',
    });
  });

  it('returns exists false for missing objects', async () => {
    const missingError = Object.assign(new Error('Not found'), {
      name: 'NotFound',
      $metadata: { httpStatusCode: 404 },
    });
    mockS3Send.mockRejectedValueOnce(missingError);

    const service = new R2Service();
    const result = await service.headObject('checkins/missing.jpg');

    expect(result).toEqual({ exists: false });
  });

  it('marks transient provider errors as retryable server-side errors', async () => {
    const providerError = Object.assign(new Error('Provider unavailable'), {
      $metadata: { httpStatusCode: 503 },
    });
    mockS3Send.mockRejectedValueOnce(providerError);

    const service = new R2Service();

    await expect(service.headObject('checkins/photo.jpg')).rejects.toMatchObject({
      message: 'Provider unavailable',
      statusCode: 503,
    });
  });

  it('objectExists returns the HEAD existence value', async () => {
    mockS3Send.mockResolvedValueOnce({ ContentLength: 1, ContentType: 'image/png' });

    const service = new R2Service();

    await expect(service.objectExists('checkins/photo.png')).resolves.toBe(true);
  });
});
