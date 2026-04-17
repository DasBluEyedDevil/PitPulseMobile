import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * H-DB-8: Self-healing cleanup if an older 049 left redundant DELETE-only trigger.
 */

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    DROP TRIGGER IF EXISTS trigger_update_stats_on_checkin_delete ON checkins;
    DROP FUNCTION IF EXISTS update_user_stats_on_checkin_delete();
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Intentionally empty: do not recreate redundant trigger.
}
