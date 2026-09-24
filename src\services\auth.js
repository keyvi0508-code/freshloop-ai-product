import { translateLabel } from '../i18n.js';

const supabaseUrl = String(import.meta.env?.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || '';

export function hasRemoteAuth() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

function headers(token = '') {
  return {
    apikey: supabaseAnonKey,
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

async function parseResponse(response, fallback) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.msg || data.message || data.error_description || fallback);
  return data;
}

export async function requestPhoneOtp(phone) {
  if (!hasRemoteAuth()) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    return { demo: true, message: '演示验证码为 123456' };
  }
  const response = await fetch(`${supabaseUrl}/auth/v1/otp`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ phone, create_user: true, channel: 'sms' })
  });
  return parseResponse(response, '验证码发送失败，请检查手机号或短信服务配置');
}

export async function verifyPhoneOtp(phone, token) {
  if (!hasRemoteAuth()) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    if (token !== '123456') throw new Error('演示模式验证码是 123456');
    return {
      access_token: 'freshloop-demo-token',
      refresh_token: 'freshloop-demo-refresh',
      user: { id: `demo-${phone.replace(/\D/g, '') || 'user'}`, phone }
    };
  }
  const response = await fetch(`${supabaseUrl}/auth/v1/verify`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ phone, token, type: 'sms' })
  });
  return parseResponse(response, '验证码无效或已过期');
}

export async function loadRemoteProfile(session) {
  if (!hasRemoteAuth() || !session?.user?.id) return null;
  const response = await fetch(`${supabaseUrl}/rest/v1/profiles?auth_user_id=eq.${encodeURIComponent(session.user.id)}&select=*`, {
    headers: { ...headers(session.access_token), Prefer: 'return=representation' }
  });
  const data = await parseResponse(response, '读取用户档案失败');
  return Array.isArray(data) ? data[0] || null : data;
}

export function normalizePhone(phone) {
  const value = String(phone || '').replace(/[\s()-]/g, '');
  if (!/^\+[1-9]\d{7,14}$/.test(value)) throw new Error('请输入带国家/地区代码的手机号，例如 +6581234567');
  return value;
}

export async function requestPhoneUpdate(session, phone, { demo = false } = {}) {
  phone = normalizePhone(phone);
  if (demo) return { demo: true };
  if (!hasRemoteAuth() || !session?.access_token) throw new Error('请重新登录后更改手机号');
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    method: 'PUT', headers: headers(session.access_token), body: JSON.stringify({ phone })
  });
  await parseResponse(response, '更改手机号请求失败，请检查短信服务配置');
  return { demo: false };
}

export async function verifyPhoneUpdate(session, phone, token, { demo = false } = {}) {
  phone = normalizePhone(phone);
  if (demo) {
    if (token !== '123456') throw new Error('演示模式验证码是 123456');
    return { ...session, user: { ...session?.user, phone } };
  }
  if (!hasRemoteAuth() || !session?.access_token) throw new Error('请重新登录后更改手机号');
  const response = await fetch(`${supabaseUrl}/auth/v1/verify`, {
    method: 'POST', headers: headers(session.access_token), body: JSON.stringify({ phone, token, type: 'phone_change' })
  });
  const verified = await parseResponse(response, '验证码无效或已过期');
  const accessToken = verified.access_token || session.access_token;
  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: headers(accessToken) });
  const user = await parseResponse(userResponse, '无法确认手机号，请重新登录');
  if (user.id !== session.user?.id) throw new Error('账号身份不匹配，请重新登录');
  if (String(user.phone || '').replace(/\D/g, '') !== phone.replace(/\D/g, '')) throw new Error('手机号尚未完成验证；如启用了双重确认，请继续输入另一条短信验证码');
  return { ...session, ...verified, user };
}

