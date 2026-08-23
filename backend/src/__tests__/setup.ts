// Load environment variables before running tests
import dotenv from 'dotenv';
import Database from '../config/database';

dotenv.config();

// A-022: local `npm test` is not documented to export JWT_SECRET. AuthUtils
// requires ≥32 chars at import time. Never inject a stub in production.
if (!process.env.JWT_SECRET && process.env.NODE_ENV !== 'production') {
  process.env.JWT_SECRET = 'ci-test-secret-must-be-at-least-32-characters-long';
}

afterAll(async () => {
  const database = (Database as unknown as { instance?: { close: () => Promise<void> } }).instance;

  if (database) {
    await database.close();
  }
});
