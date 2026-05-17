import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import Database from '../../config/database';
import { PushNotificationService } from '../../services/PushNotificationService';

jest.mock('../../config/database');

const mockDb = {
  query: jest.fn<(...args: any[]) => Promise<any>>(),
};

(Database.getInstance as jest.Mock).mockReturnValue(mockDb);

describe('PushNotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.query.mockResolvedValue({ rows: [] });
  });

  it('registers device tokens by transferring token ownership', async () => {
    const service = new PushNotificationService();

    await service.registerDeviceToken('user-2', 'fcm-token', 'ios');

    expect(mockDb.query).toHaveBeenCalledWith(expect.stringContaining('ON CONFLICT (token)'), [
      'user-2',
      'fcm-token',
      'ios',
    ]);
    expect(mockDb.query.mock.calls[0][0]).toContain('user_id = EXCLUDED.user_id');
  });

  it('removes only the current user token on logout', async () => {
    const service = new PushNotificationService();

    await service.removeDeviceToken('user-1', 'fcm-token');

    expect(mockDb.query).toHaveBeenCalledWith(
      'DELETE FROM device_tokens WHERE user_id = $1 AND token = $2',
      ['user-1', 'fcm-token']
    );
  });
});
