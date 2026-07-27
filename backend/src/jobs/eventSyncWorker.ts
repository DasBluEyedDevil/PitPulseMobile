/**
 * BullMQ Worker for Event Sync Jobs
 *
 * Processes jobs from the 'event-sync' queue by calling EventSyncService.
 * Handles three job types:
 *   - 'scheduled-sync': Regular 4-hour sync of all regions
 *   - 'check-cancellations': Daily cancellation/rescheduling check
 *   - 'region-sync': On-demand sync of a single region
 *
 * Concurrency is set to 1 to simplify rate limiting against the
 * Ticketmaster API (TicketmasterAdapter handles per-second limits).
 *
 * Graceful degradation: Returns null worker if REDIS_URL is not set.
 */

import { Worker, Job } from 'bullmq';
import { createBullMQConnection, getRedisUrl } from '../config/redis';
import { EventSyncService } from '../services/EventSyncService';
import { runRetentionJob } from '../scripts/retentionJob';
import { captureException } from '../utils/sentry';
import logger from '../utils/logger';
import { QueueContracts } from './queueContracts';

type EventSyncJob = Pick<Job, 'id' | 'name' | 'data'>;

export type EventSyncProcessorDependencies = {
  createEventSyncService: () => Pick<EventSyncService, 'runSync'>;
  runRetention: () => Promise<unknown>;
  now: () => number;
};

const defaultEventSyncDependencies: EventSyncProcessorDependencies = {
  createEventSyncService: () => new EventSyncService(),
  runRetention: runRetentionJob,
  now: Date.now,
};

/**
 * Process one event-sync job without constructing a Redis-backed Worker.
 */
export async function processEventSyncJob(
  job: EventSyncJob,
  dependencies: EventSyncProcessorDependencies = defaultEventSyncDependencies
): Promise<void> {
  const startTime = dependencies.now();
  logger.info(`Processing job: ${job.name}`, { jobId: job.id });

  const syncService = dependencies.createEventSyncService();
  if (
    job.name === QueueContracts.eventSync.jobs.scheduledSync ||
    job.name === QueueContracts.eventSync.jobs.checkCancellations
  ) {
    await syncService.runSync();
  } else if (job.name === QueueContracts.eventSync.jobs.regionSync) {
    await syncService.runSync(job.data?.regionId);
  } else if (job.name === QueueContracts.eventSync.jobs.retentionCleanup) {
    await dependencies.runRetention();
  } else {
    logger.warn(`Unknown job name: ${job.name}`, { jobId: job.id });
  }

  const duration = dependencies.now() - startTime;
  logger.info(`Job completed: ${job.name}`, { jobId: job.id, durationMs: duration });
}

/**
 * Start the BullMQ worker for event sync jobs.
 *
 * Returns the Worker instance for graceful shutdown, or null
 * if Redis is not available.
 */
export function startEventSyncWorker(): Worker | null {
  try {
    getRedisUrl();
  } catch {
    logger.warn('REDIS_URL not configured. Event sync worker is disabled.');
    return null;
  }

  const worker = new Worker(QueueContracts.eventSync.queueName, (job) => processEventSyncJob(job), {
    connection: createBullMQConnection(),
    concurrency: 1,
    lockDuration: 300000, // 5 min — long-running sync against Ticketmaster API
  });

  // Event listeners for monitoring
  worker.on('completed', (job: Job) => {
    logger.info(`Job completed successfully: ${job.name}`, { jobId: job.id });
  });

  worker.on('failed', (job: Job | undefined, err: Error) => {
    logger.error(`Job failed: ${job?.name || 'unknown'}`, {
      jobId: job?.id,
      error: err.message,
      attemptsMade: job?.attemptsMade,
    });
    captureException(err, { queue: 'event-sync', jobId: job?.id, jobName: job?.name });
  });

  worker.on('error', (err: Error) => {
    logger.error('Worker error', { error: err.message });
  });

  logger.info('Event sync worker started (concurrency: 1)');

  return worker;
}

/**
 * Stop the BullMQ worker gracefully.
 *
 * Waits for the current job to complete before closing.
 */
export async function stopEventSyncWorker(worker: Worker): Promise<void> {
  try {
    await worker.close();
    logger.info('Event sync worker stopped gracefully');
  } catch (err) {
    logger.error('Error stopping event sync worker', {
      error: (err as Error).message,
    });
  }
}
