import pg from 'pg';
import fs from 'fs';
import path from 'path';

const password = process.env.PGPASSWORD || process.env.DB_PASSWORD || 'postgres';
const user = process.env.PGUSER || 'postgres';
const host = process.env.PGHOST || '127.0.0.1';
const port = parseInt(process.env.PGPORT || '5432', 10);

async function initPostgresDb() {
  console.log(`📡 Connecting to PostgreSQL at ${host}:${port} as user '${user}'...`);

  const rootConnectionString = `postgresql://${user}:${encodeURIComponent(password)}@${host}:${port}/postgres`;
  const pool = new pg.Pool({ connectionString: rootConnectionString });

  try {
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL root db!');

    // Check if database 'gamio' exists
    const res = await client.query("SELECT 1 FROM pg_database WHERE datname = 'gamio'");
    if (res.rowCount === 0) {
      console.log("🔨 Creating database 'gamio'...");
      await client.query("CREATE DATABASE gamio");
      console.log("✅ Database 'gamio' created successfully!");
    } else {
      console.log("ℹ️ Database 'gamio' already exists.");
    }
    client.release();
    await pool.end();

    // Connect to 'gamio' database and run schema.sql
    const gamioConnectionString = `postgresql://${user}:${encodeURIComponent(password)}@${host}:${port}/gamio`;
    const gamioPool = new pg.Pool({ connectionString: gamioConnectionString });
    const gamioClient = await gamioPool.connect();

    console.log('📜 Executing schema.sql migration...');
    const schemaSql = fs.readFileSync(path.join(process.cwd(), 'schema.sql'), 'utf-8');
    await gamioClient.query(schemaSql);
    console.log('✅ PostgreSQL Schema initialized successfully! All tables created (users, games, replays, scores, clips).');

    gamioClient.release();
    await gamioPool.end();

    // Create .env file for backend
    const envContent = `PORT=3001\nDATABASE_URL=${gamioConnectionString}\n`;
    fs.writeFileSync(path.join(process.cwd(), '.env'), envContent, 'utf-8');
    console.log('✅ Created backend/.env with DATABASE_URL config!');

  } catch (err) {
    console.error('❌ Failed to initialize PostgreSQL DB:', err.message);
    process.exit(1);
  }
}

initPostgresDb();
