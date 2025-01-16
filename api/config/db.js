const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'trust_main',
    password: 'VenMan2005',
    port: 5432,
});

module.exports = pool;