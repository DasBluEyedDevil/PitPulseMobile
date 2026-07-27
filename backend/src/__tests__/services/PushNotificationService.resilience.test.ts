const mockQuery = jest.fn();
const mockSendEachForMulticast = jest.fn();
const mockInitializeApp = jest.fn();
const mockCert = jest.fn((value) => value);

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn(() => ({ query: mockQuery })),
  },
}));

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('firebase-admin', () => ({
  apps: [],
  initializeApp: mockInitializeApp,
  credential: {
    cert: mockCert,
  },
  messaging: jest.fn(() => ({
    sendEachForMulticast: mockSendEachForMulticast,
  })),
}));

describe('PushNotificationService FCM resilience', () => {
  const originalFirebaseConfig = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  let PushNotificationService: typeof import('../../services/PushNotificationService').PushNotificationService;

  beforeAll(async () => {
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON = JSON.stringify({
      project_id: 'soundcheck-test',
      client_email: 'firebase@example.com',
      private_key: 'test-private-key',
    });
    await jest.isolateModulesAsync(async () => {
      ({ PushNotificationService } = await import('../../services/PushNotificationService'));
    });
  });

  afterAll(() => {
    if (originalFirebaseConfig === undefined) {
      delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    } else {
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON = originalFirebaseConfig;
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends one multicast payload and removes only stale tokens owned by that user', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ token: 'valid-token' }, { token: 'stale-token' }, { token: 'retry-token' }],
      })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 });
    mockSendEachForMulticast.mockResolvedValue({
      failureCount: 2,
      responses: [
        { success: true },
        {
          success: false,
          error: { code: 'messaging/registration-token-not-registered' },
        },
        {
          success: false,
          error: { code: 'messaging/internal-error' },
        },
      ],
    });

    await new PushNotificationService().sendToUser('user-1', {
      title: 'New toast',
      body: 'Alice toasted your check-in',
      data: { type: 'new_toast', checkinId: 'checkin-1' },
    });

    expect(mockSendEachForMulticast).toHaveBeenCalledWith({
      notification: {
        title: 'New toast',
        body: 'Alice toasted your check-in',
      },
      data: { type: 'new_toast', checkinId: 'checkin-1' },
      tokens: ['valid-token', 'stale-token', 'retry-token'],
    });
    expect(mockQuery).toHaveBeenNthCalledWith(
      2,
      'DELETE FROM device_tokens WHERE user_id = $1 AND token = ANY($2)',
      ['user-1', ['stale-token']]
    );
  });

  it('does not contact FCM when the user has no registered devices', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    await new PushNotificationService().sendToUser('user-1', {
      title: 'Badge earned',
      body: 'You earned Night Owl',
    });

    expect(mockSendEachForMulticast).not.toHaveBeenCalled();
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it('contains transient FCM failures so the originating mobile action still succeeds', async () => {
    mockQuery.mockResolvedValue({ rows: [{ token: 'device-token' }] });
    mockSendEachForMulticast.mockRejectedValue(new Error('FCM unavailable'));

    await expect(
      new PushNotificationService().sendToUser('user-1', {
        title: 'New comment',
        body: 'Alice commented on your check-in',
      })
    ).resolves.toBeUndefined();
  });

  it('returns no tokens when PostgreSQL is unavailable', async () => {
    mockQuery.mockRejectedValue(new Error('database unavailable'));

    await expect(new PushNotificationService().getDeviceTokens('user-1')).resolves.toEqual([]);
  });

  it('propagates token registration failures for retry by the authenticated session bootstrap', async () => {
    mockQuery.mockRejectedValue(new Error('database unavailable'));

    await expect(
      new PushNotificationService().registerDeviceToken('user-1', 'device-token', 'android')
    ).rejects.toThrow('database unavailable');
  });

  it('contains token-removal failures during logout and stale-token cleanup', async () => {
    mockQuery.mockRejectedValue(new Error('database unavailable'));
    const service = new PushNotificationService();

    await expect(service.removeDeviceToken('user-1', 'device-token')).resolves.toBeUndefined();
    await expect(service.removeDeviceTokens('user-1', ['device-token'])).resolves.toBeUndefined();
  });
});
