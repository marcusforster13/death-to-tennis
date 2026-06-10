const SUPABASE_URL = 'https://rwumpjjdzriagkwqtaka.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3dW1wampkenJpYWdrd3F0YWthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExMTE4NDMsImV4cCI6MjA5NjY4Nzg0M30.HxPhvpd9R2PYtdk0AM4_kgGYgFg9hxFaQDTfqabL1Fs';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { player_id, action } = req.method === 'GET' ? req.query : req.body;
  if (!player_id) return res.status(400).json({ error: 'player_id required' });

  // GET: check available runs
  if (req.method === 'GET') {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/payments?player_id=eq.${player_id}&status=eq.completed&select=runs_granted,runs_used`,
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
    );
    const rows = await r.json();
    const totalGranted = rows.reduce((s, x) => s + (x.runs_granted || 0), 0);
    const totalUsed = rows.reduce((s, x) => s + (x.runs_used || 0), 0);
    return res.status(200).json({ runs: totalGranted - totalUsed });
  }

  // POST action=use: deduct 1 run
  if (req.method === 'POST' && action === 'use') {
    // Find a payment with remaining runs
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/payments?player_id=eq.${player_id}&status=eq.completed&select=id,runs_granted,runs_used`,
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
    );
    const rows = await r.json();
    const available = rows.find(x => (x.runs_granted || 0) > (x.runs_used || 0));
    if (!available) return res.status(403).json({ error: 'No runs available' });

    // Increment runs_used
    await fetch(`${SUPABASE_URL}/rest/v1/payments?id=eq.${available.id}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ runs_used: (available.runs_used || 0) + 1 })
    });

    return res.status(200).json({ ok: true });
  }

  return res.status(405).end();
}
