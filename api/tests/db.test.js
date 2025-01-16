const pool = require('../config/db.config');

describe('Database Connection', () => {
  test('should connect to database', async () => {
    try {
      const client = await pool.connect();
      expect(client).toBeDefined();
      client.release();
    } catch (err) {
      throw new Error('Database connection failed: ' + err.message);
    }
  });

  test('should execute a simple query', async () => {
    try {
      const result = await pool.query('SELECT NOW()');
      expect(result.rows).toBeDefined();
    } catch (err) {
      throw new Error('Query failed: ' + err.message);
    }
  });

  afterAll(async () => {
    await pool.end();
  });
});
