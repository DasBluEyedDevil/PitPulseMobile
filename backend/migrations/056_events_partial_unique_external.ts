import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * H-DB-4: Partial unique on (source, external_id) when external_id is set.
 */

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE events DROP CONSTRAINT IF EXISTS unique_external_event;
  `);
  pgm.sql(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_events_source_external_id
    ON events (source, external_id)
    WHERE external_id IS NOT NULL;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`DROP INDEX IF EXISTS idx_events_source_external_id;`);
  pgm.sql(`
    ALTER TABLE events ADD CONSTRAINT unique_external_event UNIQUE (source, external_id);
  `);
}
