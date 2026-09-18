import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';

const globalForDb = globalThis as unknown as {
  __sispatPool?: pg.Pool;
  __sispatDb?: ReturnType<typeof createDrizzle>;
};

function createDrizzle(pool: pg.Pool) {
  return drizzle(pool, { schema });
}

export function getDb(): ReturnType<typeof createDrizzle> {
  if (!globalForDb.__sispatDb) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not defined');
    }
    // Reutiliza o mesmo Pool entre invocações serverless (Vercel) para
    // evitar exaustão de conexões no PostgreSQL.
    if (!globalForDb.__sispatPool) {
      globalForDb.__sispatPool = new pg.Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production'
          ? { rejectUnauthorized: false }
          : false,
      });
    }
    globalForDb.__sispatDb = createDrizzle(globalForDb.__sispatPool);
  }
  return globalForDb.__sispatDb;
}

export const db = new Proxy({} as any, {
  get(_target, prop) {
    return (getDb() as any)[prop];
  }
});

