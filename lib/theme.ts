export const THEME_COOKIE = "cg-theme";

export const THEME_VALUES = ["system", "light", "dark"] as const;

export type ThemePreference = (typeof THEME_VALUES)[number];

export function isThemePreference(value: string): value is ThemePreference {
  return THEME_VALUES.includes(value as ThemePreference);
}

export const THEME_CHANGE_EVENT = "cg-theme";

export function readThemePreference(): ThemePreference {
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${THEME_COOKIE}=([^;]*)`),
  );
  const value = match ? decodeURIComponent(match[1]) : "system";
  return isThemePreference(value) ? value : "system";
}

export function writeThemePreference(preference: ThemePreference) {
  const cookie = `${THEME_COOKIE}=${preference}; Path=/; Max-Age=31536000; SameSite=Lax`;
  document.cookie = cookie;
}

export function resolvedTheme(preference: ThemePreference): "light" | "dark" {
  if (preference === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return preference;
}

export function applyTheme(preference: ThemePreference) {
  const root = document.documentElement;
  root.setAttribute("data-theme", resolvedTheme(preference));
  root.setAttribute("data-theme-pref", preference);
}

export const THEME_BOOTSTRAP = `(function(){try{var m=document.cookie.match(/(?:^|; )${THEME_COOKIE}=([^;]*)/);var p=m?decodeURIComponent(m[1]):"system";if(p!=="light"&&p!=="dark"&&p!=="system")p="system";var d=p==="dark"||(p==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.setAttribute("data-theme",d?"dark":"light");r.setAttribute("data-theme-pref",p);}catch(e){}})();`;
