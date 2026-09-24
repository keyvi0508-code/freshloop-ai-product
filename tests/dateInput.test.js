import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidIsoDate, monthDates } from '../src/dateInput.js';

test('ISO date input validates leap years and real days', () => {
  assert.equal(isValidIsoDate('2028-02-29'), true);
  for (const value of ['2026-02-29', '2026-04-31', '2026-13-01', '2026/09/02', '0000-01-01']) assert.equal(isValidIsoDate(value), false);
  assert.equal(isValidIsoDate('2026-09-02'), true);
});
test('calendar days have the right weekday offset and month length', () => {
  const dates = monthDates(2026, 8);
  assert.equal(dates[0], null);
  assert.equal(dates[1], null);
  assert.equal(dates[2], '2026-09-01');
  assert.equal(dates.at(-1), '2026-09-30');
  assert.equal(monthDates(2028, 1).filter(Boolean).length, 29);
});
