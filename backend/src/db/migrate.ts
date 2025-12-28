import { Database } from './schema';
import dotenv from 'dotenv';

dotenv.config();

async function migrate() {
  // Use DATABASE_URL or individual connection parameters
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString && !process.env.DB_HOST) {
    console.error('ERROR: DATABASE_URL or DB_HOST environment variable is required');
    console.error('Please set DATABASE_URL or DB_HOST, DB_NAME, DB_USER, DB_PASSWORD in your .env file');
    process.exit(1);
  }

  const db = new Database(connectionString);
  
  try {
    await db.initialize();
    console.log('✓ Migration completed successfully!');
  } catch (error: any) {
    console.error('✗ Migration failed:', error.message);
    if (error.message.includes('ECONNREFUSED')) {
      console.error('\n💡 Tip: Make sure PostgreSQL is running and connection details are correct');
    }
    process.exit(1);
  } finally {
    await db.close();
    process.exit(0);
  }
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