export async function saveRemoteProfile(session, profile, notificationSettings) {
  if (!hasRemoteAuth() || !session?.user?.id) return { demo: true };
  const payload = {
    auth_user_id: session.user.id,
    phone: session.user.phone || profile.phone,
    display_name: profile.name,
    allergies: profile.allergies || [],
    dislikes: profile.dislikes || [],
    preferences: profile.preferences || [],
    taste_tags: profile.tasteTags || [],
    cuisine_tags: profile.cuisineTags || [],
    taste_notes: profile.tasteNotes || '',
    taste_profile_summary: profile.tasteProfileSummary || '',
    meal_schedule: { mealsPerDay: profile.mealsPerDay, mealTimes: profile.mealTimes },
    appliance_temperatures: { fridgeC: profile.fridgeTemperatureC, freezerC: profile.freezerTemperatureC },
    notification_settings: { ...notificationSettings, interfaceLanguage: profile.interfaceLanguage || notificationSettings.interfaceLanguage || 'zh-CN' },
    notification_channel: notificationSettings.channel || 'app',
    sms_consent: Boolean(notificationSettings.smsConsent),
    onboarding_completed: Boolean(profile.onboardingComplete)
  };
  const response = await fetch(`${supabaseUrl}/rest/v1/profiles?on_conflict=auth_user_id`, {
    method: 'POST',
    headers: { ...headers(session.access_token), Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(payload)
  });
  return parseResponse(response, '保存用户档案失败');
}

export async function savePlannedMeal(session, plan, profile, notificationSettings) {
  if (!hasRemoteAuth() || !session?.user?.id) return { demo: true };
  const confirmationAt = new Date(`${plan.plannedFor}T${plan.confirmationTime}:00+08:00`).toISOString();
  const mealResponse = await fetch(`${supabaseUrl}/rest/v1/planned_meals`, {
    method: 'POST', headers: { ...headers(session.access_token), Prefer: 'return=representation' },
    body: JSON.stringify({ auth_user_id: session.user.id, recipe: plan.recipe, status: plan.status, planned_for: plan.plannedFor, confirmation_at: confirmationAt })
  });
  const meals = await parseResponse(mealResponse, '保存今日计划失败');
  const meal = Array.isArray(meals) ? meals[0] : meals;
  if (notificationSettings.smsConsent && ['sms', 'both'].includes(notificationSettings.channel) && profile.phone) {
    const jobResponse = await fetch(`${supabaseUrl}/rest/v1/reminder_jobs`, {
      method: 'POST', headers: { ...headers(session.access_token), Prefer: 'return=representation' },
      body: JSON.stringify({ auth_user_id: session.user.id, planned_meal_id: meal.id, phone: profile.phone, message: `FreshLoop：今天计划的「${plan.recipe.recipeName}」做了吗？`, channel: notificationSettings.channel, due_at: confirmationAt })
    });
    await parseResponse(jobResponse, '保存短信提醒失败');
  }
  return meal;
}

export function buildTasteProfile({ tasteTags = [], cuisineTags = [], tasteNotes = '', allergies = [], dislikes = [], interfaceLanguage = 'zh-CN' }) {
  if (interfaceLanguage === 'en') {
    const labels = (items) => items.map((item) => translateLabel(item)).join(', ');
    return `Tastes: ${labels(tasteTags) || 'still exploring'}. Cuisines: ${labels(cuisineTags) || 'any'}. Allergies: ${labels(allergies) || 'none recorded'}. Exclusions: ${labels(dislikes) || 'none recorded'}.${tasteNotes ? ` Your notes: ${tasteNotes}` : ''}`;
  }
  const tastes = tasteTags.length ? tasteTags.join('、') : '口味待探索';
  const cuisines = cuisineTags.length ? cuisineTags.join('、') : '不限地区';
  const guardrails = [...allergies.map((item) => `${item}过敏`), ...dislikes.map((item) => `不喜欢${item}`)].join('、') || '暂无额外禁忌';
  return `偏好${tastes}，常选${cuisines}；${tasteNotes ? `补充：${tasteNotes}；` : ''}生成时严格避开${guardrails}。`;
}

export async function sendReminderSms({ phone, message, session }) {
  const response = await fetch('/api/send-sms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
    body: JSON.stringify({ phone, message })
  });
  return parseResponse(response, '短信发送失败');
}
