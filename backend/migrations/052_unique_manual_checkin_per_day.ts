import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * B-DB-5: Prevent duplicate manual check-ins (same user, band, venue, calendar day).
 */

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_checkins_manual_user_band_venue_day
    ON checkins (user_id, band_id, venue_id, ((created_at AT TIME ZONE 'UTC')::date))
    WHERE event_id IS NULL;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`DROP INDEX IF EXISTS idx_checkins_manual_user_band_venue_day;`);
}
