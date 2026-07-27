import path from 'path';

import { Client, ClientBase } from 'pg';
import type { RunnerOption } from 'node-pg-migrate';

import { getSSLConfig } from '../config/database';
import logger from '../utils/logger';

export const MIGRATION_LOCK_ID = 841003001;

type MigrationRunner = (options: RunnerOption) => Promise<unknown>;

export type DeployMigrationOptions = {
  client: ClientBase;
  bootstrapDir?: string;
  migrationsDir?: string;
  runMigrations?: MigrationRunner;
};

export async function deployMigrations({
  client,
  bootstrapDir = path.resolve(__dirname, '../bootstrap-migrations'),
  migrationsDir = path.resolve(__dirname, '../migrations'),
  runMigrations,
}: DeployMigrationOptions): Promise<void> {
  const migrationRunner = runMigrations ?? (await import('node-pg-migrate')).runner;
  await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_ID]);

  try {
    await migrationRunner({
      dbClient: client,
      dir: bootstrapDir,
      direction: 'up',
      migrationsTable: 'pgmigrations_bootstrap',
      noLock: true,
    });
    await migrationRunner({
      dbClient: client,
      dir: migrationsDir,
      direction: 'up',
      migrationsTable: 'pgmigrations',
      noLock: true,
    });
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_ID]);
  }
}

function databaseConnectionString(): string {
  const configured = process.env.DATABASE_URL;
  if (!configured) {
    throw new Error('DATABASE_URL is required for migrate:deploy');
  }

  const url = new URL(configured);
  url.searchParams.delete('sslmode');
  return url.toString();
}

export async function main(): Promise<void> {
  const client = new Client({
    connectionString: databaseConnectionString(),
    ssl: getSSLConfig(),
  });

  try {
    await client.connect();
    await deployMigrations({ client });
    logger.info('Bootstrap and ordered migrations completed');
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  main().catch((error) => {
    logger.error('Migration deployment failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exitCode = 1;
  });
}
