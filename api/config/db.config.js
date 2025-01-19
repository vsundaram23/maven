// api/config/db.config.js
// const { Pool } = require('pg');

// // const pool = new Pool({
// //   user: process.env.DB_USER,
// //   host: process.env.DB_HOST,
// //   database: process.env.DB_NAME,
// //   password: process.env.DB_PASSWORD,
// //   port: process.env.DB_PORT || 5432
// // });

// const pool = new Pool({
//     user: "postgres",
//     host: "localhost",
//     database: "trust_main",
//     password: "VenMan2005!",
//     port: 5432
//   });

//   pool.connect((err, client, release) => {
//     if (err) {
//       console.error('Error acquiring client', err.stack);
//     } else {
//       console.log('Database connected successfully');
//       // release();
//     }
//   });

// module.exports = pool;

// const { Pool } = require('@neondatabase/serverless');
// require('dotenv').config();

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: true
// });

// pool.on('error', (err) => {
//   console.error('Unexpected error on idle client', err);
// });

// module.exports = pool;

const { Pool, neonConfig } = require('@neondatabase/serverless');
const ws = require('ws');

neonConfig.webSocketConstructor = ws;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

module.exports = pool;



