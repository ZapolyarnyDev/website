import type { APIContext } from "astro";
import { getFeed } from "@/lib/rss";

export const GET = (context: APIContext) => getFeed(context, "en");
