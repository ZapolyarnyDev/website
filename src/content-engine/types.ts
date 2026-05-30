export type ContentArea = "blog" | "research" | "portfolio";

export type ContentEntryKind = "article" | "note" | "case" | "project";

export interface ContentSection {
  id: string;
  title: string;
  description?: string;
  order: number;
}

export interface ContentGroup {
  id: string;
  sectionId: string;
  title: string;
  description?: string;
  order: number;
}

export interface ContentEntryMeta {
  title: string;
  description: string;
  sectionId: string;
  kind: ContentEntryKind;

  groupId?: string;
  order?: number;
  date?: string;
  tags?: string[];
  featured?: boolean;
  draft?: boolean;
}

export interface ContentEntry {
  id: string;
  area: ContentArea;
  slug: string;
  path: string;
  meta: ContentEntryMeta;
}

export interface ContentSectionModel {
  section: ContentSection;
  groups: ContentGroupModel[];
  entries: ContentEntry[];
}

export interface ContentGroupModel {
  group: ContentGroup;
  entries: ContentEntry[];
}

export interface ContentPageModel {
  area: ContentArea;
  sections: ContentSectionModel[];
  unsectionedEntries: ContentEntry[];
}
