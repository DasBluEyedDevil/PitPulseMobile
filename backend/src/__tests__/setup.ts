// Load environment variables before running tests
import dotenv from 'dotenv';
import Database from '../config/database';

dotenv.config();

afterAll(async () => {
  const database = (Database as unknown as { instance?: { close: () => Promise<void> } }).instance;

  if (database) {
    await database.close();
  }
});
