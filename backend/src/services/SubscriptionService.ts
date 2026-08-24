import Database from '../config/database';
import logger from '../utils/logger';

interface WebhookEvent {
  id: string;
  type: string;
  app_user_id: string;
  entitlement_ids?: string[];
  environment?: string;
  expiration_at_ms?: number | null;
}

export const WEBHOOK_REASON = {
  CONFIG_MISSING: 'config_missing',
  IGNORED_UNEXPECTED_ENVIRONMENT: 'ignored_unexpected_environment',
  USER_NOT_FOUND: 'user_not_found',
} as const;

export class SubscriptionService {
  private db = Database.getInstance();
  private premiumEntitlementId = process.env.REVENUECAT_ENTITLEMENT_ID || 'pro';

  /**
   * Process a RevenueCat webhook event idempotently.
   * Returns whether the event was processed and the reason.
   */
  async processWebhookEvent(event: WebhookEvent): Promise<{ processed: boolean; reason: string }> {
    // 1. Idempotency check: skip already-processed events
    const existing = await this.db.query(
      'SELECT event_id FROM processed_webhook_events WHERE event_id = $1',
      [event.id]
    );
    if (existing.rows.length > 0) {
      return { processed: false, reason: 'Already processed' };
    }

    // Missing env is not a sandbox/prod mismatch — do not mark processed (HTTP 503).
    const expectedEnvironment = process.env.REVENUECAT_WEBHOOK_ENVIRONMENT;
    if (!expectedEnvironment) {
      logger.error('SubscriptionService: REVENUECAT_WEBHOOK_ENVIRONMENT not configured', {
        metric: 'webhook.config_missing',
        eventId: event.id,
        eventType: event.type,
      });
      return { processed: false, reason: WEBHOOK_REASON.CONFIG_MISSING };
    }

    if (event.type === 'TEST') {
      logger.info(`SubscriptionService: Received TEST event ${event.id}`);
      await this.markEventProcessed(event);
      return { processed: true, reason: 'OK' };
    }

    if (!this.targetsPremiumEntitlement(event)) {
      logger.warn('SubscriptionService: Ignoring RevenueCat event for non-premium entitlement', {
        eventId: event.id,
        eventType: event.type,
        entitlementIds: event.entitlement_ids,
      });
      await this.markEventProcessed(event);
      return { processed: true, reason: 'Ignored non-premium entitlement' };
    }

    if (!this.matchesExpectedEnvironment(event, expectedEnvironment)) {
      logger.warn('SubscriptionService: Ignoring RevenueCat event for unexpected environment', {
        metric: 'webhook.ignored_unexpected_environment',
        eventId: event.id,
        eventType: event.type,
        environment: event.environment,
        expectedEnvironment,
      });
      await this.markEventProcessed(event);
      return { processed: true, reason: WEBHOOK_REASON.IGNORED_UNEXPECTED_ENVIRONMENT };
    }

    // 2. Resolve user by app_user_id (set via Purchases.logIn(userId) on mobile)
    const userResult = await this.db.query('SELECT id FROM users WHERE id = $1', [
      event.app_user_id,
    ]);
    if (userResult.rows.length === 0) {
      logger.warn(`SubscriptionService: User not found for app_user_id=${event.app_user_id}`, {
        metric: 'webhook.user_not_found',
        eventId: event.id,
      });
      return { processed: false, reason: WEBHOOK_REASON.USER_NOT_FOUND };
    }

    // 3. Process based on event type
    switch (event.type) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'UNCANCELLATION':
        if (!this.hasValidFutureExpiration(event)) {
          logger.warn(
            'SubscriptionService: Ignoring premium grant event without valid future expiration',
            {
              eventId: event.id,
              eventType: event.type,
              expirationAtMs: event.expiration_at_ms,
            }
          );
          break;
        }
        await this.setUserPremium(event.app_user_id, true);
        break;
      case 'EXPIRATION':
        if (!this.isExpired(event)) {
          logger.warn('SubscriptionService: Ignoring expiration event without elapsed expiration', {
            eventId: event.id,
            expirationAtMs: event.expiration_at_ms,
          });
          break;
        }
        await this.setUserPremium(event.app_user_id, false);
        break;
      case 'CANCELLATION':
        // User still has access until expiration_at_ms
        // Don't revoke immediately -- wait for EXPIRATION event
        break;
      default:
        // Unknown event type -- log but don't fail
        logger.warn(`SubscriptionService: Unknown event type: ${event.type}`);
    }

    // 4. Mark event as processed (ON CONFLICT for race condition safety)
    await this.markEventProcessed(event);

    return { processed: true, reason: 'OK' };
  }

  private targetsPremiumEntitlement(event: WebhookEvent): boolean {
    if (!Array.isArray(event.entitlement_ids) || event.entitlement_ids.length === 0) {
      return false;
    }

    return event.entitlement_ids.includes(this.premiumEntitlementId);
  }

  private matchesExpectedEnvironment(event: WebhookEvent, expectedEnvironment: string): boolean {
    return event.environment === expectedEnvironment;
  }

  private hasValidFutureExpiration(event: WebhookEvent): boolean {
    return (
      typeof event.expiration_at_ms === 'number' &&
      Number.isFinite(event.expiration_at_ms) &&
      event.expiration_at_ms > Date.now()
    );
  }

  private isExpired(event: WebhookEvent): boolean {
    return (
      typeof event.expiration_at_ms === 'number' &&
      Number.isFinite(event.expiration_at_ms) &&
      event.expiration_at_ms <= Date.now()
    );
  }

  private async markEventProcessed(event: WebhookEvent): Promise<void> {
    await this.db.query(
      `INSERT INTO processed_webhook_events (event_id, event_type, app_user_id)
       VALUES ($1, $2, $3) ON CONFLICT (event_id) DO NOTHING`,
      [event.id, event.type, event.app_user_id]
    );
  }

  /**
   * Set a user's premium status.
   */
  async setUserPremium(userId: string, isPremium: boolean): Promise<void> {
    await this.db.query('UPDATE users SET is_premium = $2 WHERE id = $1', [userId, isPremium]);
  }

  /**
   * Get a user's current subscription status.
   */
  async getSubscriptionStatus(userId: string): Promise<{ isPremium: boolean }> {
    const result = await this.db.query('SELECT is_premium FROM users WHERE id = $1', [userId]);
    return { isPremium: result.rows[0]?.is_premium ?? false };
  }
}
