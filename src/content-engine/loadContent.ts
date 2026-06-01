import type {
  ContentArea,
  ContentEntry,
  ContentEntryMeta,
  ContentGroup,
  ContentSection,
} from "./types";

const sectionModules = import.meta.glob("../../content/*/_sections.json", {
  eager: true,
  import: "default",
}) as Record<string, ContentSection[]>;

const groupModules = import.meta.glob("../../content/**/_group.json", {
  eager: true,
  import: "default",
}) as Record<string, ContentGroup>;

const entryFrontmatters = import.meta.glob("../../content/**/*.mdx", {
  eager: true,
  import: "frontmatter",
}) as Record<string, ContentEntryMeta>;

export function loadSections(area: ContentArea): ContentSection[] {
  const filePath = `../../content/${area}/_sections.json`;
  const sections = sectionModules[filePath] ?? [];

  return [...sections].sort(byOrder);
}

export function loadGroups(area: ContentArea): ContentGroup[] {
  return Object.entries(groupModules)
    .filter(([path]) => getAreaFromPath(path) === area)
    .map(([, group]) => group)
    .sort(byOrder);
}

export function loadEntries(area: ContentArea): ContentEntry[] {
  return Object.entries(entryFrontmatters)
    .filter(([path]) => getAreaFromPath(path) === area)
    .map(([path, frontmatter]) => {
      const slug = createSlugFromPath(area, path);
      const id = slug.replaceAll("/", "-");

      return {
        id,
        area,
        slug,
        path,
        meta: frontmatter,
      };
    })
    .filter((entry) => !entry.meta.draft)
    .sort((a, b) => byOptionalOrder(a.meta, b.meta));
}

function getAreaFromPath(path: string): ContentArea | null {
  if (path.includes("/content/blog/")) return "blog";
  if (path.includes("/content/research/")) return "research";
  if (path.includes("/content/portfolio/")) return "portfolio";

  return null;
}

function createSlugFromPath(area: ContentArea, path: string): string {
  return path
    .replace(`../../content/${area}/`, "")
    .replace(/\.mdx$/, "")
    .replace(/\/index$/, "");
}

function byOrder(a: { order: number }, b: { order: number }): number {
  return a.order - b.order;
}

function byOptionalOrder(
  a: { order?: number; date?: string },
  b: { order?: number; date?: string },
): number {
  const orderDiff = (a.order ?? 999) - (b.order ?? 999);

  if (orderDiff !== 0) {
    return orderDiff;
  }

  if (a.date && b.date) {
    return b.date.localeCompare(a.date);
  }

  return 0;
}
