export function isValidIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1 || year > 9999 || month < 1 || month > 12 || day < 1) return false;
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function iso(year, month, day) {
  return `${String(year).padStart(4, '0')}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function monthDates(year, month) {
  const first = new Date(0);
  first.setUTCFullYear(year, month, 1);
  const last = new Date(0);
  last.setUTCFullYear(year, month + 1, 0);
  return [...Array(first.getUTCDay()).fill(null), ...Array.from({ length: last.getUTCDate() }, (_, i) => iso(year, month, i + 1))];
}

// Chromium date placeholders can follow the OS locale instead of the document language.
// English mode uses an ISO input plus a small accessible calendar, with unchanged ISO values.
export function localizeEnglishDates(root) {
  const inputs = [...(root.matches?.('input[type="date"]') ? [root] : []), ...root.querySelectorAll('input[type="date"]')];
  for (const input of inputs) {
    if (input.dataset.isoDate) continue;
    input.dataset.isoDate = 'true';
    input.type = 'text';
    input.placeholder = 'YYYY-MM-DD';
    input.inputMode = 'numeric';
    input.pattern = '\\d{4}-\\d{2}-\\d{2}';
    input.maxLength = 10;
    const wrap = document.createElement('span');
    wrap.className = 'iso-date-field';
    input.before(wrap);
    wrap.append(input);
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'date-calendar-toggle';
    toggle.setAttribute('aria-label', 'Choose date');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.disabled = input.disabled;
    toggle.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 11h18"/></svg>';
    wrap.append(toggle);
    let calendar;
    const validate = () => {
      const value = input.value;
      const valid = !value || (isValidIsoDate(value) && (!input.min || value >= input.min) && (!input.max || value <= input.max));
      input.setCustomValidity(valid ? '' : 'Enter a valid date in YYYY-MM-DD format within the allowed range.');
    };
    input.addEventListener('input', validate);
    input.addEventListener('change', validate);
    const close = () => {
      calendar?.remove(); calendar = null;
      toggle.setAttribute('aria-expanded', 'false');
    };
    toggle.addEventListener('click', () => {
      if (calendar) { close(); return; }
      const today = new Date();
      const selected = isValidIsoDate(input.value) ? input.value.split('-').map(Number) : [today.getFullYear(), today.getMonth() + 1];
      let year = selected[0], month = selected[1] - 1;
      calendar = document.createElement('span');
      calendar.className = 'date-calendar';
      calendar.setAttribute('role', 'group');
      calendar.setAttribute('aria-label', 'Choose a date');
      toggle.setAttribute('aria-expanded', 'true');
      wrap.append(calendar);
      const choose = (value) => {
        input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        close(); input.focus();
      };
      const render = () => {
        const date = new Date(0); date.setUTCFullYear(year, month, 1);
        const title = date.toLocaleDateString('en', { month: 'long', year: 'numeric', timeZone: 'UTC' });
        calendar.innerHTML = `<span class="date-calendar-heading"><button type="button" data-month="-1" aria-label="Previous month">‹</button><strong aria-live="polite">${title}</strong><button type="button" data-month="1" aria-label="Next month">›</button></span><span class="date-calendar-grid">${['Su','Mo','Tu','We','Th','Fr','Sa'].map((day) => `<span>${day}</span>`).join('')}${monthDates(year, month).map((value) => value ? `<button type="button" data-day="${value}" aria-label="${value}" aria-pressed="${value === input.value}" ${input.min && value < input.min || input.max && value > input.max ? 'disabled' : ''}>${Number(value.slice(-2))}</button>` : '<span></span>').join('')}</span><span class="date-calendar-footer"><button type="button" data-today>Today</button><button type="button" data-clear>Clear</button><button type="button" data-close-calendar>Close</button></span>`;
        calendar.querySelectorAll('[data-month]').forEach((button) => button.addEventListener('click', () => {
          month += Number(button.dataset.month);
          if (month < 0) { month = 11; year--; }
          if (month > 11) { month = 0; year++; }
          year = Math.max(1, Math.min(9999, year));
          render(); calendar.querySelector(`[data-month="${button.dataset.month}"]`).focus();
        }));
        calendar.querySelectorAll('[data-day]').forEach((button) => button.addEventListener('click', () => choose(button.dataset.day)));
        calendar.querySelector('[data-today]').addEventListener('click', () => choose(iso(today.getFullYear(), today.getMonth(), today.getDate())));
        calendar.querySelector('[data-clear]').addEventListener('click', () => choose(''));
        calendar.querySelector('[data-close-calendar]').addEventListener('click', () => { close(); toggle.focus(); });
      };
      render();
      calendar.querySelector('[data-day]:not(:disabled)')?.focus();
    });
    wrap.addEventListener('keydown', (event) => { if (event.key === 'Escape' && calendar) { event.stopPropagation(); close(); toggle.focus(); } });
    wrap.addEventListener('focusout', () => queueMicrotask(() => { if (!wrap.contains(document.activeElement)) close(); }));
  }
}
