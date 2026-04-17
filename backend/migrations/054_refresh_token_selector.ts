import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * B-SEC-2: Split-token refresh flow — lookup by selector, verify bcrypt(verifier).
 * Legacy rows are cleared (clients re-authenticate).
 */

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`DELETE FROM refresh_tokens;`);

  pgm.sql(`
    ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS selector VARCHAR(32) NOT NULL DEFAULT '';
  `);

  pgm.sql(`
    ALTER TABLE refresh_tokens ALTER COLUMN token_hash TYPE VARCHAR(128);
  `);

  pgm.sql(`
    ALTER TABLE refresh_tokens ALTER COLUMN selector DROP DEFAULT;
  `);

  pgm.sql(`
    DROP INDEX IF EXISTS idx_refresh_tokens_hash;
  `);

  pgm.sql(`
    ALTER TABLE refresh_tokens DROP CONSTRAINT IF EXISTS refresh_tokens_token_hash_key;
  `);

  pgm.sql(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_refresh_tokens_selector
    ON refresh_tokens(selector) WHERE selector <> '';
  `);

  pgm.sql(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`DELETE FROM refresh_tokens;`);
  pgm.sql(`DROP INDEX IF EXISTS idx_refresh_tokens_selector;`);
  pgm.sql(`DROP INDEX IF EXISTS idx_refresh_tokens_token_hash;`);
  pgm.sql(`
    ALTER TABLE refresh_tokens DROP COLUMN IF EXISTS selector;
  `);
  pgm.sql(`
    ALTER TABLE refresh_tokens ALTER COLUMN token_hash TYPE VARCHAR(64);
  `);
  pgm.sql(`
    ALTER TABLE refresh_tokens ADD CONSTRAINT refresh_tokens_token_hash_key UNIQUE (token_hash);
  `);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);`);
}
