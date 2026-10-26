import { defineCollection, reference } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

export const LOG_TYPES = ["devlog", "lab", "essay", "note", "case"] as const;
export const PROJECT_STATUSES = [
  "active",
  "closed-work",
  "done",
  "parked",
] as const;

const log = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./content/log" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    type: z.enum(LOG_TYPES),
    lang: z.enum(["ru", "en"]).default("ru"),
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
    status: z.enum(PROJECT_STATUSES),
    order: z.number(),
    repo: z.url().optional(),
    url: z.url().optional(),
    stack: z.array(z.string()).default([]),
  }),
});

export const collections = { log, projects };
