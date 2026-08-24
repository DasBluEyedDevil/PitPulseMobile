import express from 'express';
import request from 'supertest';
import { SubscriptionController } from '../../controllers/SubscriptionController';
import logger from '../../utils/logger';

jest.mock('../../utils/logger', () => {
  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockLogger,
    logError: jest.fn(),
    logWarn: jest.fn(),
    logInfo: jest.fn(),
    logHttp: jest.fn(),
    logDebug: jest.fn(),
  };
});

const mockLogger = logger as unknown as { info: jest.Mock; warn: jest.Mock; error: jest.Mock };

describe('SubscriptionController RevenueCat webhook contract', () => {
  const subscriptionService = {
    processWebhookEvent: jest.fn(),
    getSubscriptionStatus: jest.fn(),
  };
  const originalWebhookAuth = process.env.REVENUECAT_WEBHOOK_AUTH;

  const createApp = () => {
    const controller = new SubscriptionController({ subscriptionService });
    const app = express();
    app.use(express.json());
    app.post('/webhook', controller.handleWebhook);
    app.use(
      (error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
        res.status(500).json({ error: error.message });
      }
    );
    return app;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.REVENUECAT_WEBHOOK_AUTH = 'revenuecat-test-secret';
  });

  afterAll(() => {
    if (originalWebhookAuth === undefined) {
      delete process.env.REVENUECAT_WEBHOOK_AUTH;
    } else {
      process.env.REVENUECAT_WEBHOOK_AUTH = originalWebhookAuth;
    }
  });

  it('returns 503 config_missing without processing when webhook authentication is not configured', async () => {
    delete process.env.REVENUECAT_WEBHOOK_AUTH;

    const response = await request(createApp())
      .post('/webhook')
      .send({
        event: { id: 'event-1', type: 'INITIAL_PURCHASE' },
      });

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      success: false,
      error: { code: 'SERVICE_UNAVAILABLE', message: 'config_missing' },
    });
    expect(subscriptionService.processWebhookEvent).not.toHaveBeenCalled();
    expect(mockLogger.error).toHaveBeenCalledWith(
      'SubscriptionController: REVENUECAT_WEBHOOK_AUTH not configured',
      expect.objectContaining({ metric: 'webhook.config_missing' })
    );
  });

  it('acknowledges an invalid authorization token without processing', async () => {
    const response = await request(createApp())
      .post('/webhook')
      .set('Authorization', 'Bearer revenuecat-wrong-token')
      .send({ event: { id: 'event-2', type: 'INITIAL_PURCHASE' } });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Unauthorized' });
    expect(subscriptionService.processWebhookEvent).not.toHaveBeenCalled();
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'SubscriptionController: Invalid webhook authorization',
      expect.objectContaining({ metric: 'webhook.auth_rejected' })
    );
  });

  it('acknowledges malformed payloads without processing or triggering retries', async () => {
    const response = await request(createApp())
      .post('/webhook')
      .set('Authorization', 'Bearer revenuecat-test-secret')
      .send({ event: { id: 'event-3' } });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Invalid payload, skipping' });
    expect(subscriptionService.processWebhookEvent).not.toHaveBeenCalled();
  });

  it('maps a valid RevenueCat envelope and returns the canonical response', async () => {
    subscriptionService.processWebhookEvent.mockResolvedValue({
      processed: true,
      reason: 'OK',
    });

    const response = await request(createApp())
      .post('/webhook')
      .set('Authorization', 'Bearer revenuecat-test-secret')
      .send({
        event: {
          id: 'event-4',
          type: 'RENEWAL',
          app_user_id: 'user-4',
          entitlement_id: 'pro',
          environment: 'PRODUCTION',
          expiration_at_ms: 1_800_000_000_000,
        },
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: { message: 'OK' },
    });
    expect(subscriptionService.processWebhookEvent).toHaveBeenCalledWith({
      id: 'event-4',
      type: 'RENEWAL',
      app_user_id: 'user-4',
      entitlement_ids: ['pro'],
      environment: 'PRODUCTION',
      expiration_at_ms: 1_800_000_000_000,
    });
  });

  it('surfaces processing failures so provider retries remain available', async () => {
    subscriptionService.processWebhookEvent.mockRejectedValue(new Error('database timeout'));

    const response = await request(createApp())
      .post('/webhook')
      .set('Authorization', 'Bearer revenuecat-test-secret')
      .send({
        event: {
          id: 'event-5',
          type: 'INITIAL_PURCHASE',
          app_user_id: 'user-5',
          entitlement_ids: ['pro'],
        },
      });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'database timeout' });
  });

  it('returns 503 config_missing when the service reports missing environment config', async () => {
    subscriptionService.processWebhookEvent.mockResolvedValue({
      processed: false,
      reason: 'config_missing',
    });

    const response = await request(createApp())
      .post('/webhook')
      .set('Authorization', 'Bearer revenuecat-test-secret')
      .send({
        event: {
          id: 'event-6',
          type: 'INITIAL_PURCHASE',
          app_user_id: 'user-6',
          entitlement_ids: ['pro'],
          environment: 'PRODUCTION',
        },
      });

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      success: false,
      error: { code: 'SERVICE_UNAVAILABLE', message: 'config_missing' },
    });
    expect(subscriptionService.processWebhookEvent).toHaveBeenCalled();
  });

  it('returns 503 user_not_found without treating the event as processed', async () => {
    subscriptionService.processWebhookEvent.mockResolvedValue({
      processed: false,
      reason: 'user_not_found',
    });

    const response = await request(createApp())
      .post('/webhook')
      .set('Authorization', 'Bearer revenuecat-test-secret')
      .send({
        event: {
          id: 'event-7',
          type: 'INITIAL_PURCHASE',
          app_user_id: 'user-7',
          entitlement_ids: ['pro'],
          environment: 'PRODUCTION',
        },
      });

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      success: false,
      error: { code: 'SERVICE_UNAVAILABLE', message: 'user_not_found' },
    });
  });

  it('acknowledges sandbox-vs-prod mismatch as 200 so provider retries do not loop', async () => {
    subscriptionService.processWebhookEvent.mockResolvedValue({
      processed: true,
      reason: 'ignored_unexpected_environment',
    });

    const response = await request(createApp())
      .post('/webhook')
      .set('Authorization', 'Bearer revenuecat-test-secret')
      .send({
        event: {
          id: 'event-8',
          type: 'INITIAL_PURCHASE',
          app_user_id: 'user-8',
          entitlement_ids: ['pro'],
          environment: 'SANDBOX',
        },
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: { message: 'ignored_unexpected_environment' },
    });
  });

  it('does not 503 already-processed events that are also unprocessed=false', async () => {
    subscriptionService.processWebhookEvent.mockResolvedValue({
      processed: false,
      reason: 'Already processed',
    });

    const response = await request(createApp())
      .post('/webhook')
      .set('Authorization', 'Bearer revenuecat-test-secret')
      .send({
        event: {
          id: 'event-9',
          type: 'INITIAL_PURCHASE',
          app_user_id: 'user-9',
          entitlement_ids: ['pro'],
          environment: 'PRODUCTION',
        },
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: { message: 'Already processed' },
    });
  });
});
