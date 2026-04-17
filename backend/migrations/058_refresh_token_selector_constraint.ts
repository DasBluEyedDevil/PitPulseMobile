import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * B-SEC-2 follow-up: tighten the contract on `refresh_tokens.selector`.
 *
 * Migration 054 added the split-token selector/verifier columns but kept the
 * column permissive (VARCHAR(32) NOT NULL without a length CHECK) to avoid
 * blocking the rollout. Now that the selector generator
 * (`generateRefreshToken` in `src/utils/auth.ts`) consistently emits a
 * 32-character hex string, we can enforce that shape at the DB layer so a
 * bug in application code cannot write a truncated or malformed selector
 * that would then collide with another row.
 */

const CHECK_NAME = 'refresh_tokens_selector_format_check';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Clear any legacy rows that pre-date the split-token format. They cannot
  // be verified anyway (the old SHA-256 hashes are incompatible with the new
  // bcrypt verifier), so clients will just re-authenticate.
  pgm.sql(`DELETE FROM refresh_tokens WHERE selector !~ '^[0-9a-f]{32}$';`);

  pgm.sql(`
    ALTER TABLE refresh_tokens
      ADD CONSTRAINT ${CHECK_NAME}
      CHECK (selector ~ '^[0-9a-f]{32}$');
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`ALTER TABLE refresh_tokens DROP CONSTRAINT IF EXISTS ${CHECK_NAME};`);
}
