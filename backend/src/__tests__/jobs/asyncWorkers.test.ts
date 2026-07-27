jest.mock('../../services/BadgeService', () => ({
  BadgeService: jest.fn(),
}));
jest.mock('../../services/EventSyncService', () => ({
  EventSyncService: jest.fn(),
}));
jest.mock('../../services/ImageModerationService', () => ({
  ImageModerationService: jest.fn(),
}));
jest.mock('../../services/ModerationService', () => ({
  ModerationService: jest.fn(),
}));
jest.mock('../../scripts/retentionJob', () => ({
  runRetentionJob: jest.fn(),
}));

import { processBadgeEvaluation } from '../../jobs/badgeWorker';
import { processEventSyncJob } from '../../jobs/eventSyncWorker';
import { processModerationJob } from '../../jobs/moderationWorker';
import { QueueContracts } from '../../jobs/queueContracts';

describe('async worker producer/consumer contracts', () => {
  describe('badge evaluation', () => {
    it('consumes the producer payload and returns the awarded count', async () => {
      const evaluateAndAward = jest.fn().mockResolvedValue([{ id: 'badge-1' }, { id: 'badge-2' }]);
      const now = jest.fn().mockReturnValueOnce(100).mockReturnValueOnce(145);

      await expect(
        processBadgeEvaluation(
          {
            id: 'job-1',
            data: { userId: 'user-1', checkinId: 'checkin-1' },
          },
          {
            createBadgeService: () => ({ evaluateAndAward }) as any,
            now,
          }
        )
      ).resolves.toEqual({ newBadges: 2, checkinId: 'checkin-1' });

      expect(evaluateAndAward).toHaveBeenCalledWith('user-1');
    });

    it('rejects when badge evaluation fails so BullMQ can retry it', async () => {
      const failure = new Error('database unavailable');
      const evaluateAndAward = jest.fn().mockRejectedValue(failure);

      await expect(
        processBadgeEvaluation(
          {
            id: 'job-2',
            data: { userId: 'user-2', checkinId: 'checkin-2' },
          },
          {
            createBadgeService: () => ({ evaluateAndAward }) as any,
            now: () => 100,
          }
        )
      ).rejects.toBe(failure);
    });
  });

  describe('image moderation', () => {
    const annotations = {
      adult: 'LIKELY',
      violence: 'UNLIKELY',
      racy: 'UNLIKELY',
      spoof: 'UNLIKELY',
      medical: 'UNLIKELY',
    };

    it('auto-hides and queues flagged content for review', async () => {
      const scanImage = jest.fn().mockResolvedValue({
        isFlagged: true,
        annotations,
        flagReasons: ['adult: LIKELY'],
      });
      const autoHideContent = jest.fn().mockResolvedValue(undefined);
      const createModerationItem = jest.fn().mockResolvedValue({ id: 'moderation-1' });

      await expect(
        processModerationJob(
          {
            id: 'job-3',
            data: {
              contentType: 'photo',
              contentId: 'checkin-3',
              imageUrl: 'https://cdn.example.test/photo.jpg',
              userId: 'user-3',
            },
          },
          {
            createImageModerationService: () => ({ scanImage }),
            createModerationService: () => ({ autoHideContent, createModerationItem }) as any,
            now: jest.fn().mockReturnValueOnce(200).mockReturnValueOnce(260),
          }
        )
      ).resolves.toEqual({ isFlagged: true, contentId: 'checkin-3' });

      expect(scanImage).toHaveBeenCalledWith('https://cdn.example.test/photo.jpg');
      expect(autoHideContent).toHaveBeenCalledWith('photo', 'checkin-3');
      expect(createModerationItem).toHaveBeenCalledWith({
        contentType: 'photo',
        contentId: 'checkin-3',
        source: 'auto_safesearch',
        safesearchResults: annotations,
      });
    });

    it('leaves clean content visible and out of the moderation queue', async () => {
      const scanImage = jest.fn().mockResolvedValue({
        isFlagged: false,
        annotations,
        flagReasons: [],
      });
      const autoHideContent = jest.fn();
      const createModerationItem = jest.fn();

      await processModerationJob(
        {
          id: 'job-4',
          data: {
            contentType: 'photo',
            contentId: 'checkin-4',
            imageUrl: 'https://cdn.example.test/clean.jpg',
            userId: 'user-4',
          },
        },
        {
          createImageModerationService: () => ({ scanImage }),
          createModerationService: () => ({ autoHideContent, createModerationItem }) as any,
          now: () => 300,
        }
      );

      expect(autoHideContent).not.toHaveBeenCalled();
      expect(createModerationItem).not.toHaveBeenCalled();
    });

    it('rejects provider failures so BullMQ retry policy remains effective', async () => {
      const failure = new Error('vision timeout');

      await expect(
        processModerationJob(
          {
            id: 'job-5',
            data: {
              contentType: 'photo',
              contentId: 'checkin-5',
              imageUrl: 'https://cdn.example.test/timeout.jpg',
              userId: 'user-5',
            },
          },
          {
            createImageModerationService: () => ({
              scanImage: jest.fn().mockRejectedValue(failure),
            }),
            createModerationService: () =>
              ({
                autoHideContent: jest.fn(),
                createModerationItem: jest.fn(),
              }) as any,
            now: () => 400,
          }
        )
      ).rejects.toBe(failure);
    });
  });

  describe('event sync', () => {
    it.each([
      QueueContracts.eventSync.jobs.scheduledSync,
      QueueContracts.eventSync.jobs.checkCancellations,
    ])('runs a full sync for %s', async (name) => {
      const runSync = jest.fn().mockResolvedValue(undefined);

      await processEventSyncJob(
        { id: 'job-6', name, data: {} },
        {
          createEventSyncService: () => ({ runSync }),
          runRetention: jest.fn(),
          now: () => 500,
        }
      );

      expect(runSync).toHaveBeenCalledWith();
    });

    it('passes the requested region to an on-demand sync', async () => {
      const runSync = jest.fn().mockResolvedValue(undefined);

      await processEventSyncJob(
        {
          id: 'job-7',
          name: QueueContracts.eventSync.jobs.regionSync,
          data: { regionId: 'new-york' },
        },
        {
          createEventSyncService: () => ({ runSync }),
          runRetention: jest.fn(),
          now: () => 600,
        }
      );

      expect(runSync).toHaveBeenCalledWith('new-york');
    });

    it('routes retention cleanup without starting an event sync', async () => {
      const runSync = jest.fn();
      const runRetention = jest.fn().mockResolvedValue(undefined);

      await processEventSyncJob(
        {
          id: 'job-8',
          name: QueueContracts.eventSync.jobs.retentionCleanup,
          data: {},
        },
        {
          createEventSyncService: () => ({ runSync }),
          runRetention,
          now: () => 700,
        }
      );

      expect(runRetention).toHaveBeenCalledTimes(1);
      expect(runSync).not.toHaveBeenCalled();
    });

    it('does not execute a handler for an unknown job name', async () => {
      const runSync = jest.fn();
      const runRetention = jest.fn();

      await processEventSyncJob(
        { id: 'job-9', name: 'unexpected-job', data: {} },
        {
          createEventSyncService: () => ({ runSync }),
          runRetention,
          now: () => 800,
        }
      );

      expect(runSync).not.toHaveBeenCalled();
      expect(runRetention).not.toHaveBeenCalled();
    });

    it('rejects a sync failure so BullMQ can retry it', async () => {
      const failure = new Error('provider timeout');

      await expect(
        processEventSyncJob(
          {
            id: 'job-10',
            name: QueueContracts.eventSync.jobs.regionSync,
            data: { regionId: 'boston' },
          },
          {
            createEventSyncService: () => ({
              runSync: jest.fn().mockRejectedValue(failure),
            }),
            runRetention: jest.fn(),
            now: () => 900,
          }
        )
      ).rejects.toBe(failure);
    });
  });
});
