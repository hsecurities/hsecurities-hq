import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://hsec_admin:CyberCampus2026!@localhost:5432/hsecurities_hq',
  ssl: process.env.NODE_ENV === 'production' && process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[PostgreSQL Pool Error]', err);
});

export const query = (text: string, params?: any[]) => pool.query(text, params);
