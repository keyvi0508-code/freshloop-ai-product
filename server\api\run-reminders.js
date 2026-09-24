import { sendSmsWithTwilio } from './_sms.js';

export default async function handler(request, response) {
  if (!['GET', 'POST'].includes(request.method)) return response.status(405).json({ error: 'Method not allowed' });
  const suppliedSecret = request.headers['x-cron-secret'] || String(request.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!process.env.CRON_SECRET || suppliedSecret !== process.env.CRON_SECRET) return response.status(401).json({ error: 'Unauthorized' });
  const url = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return response.status(503).json({ error: 'Reminder database is not configured' });
  const databaseHeaders = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' };
  const due = encodeURIComponent(new Date().toISOString());
  const jobsResponse = await fetch(`${url}/rest/v1/reminder_jobs?status=eq.pending&due_at=lte.${due}&select=*&order=due_at.asc&limit=50`, { headers: databaseHeaders });
  if (!jobsResponse.ok) return response.status(502).json({ error: 'Could not load reminder jobs' });
  const jobs = await jobsResponse.json(); const results = [];
  for (const job of jobs) {
    await fetch(`${url}/rest/v1/reminder_jobs?id=eq.${job.id}`, { method: 'PATCH', headers: databaseHeaders, body: JSON.stringify({ status: 'sending' }) });
    try {
      const sent = await sendSmsWithTwilio({ phone: job.phone, message: job.message });
      await fetch(`${url}/rest/v1/reminder_jobs?id=eq.${job.id}`, { method: 'PATCH', headers: databaseHeaders, body: JSON.stringify({ status: 'sent', provider_message_id: sent.id, sent_at: new Date().toISOString(), last_error: null }) });
      results.push({ id: job.id, status: 'sent' });
    } catch (error) {
      await fetch(`${url}/rest/v1/reminder_jobs?id=eq.${job.id}`, { method: 'PATCH', headers: databaseHeaders, body: JSON.stringify({ status: 'failed', last_error: String(error.message || error).slice(0, 500) }) });
      results.push({ id: job.id, status: 'failed' });
    }
  }
  return response.status(200).json({ processed: results.length, results });
}
