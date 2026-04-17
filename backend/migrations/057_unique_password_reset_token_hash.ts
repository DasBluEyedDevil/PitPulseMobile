import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * H-DB-3: token_hash must be unique for password reset tokens.
 */

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_password_reset_tokens_hash;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_password_reset_tokens_hash
    ON password_reset_tokens(token_hash);
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_password_reset_tokens_hash;
    CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_hash
    ON password_reset_tokens(token_hash);
  `);
}
