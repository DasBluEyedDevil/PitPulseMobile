import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * Preserve attendee check-ins when a catalog event is deleted.
 * checkins.event_id becomes ON DELETE RESTRICT (never SET NULL, never CASCADE).
 */

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE checkins DROP CONSTRAINT IF EXISTS checkins_event_id_fkey;
    ALTER TABLE checkins
      ADD CONSTRAINT checkins_event_id_fkey
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE RESTRICT;

    ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_event_id_fkey;
    ALTER TABLE notifications
      ADD CONSTRAINT notifications_event_id_fkey
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL;

    DROP INDEX IF EXISTS idx_events_user_dedup;
    CREATE UNIQUE INDEX idx_events_user_dedup
      ON events (venue_id, event_date, event_name, created_by_user_id)
      WHERE source = 'user_created' AND status IS DISTINCT FROM 'cancelled';

    UPDATE events
       SET external_id = external_id || '#cancelled#' || id::text
     WHERE status = 'cancelled'
       AND external_id IS NOT NULL
       AND position('#cancelled#' in external_id) = 0;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Recreate the pre-063 unique index. Do not restore CASCADE on checkins.
  pgm.sql(`
    DROP INDEX IF EXISTS idx_events_user_dedup;
    CREATE UNIQUE INDEX idx_events_user_dedup
      ON events (venue_id, event_date, event_name, created_by_user_id)
      WHERE source = 'user_created';
  `);
}
