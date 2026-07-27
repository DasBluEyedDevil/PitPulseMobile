import type { MigrationBuilder } from 'node-pg-migrate';

import { createBaseTables } from '../migration-support/createBaseTables';

/**
 * Migration 044 remains in the ordered production history. The same
 * idempotent builder now runs before migration 001 through the separate
 * bootstrap ledger, so this historical migration safely delegates to it.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  await createBaseTables(pgm);
}

/**
 * Base tables are owned by the bootstrap baseline. Removing them from the
 * legacy chain would invalidate pgmigrations_bootstrap and make re-upgrade
 * impossible, so rollback intentionally preserves the baseline schema.
 */
export async function down(_pgm: MigrationBuilder): Promise<void> {
  // Intentional no-op.
}
