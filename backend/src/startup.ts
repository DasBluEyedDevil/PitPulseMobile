import type { Worker } from 'bullmq';

export type DatabaseHealthResult = {
  healthy: boolean;
  error?: string;
};

type RuntimeDependencies = {
  initWebSocket: () => void;
  listen: () => void;
  startEventSyncWorker: () => Worker | null;
  startBadgeEvalWorker: () => Worker | null;
  startNotificationWorker: () => Worker | null;
  startModerationWorker: () => Worker | null;
  registerSyncJobs: () => void;
};

type RuntimeWorkers = {
  sync: Worker | null;
  badge: Worker | null;
  notification: Worker | null;
  moderation: Worker | null;
};

export type RuntimeStartResult =
  | { started: false; error?: string }
  | { started: true; workers: RuntimeWorkers };

export function startRuntime(
  healthResult: DatabaseHealthResult,
  dependencies: RuntimeDependencies
): RuntimeStartResult {
  if (!healthResult.healthy) {
    return { started: false, error: healthResult.error };
  }

  dependencies.initWebSocket();
  dependencies.listen();

  const workers: RuntimeWorkers = {
    sync: dependencies.startEventSyncWorker(),
    badge: dependencies.startBadgeEvalWorker(),
    notification: dependencies.startNotificationWorker(),
    moderation: dependencies.startModerationWorker(),
  };
  dependencies.registerSyncJobs();

  return { started: true, workers };
}
