import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * Migration 048: Rename total_reviews → total_checkins
 *
 * Part of the brand alignment initiative: all "review" language is replaced
 * with "check-in" language to reflect the app's primary action.
 *
 * Renames the total_reviews column on both the venues and bands tables to
 * total_checkins to match the updated service layer and TypeScript types.
 */

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Idempotent rename: handle environments where a corrective migration
  // (e.g. 041) already added `total_checkins` as a parallel column.
  //
  // Cases handled per table:
  //   1. total_reviews present, total_checkins absent: plain RENAME.
  //   2. Both present: prefer post-047 backfilled total_reviews value
  //      (authoritative — computed from checkin data), then drop the
  //      stale total_checkins and RENAME.
  //   3. total_checkins present, total_reviews absent: already renamed
  //      by an earlier corrective path — no-op.
  //   4. Neither present: shouldn't happen (migration 044 creates
  //      total_checkins on fresh DBs), but treated as no-op for safety.
  pgm.sql(`
    DO $$
    DECLARE
      has_reviews boolean;
      has_checkins boolean;
    BEGIN
      -- venues
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='venues' AND column_name='total_reviews'
      ) INTO has_reviews;
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='venues' AND column_name='total_checkins'
      ) INTO has_checkins;

      IF has_reviews AND has_checkins THEN
        -- Merge: overwrite stale total_checkins with authoritative
        -- post-047 total_reviews value, then drop total_reviews and rename.
        UPDATE venues SET total_checkins = total_reviews;
        ALTER TABLE venues DROP COLUMN total_reviews;
      ELSIF has_reviews AND NOT has_checkins THEN
        ALTER TABLE venues RENAME COLUMN total_reviews TO total_checkins;
      END IF;
      -- If only total_checkins exists, or neither: no-op.

      -- bands
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='bands' AND column_name='total_reviews'
      ) INTO has_reviews;
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='bands' AND column_name='total_checkins'
      ) INTO has_checkins;

      IF has_reviews AND has_checkins THEN
        UPDATE bands SET total_checkins = total_reviews;
        ALTER TABLE bands DROP COLUMN total_reviews;
      ELSIF has_reviews AND NOT has_checkins THEN
        ALTER TABLE bands RENAME COLUMN total_reviews TO total_checkins;
      END IF;
    END $$;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE venues RENAME COLUMN total_checkins TO total_reviews;
    ALTER TABLE bands RENAME COLUMN total_checkins TO total_reviews;
  `);
}
