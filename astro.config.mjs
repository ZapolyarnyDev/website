import { defineConfig } from "astro/config";

import mdx from "@astrojs/mdx";

import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://zapolyarnydev.ru",
  integrations: [mdx(), sitemap()],
  vite: {
    build: {
      target: ["chrome107", "edge107", "firefox104", "safari16"],
      cssTarget: ["chrome107", "edge107", "firefox104", "safari16"],
    },
  },
});
