import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * H-DB-1: Keep is_cancelled aligned with status on UPDATE.
 */

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE OR REPLACE FUNCTION sync_event_cancelled() RETURNS TRIGGER AS $$
    BEGIN
      NEW.is_cancelled := (NEW.status = 'cancelled');
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  pgm.sql(`
    DROP TRIGGER IF EXISTS trg_sync_event_cancelled ON events;
    CREATE TRIGGER trg_sync_event_cancelled
      BEFORE UPDATE OF status ON events
      FOR EACH ROW EXECUTE PROCEDURE sync_event_cancelled();
  `);

  pgm.sql(`
    UPDATE events SET is_cancelled = (status = 'cancelled')
    WHERE is_cancelled IS DISTINCT FROM (status = 'cancelled');
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`DROP TRIGGER IF EXISTS trg_sync_event_cancelled ON events;`);
  pgm.sql(`DROP FUNCTION IF EXISTS sync_event_cancelled();`);
}
