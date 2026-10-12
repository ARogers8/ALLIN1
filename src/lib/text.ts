/** Lowercase, strip punctuation and filler so "A 12\" Philly Cheesesteak!" and "12 inch philly cheesesteak" match. */
export function normalizeKey(input: string): string {
  return input
    .toLowerCase()
    .replace(/["”“]/g, " inch ")
    .replace(/(\d)\s*(inches|in)\b/g, "$1 inch")
    .replace(/[^a-z0-9\s.]/g, " ")
    .replace(/\b(a|an|the|i|had|ate|some|of|from|with)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function round(n: number, digits = 0): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}
