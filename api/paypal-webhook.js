const SUPABASE_URL = 'https://rwumpjjdzriagkwqtaka.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3dW1wampkenJpYWdrd3F0YWthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExMTE4NDMsImV4cCI6MjA5NjY4Nzg0M30.HxPhvpd9R2PYtdk0AM4_kgGYgFg9hxFaQDTfqabL1Fs';
const PAYPAL_CLIENT_ID = 'AeESC7dHd1MOZBlhq_V_fofdI1-wJXf2gGN8_rBu7-jv6HXPyrs2mKrp53wWfcCkV53A1ZtVdE7BTos3';
const PAYPAL_SECRET = process.env.PAYPAL_SECRET;

async function verifyPayPalOrder(orderId) {
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString('base64');
  const res = await fetch(`https://api-m.paypal.com/v2/checkout/orders/${orderId}`, {
    headers: { 'Authorization': `Basic ${auth}` }
  });
  return res.json();
}

async function savePayment(orderId, playerId, runsGranted, amount) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/payments`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({
      paypal_order_id: orderId,
      player_id: playerId,
      runs_granted: runsGranted,
      amount: amount,
      status: 'completed'
    })
  });
  return res.ok;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const event = req.body;
    const eventType = event?.event_type;

    if (eventType !== 'PAYMENT.CAPTURE.COMPLETED') {
      return res.status(200).json({ ok: true });
    }

    const orderId = event?.resource?.supplementary_data?.related_ids?.order_id
      || event?.resource?.id;
    const amount = parseFloat(event?.resource?.amount?.value || '0');
    const playerId = event?.resource?.custom_id || 'unknown';

    // Verify with PayPal API
    const order = await verifyPayPalOrder(orderId);
    if (order.status !== 'COMPLETED') {
      return res.status(400).json({ error: 'Order not completed' });
    }

    // $5 = 1 run
    const runsGranted = Math.floor(amount / 5);
    if (runsGranted < 1) return res.status(400).json({ error: 'Invalid amount' });

    const saved = await savePayment(orderId, playerId, runsGranted, amount);
    if (!saved) return res.status(500).json({ error: 'DB error' });

    return res.status(200).json({ ok: true, runs: runsGranted });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}
