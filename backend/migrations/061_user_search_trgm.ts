import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * H-DB-14: Trigram index for ILIKE user search (with query change in ProfileService).
 */

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS users_trgm_username
    ON users USING gin (LOWER(username) gin_trgm_ops);
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`DROP INDEX IF EXISTS users_trgm_username;`);
}
