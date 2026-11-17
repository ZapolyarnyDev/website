import {
  defaultLocale,
  locales,
  type Locale,
  type LocaleDefinition,
} from "./locales.ts";
import { arabic } from "./translations/ar.ts";
import { hebrew } from "./translations/he.ts";
export type { Locale } from "./locales.ts";

export function getLocale(pathname: string): Locale {
  return (
    (Object.entries(locales).find(
      ([, definition]) =>
        definition.prefix &&
        (pathname === definition.prefix ||
          pathname.startsWith(`${definition.prefix}/`)),
    )?.[0] as Locale | undefined) ?? defaultLocale
  );
}

export function localizedPath(
  pathname: string,
  locale: Locale,
  definitions: Record<string, LocaleDefinition> = locales,
): string {
  const prefix =
    Object.values(definitions).find(
      (definition) =>
        definition.prefix &&
        (pathname === definition.prefix ||
          pathname.startsWith(`${definition.prefix}/`)),
    )?.prefix ?? "";
  const path = pathname.slice(prefix.length) || "/";
  return `${definitions[locale].prefix}${path}`;
}

export function contentSlug(id: string): string {
  const [prefix, ...segments] = id.split("/");
  return Object.hasOwn(locales, prefix) && segments.length
    ? segments.join("/")
    : id;
}

export function detectLocale(languages: readonly string[]): Locale {
  const russianLanguages = new Set([
    "ru",
    "be",
    "uk",
    "kk",
    "ky",
    "uz",
    "tg",
    "tk",
    "hy",
    "az",
    "mo",
    "ka",
  ]);
  const russianRegions = new Set([
    "RU",
    "BY",
    "UA",
    "KZ",
    "KG",
    "UZ",
    "TJ",
    "TM",
    "AM",
    "AZ",
    "MD",
    "GE",
  ]);
  const primary = languages.find((language) => language.trim());
  if (!primary) return "en";
  const parts = primary.trim().replaceAll("_", "-").split("-");
  const language = parts[0].toLowerCase();
  if (language === "ar") return "ar";
  if (language === "he" || language === "iw") return "he";
  const region = parts.slice(1).find((part) => /^[a-z]{2}$/i.test(part));
  return russianLanguages.has(language) ||
    (region && russianRegions.has(region.toUpperCase()))
    ? "ru"
    : "en";
}

