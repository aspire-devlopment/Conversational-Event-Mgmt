const express = require('express');
const app = express();

require('./config/env');

// Try to use the pool from the same context
app.get('/test-db', async (req, res) => {
  try {
    console.log('[/test-db] Request received');
    const pool = require('./db/pool');
    console.log('[/test-db] Pool required');
    const result = await pool.query('SELECT 1 as test_value');
    console.log('[/test-db] Query succeeded:', result.rows);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[/test-db] Error:', error.message, error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`\nTest server running on http://localhost:${PORT}`);
  console.log('Try: curl http://localhost:${PORT}/test-db\n');
});
