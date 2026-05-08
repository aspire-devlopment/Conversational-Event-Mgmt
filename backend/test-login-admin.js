const fetch = global.fetch || require('node-fetch');

async function run() {
  try {
    const res = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'testadmin@example.com', password: 'TestAdmin123!' }),
    });
    const json = await res.json().catch(() => null);
    console.log('Status:', res.status);
    console.log('Response:', json || await res.text());
  } catch (err) {
    console.error('Request failed:', err.message || err);
  }
}

run();
