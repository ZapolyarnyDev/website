import { getCollection, type CollectionEntry } from "astro:content";

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

export async function getLog(): Promise<LogEntry[]> {
  const entries = await getCollection("log", ({ data }) => !data.draft);

  return entries.sort(
    (a, b) =>
      b.data.date.getTime() - a.data.date.getTime() || a.id.localeCompare(b.id),
  );
}

export async function getProjects(): Promise<Project[]> {
  const projects = await getCollection("projects");

  return projects.sort((a, b) => a.data.order - b.data.order);
}

export async function getProjectLog(projectId: string): Promise<LogEntry[]> {
  const entries = await getLog();

  return entries.filter((entry) => entry.data.project?.id === projectId);
}

export function logHref(entry: LogEntry): string {
  return `/log/${entry.id}`;
}

export function projectHref(project: Project): string {
  return `/projects/${project.id}`;
}

const dateFormat = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function formatDate(date: Date): string {
  return dateFormat.format(date);
}

export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
