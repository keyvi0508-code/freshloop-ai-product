export function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function buildPlanReviewAt(plannedFor, confirmationTime = '21:30', now = new Date()) {
  const scheduled = new Date(`${plannedFor}T${confirmationTime}:00`);
  if (!Number.isFinite(scheduled.getTime())) return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
  if (scheduled <= now) return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
  return scheduled.toISOString();
}

export function planReviewTime(plan) {
  if (plan.reviewSnoozedUntil) return new Date(plan.reviewSnoozedUntil);
  if (plan.reviewAt) return new Date(plan.reviewAt);
  if (plan.plannedFor) return new Date(`${plan.plannedFor}T${plan.confirmationTime || '21:30'}:00`);
  return new Date(Number.NaN);
}

export function isPlanReviewDue(plan, now = new Date()) {
  if (!plan || !['planned', 'awaiting_review'].includes(plan.status)) return false;
  const reviewAt = planReviewTime(plan);
  return Number.isFinite(reviewAt.getTime()) && reviewAt <= now;
}

export function nextPlanForReview(plans = [], now = new Date()) {
  return plans
    .filter((plan) => isPlanReviewDue(plan, now))
    .sort((a, b) => planReviewTime(a) - planReviewTime(b))[0] || null;
}

export function snoozePlanReview(plan, now = new Date(), minutes = 60) {
  plan.reviewSnoozedUntil = new Date(now.getTime() + minutes * 60 * 1000).toISOString();
}
