// routes/connections.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db.config');
const { getConnectionsByEmail } = require('../controllers/connectionsController');

router.post('/check-connections', async (req, res) => {
  const { email } = req.body;
  
  try {
    const connections = await getConnectionsByEmail(email);
    res.json(connections);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching connections' });
  }
});

module.exports = router;
