import type { detectLocale, localizedPath } from "./i18n";
import type { Locale, LocaleDefinition } from "./locales";

export function initializeLanguage(
  detect: typeof detectLocale,
  path: typeof localizedPath,
  definitions: Record<string, LocaleDefinition>,
) {
  document.documentElement.classList.add("js");
  if (location.pathname !== "/") return;

  const explicit = new URLSearchParams(location.search).get("lang");
  let saved: string | null;
  try {
    saved = localStorage.getItem("site-language");
  } catch {
    saved = null;
  }
  const available = (value: string | null): value is Locale =>
    value !== null && Object.hasOwn(definitions, value);
  const preferred = available(explicit) ? explicit : saved;
  const current = document.documentElement.lang;
  const locale = available(preferred)
    ? preferred
    : detect(
        navigator.languages?.length
          ? navigator.languages
          : [navigator.language],
      );
  if (locale !== current) {
    location.replace(
      path(location.pathname, locale, definitions) +
        location.search +
        location.hash,
    );
  }
}
