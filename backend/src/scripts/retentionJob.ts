import { DataRetentionService } from '../services/DataRetentionService';
import Database from '../config/database';
import * as dotenv from 'dotenv';
import logger from '../utils/logger';
import { cleanupExpiredTokens } from '../utils/auth';

// Load environment variables
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

/**
 * Data retention job for scheduled cleanup of user data.
 *
 * This script should be run as a cron job (e.g., daily) to:
 * 1. Process pending account deletions (30-day grace period)
 * 2. Clean up old consent records (2+ years)
 * 3. Clean up old notifications (90+ days)
 * 4. Clean up expired refresh tokens (7+ days past expiration)
 */
/**
 * Run a single retention step, catching and logging any error so subsequent
 * steps still run. Returns true on success, false on failure.
 */
async function runStep(name: string, fn: () => Promise<void>): Promise<boolean> {
  try {
    await fn();
    return true;
  } catch (error) {
    logger.error(`Retention step "${name}" failed`, {
      step: name,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return false;
  }
}

async function runRetentionJob(): Promise<void> {
  logger.info('Starting data retention job...');

  const db = Database.getInstance();
  const retentionService = new DataRetentionService();
  const failures: string[] = [];

  const track = async (name: string, fn: () => Promise<void>): Promise<void> => {
    const ok = await runStep(name, fn);
    if (!ok) failures.push(name);
  };

  await track('pending-account-deletions', async () => {
    logger.info('Processing pending account deletions...');
    const deletionResult = await retentionService.processPendingDeletions();
    logger.info('Account deletions processed', {
      processed: deletionResult.processed,
      succeeded: deletionResult.succeeded,
      failed: deletionResult.failed,
    });
    if (deletionResult.errors.length > 0) {
      deletionResult.errors.forEach((err) => {
        logger.error(`Account deletion error for user ${err.userId}`, {
          userId: err.userId,
          error: err.error,
        });
      });
    }
  });

  await track('consent-records', async () => {
    logger.info('Cleaning up old consent records...');
    const consentResult = await db.query(
      `DELETE FROM user_consents
       WHERE recorded_at < NOW() - INTERVAL '2 years'
       RETURNING id`
    );
    logger.info(`Cleaned up ${consentResult.rowCount || 0} old consent records`);
  });

  await track('notifications', async () => {
    logger.info('Cleaning up old notifications...');
    const notifResult = await db.query(
      `DELETE FROM notifications
       WHERE created_at < NOW() - INTERVAL '90 days'
       RETURNING id`
    );
    logger.info(`Cleaned up ${notifResult.rowCount || 0} old notifications`);
  });

  await track('refresh-tokens', async () => {
    logger.info('Cleaning up expired refresh tokens...');
    const tokenDeleted = await cleanupExpiredTokens();
    logger.info(`Removed ${tokenDeleted} stale refresh_tokens rows`);
  });

  await track('audit-logs', async () => {
    const auditPurge = await db.query(
      `DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '90 days' RETURNING id`
    );
    logger.info(`Purged ${auditPurge?.rowCount ?? 0} old audit_logs rows`);
  });

  await track('webhook-events', async () => {
    const webhookPurge = await db.query(
      `DELETE FROM processed_webhook_events
       WHERE processed_at < NOW() - INTERVAL '90 days'
       RETURNING event_id`
    );
    logger.info(`Purged ${webhookPurge?.rowCount ?? 0} old processed_webhook_events rows`);
  });

  await track('password-reset-tokens', async () => {
    const pwdPurge = await db.query(
      `DELETE FROM password_reset_tokens
       WHERE expires_at < NOW() - INTERVAL '7 days'
       RETURNING id`
    );
    logger.info(`Purged ${pwdPurge?.rowCount ?? 0} expired password_reset_tokens rows`);
  });

  if (failures.length > 0) {
    const summary = `Data retention job completed with ${failures.length} failed step(s): ${failures.join(', ')}`;
    logger.error(summary, { failedSteps: failures });
    throw new Error(summary);
  }

  logger.info('Data retention job completed successfully');
}

// Run if called directly
if (require.main === module) {
  runRetentionJob()
    .then(() => process.exit(0))
    .catch((error) => {
      logger.error('Retention job fatal error', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      process.exit(1);
    });
}

export { runRetentionJob };
