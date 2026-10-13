import { isDayKey } from "./dates";

/** Picks the day a page shows from ?date=, never in the future. */
export function pageDay(param: string | string[] | undefined, today: string): string {
  const d = Array.isArray(param) ? param[0] : param;
  return isDayKey(d) && d <= today ? d : today;
}
