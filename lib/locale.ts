export const LOCALE_COOKIE = "cg-locale";

export const LOCALES = ["en", "zh"] as const;

export type Locale = (typeof LOCALES)[number];

export function parseLocale(value: string | null | undefined): Locale {
  return value === "en" || value === "zh" ? value : "en";
}

export const LOCALE_CHANGE_EVENT = "cg-locale";

export function readLocalePreference(): Locale {
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`),
  );
  const value = match ? decodeURIComponent(match[1]) : null;
  return parseLocale(value);
}

export function writeLocalePreference(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export const LOCALE_BOOTSTRAP = `(function(){try{var m=document.cookie.match(/(?:^|; )${LOCALE_COOKIE}=([^;]*)/);var p=m?decodeURIComponent(m[1]):"en";if(p!=="en"&&p!=="zh")p="en";document.documentElement.lang=p;}catch(e){}})();`;
