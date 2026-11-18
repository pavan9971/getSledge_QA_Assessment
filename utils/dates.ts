export function daysFromNow(n: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d;
}

const two = (n: number) => String(n).padStart(2, '0');

/** 2026-11-28 */
export const isoDay = (d: Date) => `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;

/** 11/28/2026, the format the project header uses */
export const mdy = (d: Date) => `${two(d.getMonth() + 1)}/${two(d.getDate())}/${d.getFullYear()}`;

/** The picker labels days like "Saturday, November 28th, 2026" */
export function dayLabel(d: Date): string {
  const n = d.getDate();
  const suffixes: Record<number, string> = { 1: 'st', 2: 'nd', 3: 'rd' };
  const suffix = [11, 12, 13].includes(n % 100) ? 'th' : suffixes[n % 10] ?? 'th';
  const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
  const month = d.toLocaleDateString('en-US', { month: 'long' });
  return `${weekday}, ${month} ${n}${suffix}, ${d.getFullYear()}`;
}

/** Months between today and d, negative if d is in the past */
export function monthsFromNow(d: Date): number {
  const now = new Date();
  return (d.getFullYear() - now.getFullYear()) * 12 + (d.getMonth() - now.getMonth());
}
