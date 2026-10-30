import type { Locale } from "@/lib/locale";
import { messagesFor } from "@/lib/messages";

// Hours cover the first two days, so a row from yesterday still reads as
// hours rather than flipping to days at the first midnight.
export function formatAgo(iso: string, now: number, locale: Locale): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) {
    throw new Error(`Could not read a time: ${iso}`);
  }

  const copy = messagesFor(locale);
  const elapsed = Math.max(0, now - then);
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 60) {
    return copy.minutesAgo(Math.max(1, minutes));
  }

  const hours = Math.floor(elapsed / 3_600_000);
  if (hours < 48) {
    return copy.hoursAgo(hours);
  }

  const days = Math.floor(elapsed / 86_400_000);
  return copy.daysAgo(days);
}
