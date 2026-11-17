export type TextDirection = "ltr" | "rtl";

export interface LocaleDefinition {
  label: string;
  direction: TextDirection;
  prefix: string;
  dateLocale: string;
  ogLocale: string;
}

export const locales = {
  ru: {
    label: "Русский",
    direction: "ltr",
    prefix: "",
    dateLocale: "ru-RU",
    ogLocale: "ru_RU",
  },
  en: {
    label: "English",
    direction: "ltr",
    prefix: "/en",
    dateLocale: "en-GB",
    ogLocale: "en_US",
  },
} as const satisfies Record<string, LocaleDefinition>;

export type Locale = keyof typeof locales;
export const defaultLocale: Locale = "ru";
export const localeCodes = Object.keys(locales) as [Locale, ...Locale[]];

export function getTextDirection(languageTag: string): TextDirection {
  let locale: Intl.Locale;
  try {
    locale = new Intl.Locale(languageTag.replaceAll("_", "-"));
  } catch {
    return "ltr";
  }
  const script = locale.script?.toLowerCase();
  const rtlScripts = [
    "arab",
    "hebr",
    "thaa",
    "syrc",
    "nkoo",
    "adlm",
    "rohg",
    "mand",
    "samr",
  ];
  if (script) return rtlScripts.includes(script) ? "rtl" : "ltr";
  return ["ar", "he", "fa", "ur", "ps", "dv", "yi", "syr"].includes(
    locale.language,
  )
    ? "rtl"
    : "ltr";
}
