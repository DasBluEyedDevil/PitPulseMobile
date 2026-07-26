import { describe, expect, it, jest } from '@jest/globals';

import { startRuntime } from '../startup';

describe('startRuntime', () => {
  it('does not initialize listeners, realtime, workers, or schedules when PostgreSQL is unhealthy', () => {
    const dependencies = {
      initWebSocket: jest.fn(),
      listen: jest.fn(),
      startEventSyncWorker: jest.fn<() => any>().mockReturnValue(null),
      startBadgeEvalWorker: jest.fn<() => any>().mockReturnValue(null),
      startNotificationWorker: jest.fn<() => any>().mockReturnValue(null),
      startModerationWorker: jest.fn<() => any>().mockReturnValue(null),
      registerSyncJobs: jest.fn(),
    };

    const result = startRuntime(
      { healthy: false, error: 'connect ECONNREFUSED 127.0.0.1:1' },
      dependencies
    );

    expect(result).toEqual({
      started: false,
      error: 'connect ECONNREFUSED 127.0.0.1:1',
    });
    expect(
      Object.values(dependencies).every((dependency) => dependency.mock.calls.length === 0)
    ).toBe(true);
  });

  it('starts each runtime subsystem only after a healthy PostgreSQL result', () => {
    const workers = {
      sync: { name: 'sync' },
      badge: { name: 'badge' },
      notification: { name: 'notification' },
      moderation: { name: 'moderation' },
    };
    const dependencies = {
      initWebSocket: jest.fn(),
      listen: jest.fn(),
      startEventSyncWorker: jest.fn<() => any>().mockReturnValue(workers.sync),
      startBadgeEvalWorker: jest.fn<() => any>().mockReturnValue(workers.badge),
      startNotificationWorker: jest.fn<() => any>().mockReturnValue(workers.notification),
      startModerationWorker: jest.fn<() => any>().mockReturnValue(workers.moderation),
      registerSyncJobs: jest.fn(),
    };

    const result = startRuntime({ healthy: true }, dependencies);

    expect(result).toEqual({ started: true, workers });
    expect(dependencies.initWebSocket).toHaveBeenCalledTimes(1);
    expect(dependencies.listen).toHaveBeenCalledTimes(1);
    expect(dependencies.registerSyncJobs).toHaveBeenCalledTimes(1);
  });
});
