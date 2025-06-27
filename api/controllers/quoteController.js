// controllers/quoteController.js
const pool = require('../config/db.config');

const createQuoteRequest = async (req, res) => {
  const { provider_email, provider_phone_number, email, message } = req.body;

  if (!provider_email && !provider_phone_number) {
    return res
      .status(400)
      .json({ error: "A provider email or phone number is required" });
  }

  try {
    // 1) lookup user_id
    const userResult = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user_id = userResult.rows[0].id;

    // 2) lookup provider_id
    let provResult;
    if (provider_email) {
      provResult = await pool.query(
        'SELECT id FROM service_providers WHERE email = $1',
        [provider_email]
      );
    } else if (provider_phone_number) {
      provResult = await pool.query(
        'SELECT id FROM service_providers WHERE phone_number = $1',
        [provider_phone_number]
      );
    }

    if (!provResult || provResult.rows.length === 0) {
      return res.status(404).json({ error: 'Service provider not found' });
    }
    const provider_id = provResult.rows[0].id;

    // 3) insert into quote_requests
    const insertQS = `
      INSERT INTO quote_requests (provider_id, user_id, message)
      VALUES ($1, $2, $3)
      RETURNING id, provider_id, user_id, message, status, created_at
    `;
    const insertRes = await pool.query(insertQS, [
      provider_id,
      user_id,
      message.trim()
    ]);

    res.status(201).json(insertRes.rows[0]);
  } catch (err) {
    console.error('Error creating quote request:', err);
    res.status(500).json({ error: 'Failed to create quote request' });
  }
};

const getQuotesByProvider = async (req, res) => {
  const { providerId } = req.params;

  try {
    const q = `
      SELECT
        qr.id,
        qr.message,
        qr.status,
        qr.created_at,
        u.preferred_name,
        u.email,
        u.phone_number
      FROM quote_requests qr
      JOIN users u ON u.id = qr.user_id
      WHERE qr.provider_id = $1
      ORDER BY qr.created_at DESC
    `;
    const { rows } = await pool.query(q, [providerId]);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching quote requests:', err);
    res.status(500).json({ error: 'Failed to fetch quote requests' });
  }
};

module.exports = {
  createQuoteRequest,
  getQuotesByProvider
};
