export interface BusinessCalendar { timezone: 'Asia/Ho_Chi_Minh'; holidays: string[] }
export function parseBusinessCalendar(raw = ''): BusinessCalendar {
  const holidays = raw.trim() ? raw.split(',').map(x => x.trim()) : [];
  for (const day of holidays) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || new Date(day).toISOString().slice(0, 10) !== day) throw new Error('SLA_HOLIDAYS must contain valid ISO dates');
  }
  return { timezone: 'Asia/Ho_Chi_Minh', holidays: [...new Set(holidays)].sort() };
}
const offset = 7 * 3600000;
function shifts(day: number, calendar: BusinessCalendar): [number, number][] {
  const local = new Date(day + offset);
  if ([0, 6].includes(local.getUTCDay()) || calendar.holidays.includes(local.toISOString().slice(0, 10))) return [];
  return [[day + 8 * 3600000, day + 12 * 3600000], [day + 13 * 3600000, day + 17 * 3600000]];
}
function dayStart(time: number) { return Math.floor((time + offset) / 86400000) * 86400000 - offset; }
export function businessMinutes(start: string | Date, end: string | Date, calendar: BusinessCalendar): number {
  const a = new Date(start).getTime(), b = new Date(end).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) throw new Error('Invalid time range');
  let ms = 0;
  for (let day = dayStart(a); day <= b; day += 86400000) for (const [s, e] of shifts(day, calendar)) ms += Math.max(0, Math.min(b, e) - Math.max(a, s));
  return ms / 60000;
}
export function businessDeadline(start: string | Date, minutes: number, calendar: BusinessCalendar): string {
  let cursor = new Date(start).getTime(), remaining = minutes * 60000;
  if (!Number.isFinite(cursor) || !Number.isFinite(minutes) || minutes < 0) throw new Error('Invalid deadline');
  if (!remaining) return new Date(cursor).toISOString();
  for (let day = dayStart(cursor); ; day += 86400000) for (const [s, e] of shifts(day, calendar)) {
    const from = Math.max(cursor, s); if (from >= e) continue;
    if (remaining <= e - from) return new Date(from + remaining).toISOString();
    remaining -= e - from; cursor = e;
  }
}
