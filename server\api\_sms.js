export async function sendSmsWithTwilio({ phone, message }) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from) throw new Error('SMS provider is not configured');
  const body = new URLSearchParams({ To: phone, From: from, Body: message });
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || 'SMS provider rejected the message');
  return { id: result.sid, status: result.status };
}

export async function verifySupabaseUser(request) {
  const authorization = request.headers.authorization || request.headers.Authorization;
  const url = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!authorization || !url || !anonKey) throw Object.assign(new Error('Unauthorized'), { status: 401 });
  const response = await fetch(`${url}/auth/v1/user`, { headers: { Authorization: authorization, apikey: anonKey } });
  if (!response.ok) throw Object.assign(new Error('Invalid session'), { status: 401 });
  return response.json();
}
