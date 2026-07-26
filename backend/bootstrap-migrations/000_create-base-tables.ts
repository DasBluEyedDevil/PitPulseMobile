import type { MigrationBuilder } from 'node-pg-migrate';

import { createBaseTables } from '../migration-support/createBaseTables';

export async function up(pgm: MigrationBuilder): Promise<void> {
  await createBaseTables(pgm);
}

export async function down(_pgm: MigrationBuilder): Promise<void> {
  // The baseline is forward-only. Application rollback must not delete user data.
}
