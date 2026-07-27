import { describe, expect, it, jest } from '@jest/globals';

import { deployMigrations } from '../../scripts/migrateDeploy';

describe('deployMigrations', () => {
  it('holds one advisory lock across bootstrap and ordered migrations', async () => {
    const client = {
      query: jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue({ rows: [] }),
    };
    const runMigrations = jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue([]);

    await deployMigrations({
      client: client as any,
      bootstrapDir: 'compiled/bootstrap-migrations',
      migrationsDir: 'compiled/migrations',
      runMigrations,
    });

    expect(client.query.mock.calls[0]).toEqual(['SELECT pg_advisory_lock($1)', [841003001]]);
    expect(runMigrations.mock.calls).toEqual([
      [
        expect.objectContaining({
          dbClient: client,
          dir: 'compiled/bootstrap-migrations',
          direction: 'up',
          migrationsTable: 'pgmigrations_bootstrap',
          noLock: true,
        }),
      ],
      [
        expect.objectContaining({
          dbClient: client,
          dir: 'compiled/migrations',
          direction: 'up',
          migrationsTable: 'pgmigrations',
          noLock: true,
        }),
      ],
    ]);
    expect(client.query.mock.calls[client.query.mock.calls.length - 1]).toEqual([
      'SELECT pg_advisory_unlock($1)',
      [841003001],
    ]);
  });

  it('releases the advisory lock when a migration fails', async () => {
    const client = {
      query: jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue({ rows: [] }),
    };
    const migrationFailure = new Error('interrupted migration');
    const runMigrations = jest
      .fn<(...args: any[]) => Promise<any>>()
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(migrationFailure);

    await expect(
      deployMigrations({
        client: client as any,
        bootstrapDir: 'compiled/bootstrap-migrations',
        migrationsDir: 'compiled/migrations',
        runMigrations,
      })
    ).rejects.toBe(migrationFailure);

    expect(client.query.mock.calls[client.query.mock.calls.length - 1]).toEqual([
      'SELECT pg_advisory_unlock($1)',
      [841003001],
    ]);
  });
});
