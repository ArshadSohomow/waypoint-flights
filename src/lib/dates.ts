// Dates are handled as plain YYYY-MM-DD strings in UTC so a day never shifts with the
// viewer's time zone.

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const pad = (n: number) => String(n).padStart(2, '0');

export function toISO(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}
export function parseISO(s: string): Date {
  return new Date(s + 'T00:00:00Z');
}
export function todayISO(): string {
  const n = new Date();
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`;
}
export function addDays(s: string, n: number): string {
  const d = parseISO(s);
  d.setUTCDate(d.getUTCDate() + n);
  return toISO(d);
}
export function isValidISO(s: unknown): s is string {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && toISO(parseISO(s)) === s;
}

/** "Thu 12 Sep" */
export function shortDate(s: string): string {
  const d = parseISO(s);
  return `${DAYS_SHORT[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()].slice(0, 3)}`;
}
/** "Fri 13 Nov 2026": unambiguous and compact, for summaries and fields */
export function mediumDate(s: string): string {
  return `${shortDate(s)} ${parseISO(s).getUTCFullYear()}`;
}
/** "12 September 2026" */
export function longDate(s: string): string {
  const d = parseISO(s);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
/** "Thursday 12 September 2026" — for screen readers */
export function fullDate(s: string): string {
  const d = parseISO(s);
  const day = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getUTCDay()];
  return `${day} ${longDate(s)}`;
}
/** DD/MM/YYYY */
export function ukDate(s: string): string {
  const d = parseISO(s);
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}

/** Weeks of a month as ISO strings (null for padding), weeks starting Sunday. */
export function monthGrid(year: number, month: number): (string | null)[][] {
  const first = new Date(Date.UTC(year, month, 1));
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: (string | null)[] = Array(first.getUTCDay()).fill(null);
  for (let d = 1; d <= days; d++) cells.push(`${year}-${pad(month + 1)}-${pad(d)}`);
  while (cells.length % 7) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export function duration(min: number): string {
  return `${Math.floor(min / 60)}h ${pad(min % 60)}m`;
}

export function ageOn(dobISO: string, onISO: string): number {
  const dob = parseISO(dobISO);
  const on = parseISO(onISO);
  let age = on.getUTCFullYear() - dob.getUTCFullYear();
  if (on.getUTCMonth() < dob.getUTCMonth() || (on.getUTCMonth() === dob.getUTCMonth() && on.getUTCDate() < dob.getUTCDate())) age--;
  return age;
}
