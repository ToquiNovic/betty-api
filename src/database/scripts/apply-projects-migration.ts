import postgres from 'postgres';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const url = process.env.DATABASE_URL || 'postgres://betty:betty_secret_pass@localhost:5432/betty_db';
  console.log(`Connecting to database at ${url}...`);

  const sql = postgres(url, { max: 1 });

  try {
    const migrationFile = path.join(__dirname, '../migrations/0004_projects_tables.sql');
    const sqlContent = fs.readFileSync(migrationFile, 'utf8');

    console.log('Applying 0004_projects_tables.sql migration...');
    await sql.unsafe(sqlContent);
    console.log('✅ Projects migration applied successfully!');
  } catch (error) {
    console.error('❌ Error applying migration:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
