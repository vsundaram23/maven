const { Pool, neonConfig } = require('@neondatabase/serverless');
const ws = require('ws');

neonConfig.webSocketConstructor = ws;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true,
  max: 20, // Maximum number of connections in the pool
  min: 2,  // Minimum number of connections in the pool
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 5000, // Wait 5 seconds for a connection
  maxUses: 7500, // Close connections after 7500 queries (helps prevent memory leaks)
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

pool.on('connect', (client) => {
  console.log('New database connection established');
});

pool.on('remove', (client) => {
  console.log('Database connection removed from pool');
});

// Monitor pool statistics every 30 seconds in development
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    console.log(`DB Pool Stats - Total: ${pool.totalCount}, Idle: ${pool.idleCount}, Waiting: ${pool.waitingCount}`);
  }, 30000);
}

module.exports = pool;



