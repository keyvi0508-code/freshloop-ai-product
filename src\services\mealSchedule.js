export const MEAL_COUNTS = Object.freeze([1, 2, 3, 4, 5, 6]);

// Preserve existing times when reducing and expanding the visible schedule.
export function mealSchedule(count, current = []) {
  const times = Array.isArray(current) ? current.slice(0, 6) : [];
  const length = Math.max(1, Math.min(6, Number(count) || 3));
  const defaults = ['08:00', '12:30', '19:00', '10:00', '15:00', '21:00'];
  while (times.length < length) times.push(defaults[times.length]);
  return times;
}
