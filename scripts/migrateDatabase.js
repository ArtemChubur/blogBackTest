const fs = require('fs').promises;
const path = require('path');
const pool = require('../src/config/database');

async function runMigration() {
  const migrationPath = path.join(__dirname, '../migrations/001_add_hashtags.sql');
  const sql = await fs.readFile(migrationPath, 'utf8');

  try {
    await pool.query(sql);
    console.log('Database migration completed successfully.');
  } catch (error) {
    console.error('Database migration failed:', error.message || error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

runMigration();
