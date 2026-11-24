import type { Locale } from "./locales";

export interface SeoMetadata {
  title?: string;
  description?: string;
}

type StaticPage = "/" | "/about" | "/log" | "/projects";

export const pageSeo: Partial<
  Record<Locale, Partial<Record<StaticPage, SeoMetadata>>>
> = {};
