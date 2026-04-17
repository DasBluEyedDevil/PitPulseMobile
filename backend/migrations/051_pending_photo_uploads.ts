import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * B-SEC-3: Track presigned R2 keys before they are attached to a check-in.
 */

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('pending_photo_uploads', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('uuid_generate_v4()'),
    },
    checkin_id: {
      type: 'uuid',
      notNull: true,
      references: 'checkins(id)',
      onDelete: 'CASCADE',
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
    object_key: { type: 'varchar(500)', notNull: true, unique: true },
    created_at: { type: 'timestamptz', default: pgm.func('NOW()'), notNull: true },
  });
  pgm.createIndex('pending_photo_uploads', ['checkin_id', 'user_id']);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('pending_photo_uploads', { ifExists: true });
}
