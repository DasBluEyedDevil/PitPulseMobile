import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * B-DB-4: External IDs for MusicBrainz, Foursquare, Setlist.fm imports.
 */

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE bands ADD COLUMN IF NOT EXISTS musicbrainz_id VARCHAR(255);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_bands_musicbrainz_id
      ON bands(musicbrainz_id) WHERE musicbrainz_id IS NOT NULL;

    ALTER TABLE venues ADD COLUMN IF NOT EXISTS foursquare_place_id VARCHAR(255);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_venues_foursquare_place_id
      ON venues(foursquare_place_id) WHERE foursquare_place_id IS NOT NULL;

    ALTER TABLE venues ADD COLUMN IF NOT EXISTS setlistfm_venue_id VARCHAR(255);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_venues_setlistfm_venue_id
      ON venues(setlistfm_venue_id) WHERE setlistfm_venue_id IS NOT NULL;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_venues_setlistfm_venue_id;
    DROP INDEX IF EXISTS idx_venues_foursquare_place_id;
    DROP INDEX IF EXISTS idx_bands_musicbrainz_id;
    ALTER TABLE venues DROP COLUMN IF EXISTS setlistfm_venue_id;
    ALTER TABLE venues DROP COLUMN IF EXISTS foursquare_place_id;
    ALTER TABLE bands DROP COLUMN IF EXISTS musicbrainz_id;
  `);
}
