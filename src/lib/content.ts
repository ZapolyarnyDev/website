import { getCollection, type CollectionEntry } from "astro:content";
import { contentSlug, localizedPath, type Locale } from "./i18n";
import { defaultLocale, locales } from "./locales";

export type LogEntry = CollectionEntry<"log">;
export type Project = CollectionEntry<"projects">;

export const logTypeLabels: Record<LogEntry["data"]["type"], string> = {
  devlog: "Devlog",
  lab: "Лаборатория",
  essay: "Эссе",
  note: "Заметка",
  case: "Кейс",
};

export const projectStatusLabels: Record<Project["data"]["status"], string> = {
  active: "В работе",
  "closed-work": "Закрытая работа",
  done: "Завершён",
  parked: "На паузе",
};

export async function getLog(
  locale: Locale = defaultLocale,
): Promise<LogEntry[]> {
  const entries = await getCollection(
    "log",
    ({ data }) => !data.draft && data.lang === locale,
  );

  return entries.sort(
    (a, b) =>
      b.data.date.getTime() - a.data.date.getTime() || a.id.localeCompare(b.id),
  );
}

export async function getProjects(
  locale: Locale = defaultLocale,
): Promise<Project[]> {
  const projects = await getCollection(
    "projects",
    ({ data }) => data.lang === locale,
  );

  return projects.sort((a, b) => a.data.order - b.data.order);
}

export async function getProjectLog(
  projectId: string,
  locale: Locale = defaultLocale,
): Promise<LogEntry[]> {
  const entries = await getLog(locale);

  return entries.filter((entry) => entry.data.project?.id === projectId);
}

export function logHref(entry: LogEntry): string {
  return localizedPath(`/log/${contentSlug(entry.id)}`, entry.data.lang);
}

export function projectHref(project: Project): string {
  return localizedPath(
    `/projects/${contentSlug(project.id)}`,
    project.data.lang,
  );
}

export function formatDate(date: Date, locale: Locale = defaultLocale): string {
  return new Intl.DateTimeFormat(locales[locale].dateLocale, {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
