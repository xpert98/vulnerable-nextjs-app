import { Pool } from 'pg';

const connectionString =
  process.env.DATABASE_URL || 'postgres://beacon:beacon_pass@localhost:5432/beacon';

const globalForDb = globalThis;

export const pool =
  globalForDb.__beaconPool ??
  new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

pool.on('error', (err) => {
  console.error('[beacon] unexpected postgres pool error', err);
});

if (process.env.NODE_ENV !== 'production') {
  globalForDb.__beaconPool = pool;
}
