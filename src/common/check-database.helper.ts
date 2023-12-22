import { getEnv } from '@Helper/fn/get-env.helper';
import { config } from 'dotenv';
import { Client } from 'pg';

export async function manualCOnnectionDatabase() {
  const envPath = getEnv();
  config({ path: envPath });

  const client = new Client({
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT, 10),
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: 'postgres',
  });

  await client.connect();

  return client;
}

export async function ensureDatabaseExists() {
  const client = await manualCOnnectionDatabase();
  const dbName = process.env.DATABASE_NAME;
  const res = await client.query(
    `SELECT 1 FROM pg_database WHERE datname='${dbName}'`,
  );

  if (res.rowCount === 0) {
    console.log('Creating db');
    await client.query(`CREATE DATABASE "${dbName}"`);
  }

  await client.end();
}
