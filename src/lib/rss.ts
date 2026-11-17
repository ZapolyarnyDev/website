import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { getLog, logHref } from "./content";
import { translator, type Locale } from "./i18n";

export async function getFeed(context: APIContext, locale: Locale) {
  const entries = await getLog(locale);
  const t = translator(locale);
  return rss({
    title: t("ZapolyarnyDev — журнал"),
    description: t("Заметки о разработке, лабораторные записи, кейсы и эссе."),
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
