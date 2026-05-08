// Simple Redis connectivity test using ioredis and emailConfig
require('./config/env');
const Redis = require('ioredis');
const emailConfig = require('./constants/emailConfig');

(async () => {
  try {
    const cfg = emailConfig.QUEUE_CONFIG.redis;
    console.log('Testing Redis connection with config:', cfg.host, cfg.port, 'TLS=', !!cfg.tls);
    const client = new Redis(cfg);
    client.on('error', (e) => console.error('Redis error:', e && e.message));
    client.on('connect', () => console.log('Redis connected'));
    const res = await client.ping();
    console.log('PING ->', res);
    await client.quit();
    process.exit(0);
  } catch (err) {
    console.error('Redis test failed:', err);
    process.exit(1);
  }
})();
