import type { detectLocale, localizedPath } from "./i18n";

export function initializeLanguage(
  detect: typeof detectLocale,
  path: typeof localizedPath,
) {
  document.documentElement.classList.add("js");
  const explicit = new URLSearchParams(location.search).get("lang");
  let saved: string | null = null;
  try {
    saved = localStorage.getItem("site-language");
  } catch {
    saved = null;
  }
  const preferred = explicit === "ru" || explicit === "en" ? explicit : saved;
  const current = document.documentElement.lang;
  const locale =
    preferred === "ru" || preferred === "en"
      ? preferred
      : current === "en"
        ? "en"
        : detect(
            navigator.languages?.length
              ? navigator.languages
              : [navigator.language],
          );
  if (locale !== current) {
    location.replace(
      path(location.pathname, locale) + location.search + location.hash,
    );
  }
}
