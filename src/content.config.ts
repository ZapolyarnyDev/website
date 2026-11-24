import { defineCollection, reference } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { defaultLocale, localeCodes } from "./lib/locales";

export const LOG_TYPES = ["devlog", "lab", "essay", "note", "case"] as const;
export const PROJECT_STATUSES = [
  "active",
  "closed-work",
  "done",
  "parked",
] as const;

const seo = z
  .strictObject({
    title: z.string().trim().min(1).optional(),
    description: z.string().trim().min(1).optional(),
  })
  .optional();

const log = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./content/log" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    seo,
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    type: z.enum(LOG_TYPES),
    lang: z.enum(localeCodes).default(defaultLocale),
    project: reference("projects").optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./content/projects" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    seo,
    status: z.enum(PROJECT_STATUSES),
    lang: z.enum(localeCodes).default(defaultLocale),
    order: z.number(),
    repo: z.url().optional(),
    url: z.url().optional(),
    stack: z.array(z.string()).default([]),
  }),
});

export const collections = { log, projects };
