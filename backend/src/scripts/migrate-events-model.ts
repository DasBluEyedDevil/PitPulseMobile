import Database from '../config/database';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const db = Database.getInstance();

async function migrateToEventsModel() {
  console.log('🚀 Starting Events Model Migration...\n');

  try {
    // Check database connection
    const isHealthy = await db.healthCheck();
    if (!isHealthy) {
      throw new Error('Database connection failed');
    }
    console.log('✅ Database connection successful\n');

    // Step 1: Add external ID columns to venues
    console.log('📍 Adding external ID tracking to venues...');
    await db.query(`
      ALTER TABLE venues
      ADD COLUMN IF NOT EXISTS foursquare_place_id VARCHAR(255) UNIQUE,
      ADD COLUMN IF NOT EXISTS setlistfm_venue_id VARCHAR(255) UNIQUE,
      ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'user_created';
    `);
    console.log('✅ Venues table updated\n');

    // Step 2: Add external ID columns to bands
    console.log('🎸 Adding external ID tracking to bands...');
    await db.query(`
      ALTER TABLE bands
      ADD COLUMN IF NOT EXISTS musicbrainz_id VARCHAR(255) UNIQUE,
      ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'user_created';
    `);
    console.log('✅ Bands table updated\n');

    // Step 3: Create events table
    console.log('🎫 Creating events table...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS events (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
        band_id UUID NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
        event_date DATE NOT NULL,
        event_name VARCHAR(255),
        created_by_user_id UUID REFERENCES users(id),
        is_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_event UNIQUE(venue_id, band_id, event_date)
      );
    `);

    // Create index on event_date for performance
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
    `);
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_events_venue ON events(venue_id);
    `);
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_events_band ON events(band_id);
    `);

    console.log('✅ Events table created with indexes\n');

    // Step 4: Create checkins table
    console.log('✓ Creating check-ins table...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS checkins (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        venue_rating INTEGER CHECK (venue_rating >= 1 AND venue_rating <= 5),
        band_rating INTEGER CHECK (band_rating >= 1 AND band_rating <= 5),
        review_text TEXT,
        image_urls TEXT[],
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_user_checkin UNIQUE(user_id, event_id)
      );
    `);

    // Create indexes for check-ins
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_checkins_user ON checkins(user_id);
    `);
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_checkins_event ON checkins(event_id);
    `);
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_checkins_created ON checkins(created_at);
    `);

    console.log('✅ Check-ins table created with indexes\n');

    // Step 5: Create checkin_toasts table
    console.log('🍻 Creating toasts table...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS checkin_toasts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        checkin_id UUID NOT NULL REFERENCES checkins(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_user_toast UNIQUE(checkin_id, user_id)
      );
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_toasts_checkin ON checkin_toasts(checkin_id);
    `);

    console.log('✅ Toasts table created\n');

    // Step 6: Create checkin_comments table
    console.log('💬 Creating comments table...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS checkin_comments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        checkin_id UUID NOT NULL REFERENCES checkins(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        comment_text TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_comments_checkin ON checkin_comments(checkin_id);
    `);
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_comments_created ON checkin_comments(created_at);
    `);

    console.log('✅ Comments table created\n');

    // Step 7: Create trigger for check-ins updated_at
    console.log('⚙️  Creating triggers...');
    // Drop triggers if they exist, then recreate
    await db.query(`DROP TRIGGER IF EXISTS update_checkins_updated_at ON checkins;`);
    await db.query(`
      CREATE TRIGGER update_checkins_updated_at
      BEFORE UPDATE ON checkins
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    `);

    await db.query(`DROP TRIGGER IF EXISTS update_events_updated_at ON events;`);
    await db.query(`
      CREATE TRIGGER update_events_updated_at
      BEFORE UPDATE ON events
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    `);

    console.log('✅ Triggers created\n');

    // Step 8: Update existing seed data with sources
    console.log('🌱 Updating existing seed data...');
    await db.query(`
      UPDATE venues
      SET source = 'user_created'
      WHERE source IS NULL;
    `);

    await db.query(`
      UPDATE bands
      SET source = 'user_created'
      WHERE source IS NULL;
    `);

    console.log('✅ Seed data updated\n');

    console.log('🎉 Events Model Migration Complete!\n');
    console.log('📊 New Tables Created:');
    console.log('   • events (venue + band + date)');
    console.log('   • checkins (user check-ins with dual ratings)');
    console.log('   • checkin_toasts (quick kudos)');
    console.log('   • checkin_comments (discussions)\n');
    console.log('📊 Updated Tables:');
    console.log('   • venues (added foursquare_place_id, source)');
    console.log('   • bands (added musicbrainz_id, source)\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateToEventsModel();
