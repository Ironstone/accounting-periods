/** Pull at most `n` items from any iterable, stopping early. Safe on infinite generators. */
export function take<T>(source: Iterable<T>, n: number): T[] {
  const out: T[] = [];
  if (n <= 0) return out;
  for (const item of source) {
    out.push(item);
    if (out.length >= n) break;
  }
  return out;
}
