import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * Phase 2 push lifecycle: one FCM token belongs to one current user.
 */

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    DELETE FROM device_tokens dt
    USING device_tokens newer
    WHERE dt.token = newer.token
      AND (
        newer.updated_at > dt.updated_at
        OR (newer.updated_at = dt.updated_at AND newer.created_at > dt.created_at)
        OR (newer.updated_at = dt.updated_at AND newer.created_at = dt.created_at AND newer.id > dt.id)
      );

    ALTER TABLE device_tokens DROP CONSTRAINT IF EXISTS unique_user_token;
    ALTER TABLE device_tokens ADD CONSTRAINT unique_device_token UNIQUE (token);
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE device_tokens DROP CONSTRAINT IF EXISTS unique_device_token;

    DELETE FROM device_tokens dt
    USING device_tokens newer
    WHERE dt.user_id = newer.user_id
      AND dt.token = newer.token
      AND (
        newer.updated_at > dt.updated_at
        OR (newer.updated_at = dt.updated_at AND newer.created_at > dt.created_at)
        OR (newer.updated_at = dt.updated_at AND newer.created_at = dt.created_at AND newer.id > dt.id)
      );

    ALTER TABLE device_tokens ADD CONSTRAINT unique_user_token UNIQUE (user_id, token);
  `);
}
