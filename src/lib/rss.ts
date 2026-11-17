import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { getLog, logHref } from "./content";
import type { Locale } from "./i18n";

export async function getFeed(context: APIContext, locale: Locale) {
  const entries = await getLog(locale);
  return rss({
    title:
      locale === "ru" ? "ZapolyarnyDev — журнал" : "ZapolyarnyDev — journal",
    description:
      locale === "ru"
        ? "Заметки о разработке, лабораторные записи, кейсы и эссе."
        : "Development notes, lab entries, case studies and essays.",
    site: context.site ?? "https://zapolyarnydev.ru",
    items: entries.map((entry) => ({
      title: entry.data.title,
      description: entry.data.description,
      pubDate: entry.data.date,
      link: logHref(entry),
      categories: entry.data.tags,
    })),
    customData: `<language>${locale}</language>`,
  });
}
