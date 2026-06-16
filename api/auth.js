const SUPABASE_URL = 'https://rwumpjjdzriagkwqtaka.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3dW1wampkenJpYWdrd3F0YWthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExMTE4NDMsImV4cCI6MjA5NjY4Nzg0M30.HxPhvpd9R2PYtdk0AM4_kgGYgFg9hxFaQDTfqabL1Fs';

const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json'
};

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36) + str.length.toString(36);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { action, email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const normalizedEmail = email.toLowerCase().trim();
  const hashedPassword = simpleHash(password);

  if (action === 'register') {
    const check = await fetch(
      `${SUPABASE_URL}/rest/v1/players?email=eq.${encodeURIComponent(normalizedEmail)}`,
      { headers }
    );
    const existing = await check.json();
    if (existing.length > 0) return res.status(409).json({ error: 'Email already registered' });

    const insert = await fetch(`${SUPABASE_URL}/rest/v1/players`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'return=representation' },
      body: JSON.stringify({ email: normalizedEmail, password: hashedPassword })
    });
    if (!insert.ok) return res.status(500).json({ error: 'Registration failed' });
    return res.status(200).json({ ok: true, player_id: normalizedEmail });
  }

  if (action === 'login') {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/players?email=eq.${encodeURIComponent(normalizedEmail)}&password=eq.${hashedPassword}`,
      { headers }
    );
    const players = await r.json();
    if (!players.length) return res.status(401).json({ error: 'Invalid email or password' });
    return res.status(200).json({ ok: true, player_id: normalizedEmail });
  }

  return res.status(400).json({ error: 'Invalid action' });
}
