import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * H-DB-11: Index FK columns on notifications for join/delete performance.
 */

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_notifications_from_user_id ON notifications(from_user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_checkin_id ON notifications(checkin_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_badge_id ON notifications(badge_id);
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_notifications_from_user_id;
    DROP INDEX IF EXISTS idx_notifications_checkin_id;
    DROP INDEX IF EXISTS idx_notifications_badge_id;
  `);
}
