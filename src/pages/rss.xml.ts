import rss from "@astrojs/rss";
import type { APIContext } from "astro";

import { getLog, logHref } from "@/lib/content";

export async function GET(context: APIContext) {
  const entries = await getLog();

  return rss({
    title: "ZapolyarnyDev — журнал",
    description: "Заметки о разработке, лабораторные записи, кейсы и эссе.",
    site: context.site ?? "https://zapolyarnydev.ru",
    items: entries.map((entry) => ({
      title: entry.data.title,
      description: entry.data.description,
      pubDate: entry.data.date,
      link: logHref(entry),
      categories: entry.data.tags,
    })),
    customData: "<language>ru</language>",
  });
}
