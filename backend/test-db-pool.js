(async () => {
  try {
    const pool = require('./db/pool');
    const res = await pool.query('SELECT 1 as v');
    console.log('POOL OK', res.rows[0]);
  } catch (e) {
    console.error('POOL ERR', e.stack || e.message);
  } finally {
    process.exit();
  }
})();
