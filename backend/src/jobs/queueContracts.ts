/**
 * Shared BullMQ queue and job names.
 *
 * Producers, schedulers, and workers must all import these values instead of
 * duplicating string literals. This keeps an otherwise runtime-only contract
 * visible to TypeScript and to the Phase 33 async-contract verifier.
 */
export const QueueContracts = {
  badgeEvaluation: {
    queueName: 'badge-eval',
    jobs: {
      evaluate: 'evaluate',
    },
  },
  eventSync: {
    queueName: 'event-sync',
    jobs: {
      scheduledSync: 'scheduled-sync',
      checkCancellations: 'check-cancellations',
      regionSync: 'region-sync',
      retentionCleanup: 'retention-cleanup',
    },
  },
  imageModeration: {
    queueName: 'image-moderation',
    jobs: {
      scanImage: 'scan-image',
    },
  },
  notificationBatch: {
    queueName: 'notification-batch',
    jobs: {
      sendBatch: 'send-batch',
    },
  },
} as const;
