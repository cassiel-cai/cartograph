// A few minutes. A run that is still publishing stages resets this from the
// latest message. One that died mid-parse keeps the time it started, and the
// dashboard can show that it has been left, without a queue or a timeout.
export const STALE_AFTER_MS = 3 * 60 * 1000;

export function isUnfinished(state: string): boolean {
  return state !== "complete" && state !== "failed";
}

export function isStale(
  state: string,
  startedAt: string | null,
  now: number,
  lastMovedAt: number | null,
): boolean {
  if (!isUnfinished(state)) return false;
  const basis = lastMovedAt ?? (startedAt === null ? Number.NaN : Date.parse(startedAt));
  if (Number.isNaN(basis)) return false;
  return now - basis >= STALE_AFTER_MS;
}