const english: Record<string, string> = {
  Devlog: "Devlog",
  "Open source": "Open source",
  "ZapolyarnyDev — журнал": "ZapolyarnyDev — journal",
  "Заметки о разработке, лабораторные записи, кейсы и эссе.":
    "Development notes, lab entries, case studies and essays.",
  "Выбрать язык": "Choose language",
  Новее: "Newer",
  Раньше: "Older",
  "@zapolyarny — исследователь и разработчик":
    "@zapolyarny — researcher and developer",
  "Личный сайт Павла, также известного как zapolyarny: Minecraft-инфраструктура, JVM-бэкенд, исследования.":
    "Personal website of Pavel, also known as zapolyarny: Minecraft infrastructure, JVM backend, research.",
  "Павел, также известный как zapolyarny: исследователь и разработчик. Minecraft-инфраструктура, JVM-бэкенд, исследования.":
    "Pavel, also known as zapolyarny: researcher and developer. Minecraft infrastructure, JVM backend, research.",
  "Павел, также известный как zapolyarny: разработчик с исследовательским складом ума.":
    "Pavel, also known as zapolyarny: a developer with a research mindset.",
  "@zapolyarny — журнал": "@zapolyarny — journal",
  Журнал: "Journal",
  Портфолио: "Portfolio",
  "Обо мне": "About me",
  Меню: "Menu",
  "Основная навигация": "Main navigation",
  Контакты: "Contacts",
  "Открыт к работе": "Open to work",
  "Одобрено моей кошкой": "Approved by my cat",
  "Minecraft-инфраструктура": "Minecraft infrastructure",
  "Прокси на Velocity, сетевой протокол, плагины и игровые режимы. Отсюда ProxyVirtualizer: виртуальные серверы прямо внутри прокси.":
    "Velocity proxies, the network protocol, plugins and game modes. This led to ProxyVirtualizer: virtual servers right inside the proxy.",
  "JVM-бэкенд": "JVM backend",
  "Java и Kotlin, Spring, PostgreSQL, Redis, Kafka, Docker. Делаю сервисы, которые понятно читать и удобно поддерживать.":
    "Java and Kotlin, Spring, PostgreSQL, Redis, Kafka, Docker. I build services that are easy to read and maintain.",
  Исследования: "Research",
  "Neuroacoustic Resonator — поле связанных осцилляторов, которое отвечает на живой звук. Учу математику и иду в ИИ.":
    "Neuroacoustic Resonator is a field of coupled oscillators that responds to live sound. I'm studying mathematics and moving into AI.",
  "Читаю и правлю код Paper, OpenTelemetry и Nix. Свой NixOS собран декларативно и лежит на GitHub.":
    "I read and contribute to the code of Paper, OpenTelemetry and Nix. My NixOS setup is built declaratively and is on GitHub.",
  Языки: "Languages",
  Бэкенд: "Backend",
  Данные: "Data",
  Тесты: "Testing",
  Фронтенд: "Frontend",
  "сетевой протокол": "network protocol",
  Инфраструктура: "Infrastructure",
  "Обо мне — @zapolyarny": "About me — @zapolyarny",
  "Портрет Павла": "Portrait of Pavel",
  Павел: "Pavel",
  "также известный как zapolyarny <3": "also known as zapolyarny <3",
  "Привет! Я являюсь программистом с 2022 года. В данный момент работаю на игровом проекте Cristalix: автор таких режимов, как":
    "Hi! I've been a programmer since 2022. I currently work on the Cristalix gaming project: I created game modes such as",
  "«Морской бой»": "Battleship",
  и: "and",
  "«Колонисты»": "Colonists",
  ". Имею сильные навыки в областях фронтенд- и бэкенд-разработки, имею опыт автоматизации выгрузки приложений.":
    ". I have strong frontend and backend development skills and experience automating application deployment.",
  "Но ограничен не только работой! В последнее время активно изучаю:":
    "But there's more to my life than work! Lately, I've been actively studying:",
  "матанализ;": "calculus;",
  "линейную алгебру;": "linear algebra;",
  "обучение LLM и инфраструктуру вокруг них.":
    "LLM training and the infrastructure around it.",
  "А ещё я обладатель самой классной кошки на всём белом свете! (Соня, привет!)":
    "I also have the coolest cat in the whole world! (Hi, Sonya!)",
  "Сейчас работаю в:": "Currently working at:",
  Стек: "Stack",
  "Чем занимаюсь": "What I do",
  "Исследователь & разработчик": "Researcher & developer",
  "Продуктовая разработка, софт под Minecraft, исследования с ИИ, звуком":
    "Product development, Minecraft software, research with AI and sound",
  Проекты: "Projects",
  "Все проекты": "All projects",
  "Последние записи": "Latest entries",
  "Весь журнал": "Full journal",
  "Принятые PR": "Merged PRs",
  "Все на GitHub": "All on GitHub",
  "← Журнал": "← Journal",
  "мин чтения": "min read",
  Оглавление: "Contents",
  Обновлено: "Updated",
  "Другие записи": "Other entries",
  "← Новее": "← Newer",
  "Раньше →": "Older →",
  "Журнал — @zapolyarny": "Journal — @zapolyarny",
  "Статьи, лабораторные записи и кейсы: как я разбираюсь в системах и что из этого выходит.":
    "Articles, lab notes and case studies: how I explore systems and what comes of it.",
  "Записей:": "Entries:",
  год: "year",
  "Портфолио — @zapolyarny": "Portfolio — @zapolyarny",
  "Проекты: Minecraft-инфраструктура, исследования, бэкенд и коммерческая работа.":
    "Projects: Minecraft infrastructure, research, backend and commercial work.",
  "← Портфолио": "← Portfolio",
  Репозиторий: "Repository",
  "О проекте": "About the project",
  Статус: "Status",
  "Записей в журнале": "Journal entries",
  "Записи по проекту": "Project entries",
  Лаборатория: "Lab",
  Эссе: "Essay",
  Заметка: "Note",
  Кейс: "Case study",
  "В работе": "In progress",
  "Закрытая работа": "Closed-source work",
  Завершён: "Completed",
  "На паузе": "On hold",
};

export const translations: Record<
  Exclude<Locale, "ru">,
  Record<string, string>
> = {
  en: english,
  ar: arabic,
  he: hebrew,
};

export function translator(locale: Locale) {
  return (text: string): string =>
    locale === "ru" ? text : (translations[locale][text] ?? text);
}
