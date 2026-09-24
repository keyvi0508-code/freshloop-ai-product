import { parseRequestBody } from './_deepseek.js';
import { sendSmsWithTwilio, verifySupabaseUser } from './_sms.js';

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' });
  try {
    const user = await verifySupabaseUser(request);
    const { phone, message } = parseRequestBody(request);
    if (!phone || !message) return response.status(400).json({ error: 'phone and message are required' });
    if (user.phone && user.phone !== phone) return response.status(403).json({ error: 'Reminder phone must match the verified account' });
    const result = await sendSmsWithTwilio({ phone, message: String(message).slice(0, 320) });
    return response.status(200).json(result);
  } catch (error) {
    return response.status(error.status || 500).json({ error: error.message || 'SMS failed' });
  }
}
