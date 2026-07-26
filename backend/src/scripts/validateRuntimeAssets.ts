import { runtimeAssetPaths, validateRuntimeAssets } from '../runtimeAssets';
import logger from '../utils/logger';

export function main(): void {
  const paths = runtimeAssetPaths();
  validateRuntimeAssets(paths);
  logger.info('Runtime assets validated', paths);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    logger.error('Runtime asset validation failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exitCode = 1;
  }
}
