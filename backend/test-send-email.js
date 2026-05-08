// One-off test script: sends a test email using backend/services/emailService
require('./config/env');
const es = require('./services/emailService');

(async () => {
  try {
    await es.initialize();
    const result = await es.sendEmail({
      to: process.env.TEST_EMAIL_ADDRESS,
      subject: 'SMTP test',
      html: '<b>SMTP test</b>',
    });
    console.log('SENT', result);
    process.exit(0);
  } catch (err) {
    console.error('SEND_ERROR', err);
    process.exit(1);
  }
})();
