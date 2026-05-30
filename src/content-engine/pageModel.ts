import { loadEntries, loadGroups, loadSections } from "./loadContent";
import type {
  ContentArea,
  ContentEntry,
  ContentGroup,
  ContentPageModel,
  ContentSection,
  ContentSectionModel,
} from "./types";

export function getContentPageModel(area: ContentArea): ContentPageModel {
  const sections = loadSections(area);
  const groups = loadGroups(area);
  const entries = loadEntries(area);

  const sectionModels = sections.map((section) =>
    createSectionModel(section, groups, entries),
  );

  const sectionIds = new Set(sections.map((section) => section.id));

  const unsectionedEntries = entries.filter(
    (entry) => !sectionIds.has(entry.meta.sectionId),
  );

  return {
    area,
    sections: sectionModels,
    unsectionedEntries,
  };
}

function createSectionModel(
  section: ContentSection,
  groups: ContentGroup[],
  entries: ContentEntry[],
): ContentSectionModel {
  const sectionGroups = groups
    .filter((group) => group.sectionId === section.id)
    .sort((a, b) => a.order - b.order);

  const groupIds = new Set(sectionGroups.map((group) => group.id));

  const groupModels = sectionGroups.map((group) => ({
    group,
    entries: entries
      .filter((entry) => entry.meta.groupId === group.id)
      .sort(sortEntries),
  }));

  const directEntries = entries
    .filter((entry) => entry.meta.sectionId === section.id)
    .filter((entry) => !entry.meta.groupId || !groupIds.has(entry.meta.groupId))
    .sort(sortEntries);

  return {
    section,
    groups: groupModels,
    entries: directEntries,
  };
}

function sortEntries(a: ContentEntry, b: ContentEntry): number {
  const orderDiff = (a.meta.order ?? 999) - (b.meta.order ?? 999);

  if (orderDiff !== 0) {
    return orderDiff;
  }

  if (a.meta.date && b.meta.date) {
    return b.meta.date.localeCompare(a.meta.date);
  }

  return 0;
}
