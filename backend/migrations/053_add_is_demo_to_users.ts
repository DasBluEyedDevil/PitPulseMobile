import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * B-DB-8: Demo user flag belongs in the migration chain, not seed scripts.
 */

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumn('users', 'is_demo', { ifExists: true });
}
