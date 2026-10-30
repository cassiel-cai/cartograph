import { parseLocale, LOCALE_COOKIE, type Locale } from "@/lib/locale";
import { cookies } from "next/headers";

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  return parseLocale(store.get(LOCALE_COOKIE)?.value);
}
