import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockSatori = jest.fn<(...args: unknown[]) => Promise<string>>();
const mockUploadBuffer = jest.fn<(...args: unknown[]) => Promise<string>>();
const mockHeadObject = jest.fn<(...args: unknown[]) => Promise<{ exists: boolean }>>();

jest.mock('satori', () => ({
  __esModule: true,
  default: mockSatori,
}));

jest.mock('@resvg/resvg-js', () => ({
  Resvg: jest.fn().mockImplementation(() => ({
    render: () => ({
      asPng: () => Buffer.from('png'),
    }),
  })),
}));

jest.mock('../../services/R2Service', () => ({
  r2Service: {
    isReady: true,
    configured: true,
    headObject: mockHeadObject,
    uploadBuffer: mockUploadBuffer,
    getPublicUrl: (key: string) => `https://cdn.example.com/${key}`,
  },
}));

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { ShareCardService } from '../../services/ShareCardService';

describe('ShareCardService public card reuse', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSatori.mockResolvedValue('<svg></svg>');
    mockUploadBuffer.mockImplementation(async (_buffer, key) => `https://cdn.example.com/${key}`);
  });

  it('uses deterministic check-in card keys and reuses existing R2 objects', async () => {
    const service = new ShareCardService();
    const data = {
      username: 'alice',
      venueName: 'Venue',
      bandNames: ['Band'],
      date: '2026-05-17',
    } as any;

    mockHeadObject.mockResolvedValueOnce({ exists: false }).mockResolvedValueOnce({ exists: false });

    const generated = await service.generateCheckinCard('checkin-1', data);

    expect(generated).toEqual({
      ogUrl: 'https://cdn.example.com/cards/checkin/checkin-1-og.png',
      storiesUrl: 'https://cdn.example.com/cards/checkin/checkin-1-stories.png',
    });
    expect(mockUploadBuffer.mock.calls.map((call) => call[1])).toEqual([
      'cards/checkin/checkin-1-og.png',
      'cards/checkin/checkin-1-stories.png',
    ]);

    mockUploadBuffer.mockClear();
    mockHeadObject.mockResolvedValueOnce({ exists: true }).mockResolvedValueOnce({ exists: true });

    const reused = await service.generateCheckinCard('checkin-1', data);

    expect(reused).toEqual(generated);
    expect(mockUploadBuffer).not.toHaveBeenCalled();
  });

  it('uses deterministic badge card keys and reuses existing R2 objects', async () => {
    const service = new ShareCardService();
    const data = {
      username: 'alice',
      badgeName: 'Night Owl',
      badgeDescription: 'Late show',
      badgeIcon: 'moon',
    } as any;

    mockHeadObject.mockResolvedValueOnce({ exists: false }).mockResolvedValueOnce({ exists: false });

    await service.generateBadgeCard('badge-award-1', data);

    expect(mockUploadBuffer.mock.calls.map((call) => call[1])).toEqual([
      'cards/badge/badge-award-1-og.png',
      'cards/badge/badge-award-1-stories.png',
    ]);

    mockUploadBuffer.mockClear();
    mockHeadObject.mockResolvedValueOnce({ exists: true }).mockResolvedValueOnce({ exists: true });

    await service.generateBadgeCard('badge-award-1', data);

    expect(mockUploadBuffer).not.toHaveBeenCalled();
  });
});
