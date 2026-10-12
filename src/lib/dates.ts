/** Calendar-day helpers. Days are "YYYY-MM-DD" strings in the user's own timezone. */

export function todayKey(timeZone?: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  } catch {
    return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  }
}

export function isDayKey(s: string | undefined | null): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + "T00:00:00Z"));
}

export function addDays(day: string, n: number): string {
  const d = new Date(day + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86_400_000);
}

export function dayRange(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

export function ageOn(birthDate: Date, day: string): number {
  const ref = new Date(day + "T00:00:00Z");
  let age = ref.getUTCFullYear() - birthDate.getUTCFullYear();
  const m = ref.getUTCMonth() - birthDate.getUTCMonth();
  if (m < 0 || (m === 0 && ref.getUTCDate() < birthDate.getUTCDate())) age--;
  return age;
}

export function formatDay(day: string, opts: Intl.DateTimeFormatOptions = { weekday: "long", month: "short", day: "numeric" }): string {
  return new Date(day + "T12:00:00Z").toLocaleDateString("en-US", { ...opts, timeZone: "UTC" });
}

export function relativeDayLabel(day: string, today: string): string {
  const diff = daysBetween(today, day);
  if (diff === 0) return "Today";
  if (diff === -1) return "Yesterday";
  if (diff === 1) return "Tomorrow";
  return formatDay(day, { weekday: "short", month: "short", day: "numeric" });
}
