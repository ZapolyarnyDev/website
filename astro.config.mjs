import { defineConfig } from "astro/config";

import mdx from "@astrojs/mdx";

import sitemap from "@astrojs/sitemap";

const legacyLogPaths = {
  "/blog/how-this-site-was-made": "how-this-site-was-made",
  "/blog/how-to-learn-programming-as-programmer":
    "how-to-learn-programming-as-programmer",
  "/portfolio/cristalix/battleship": "battleship",
  "/portfolio/cristalix/colonist": "colonist",
  "/research/neuroacoustic-resonator/01-what-is-neuroacoustic-resonator":
    "01-what-is-neuroacoustic-resonator",
  "/research/neuroacoustic-resonator/02-audio-input-and-regions":
    "02-audio-input-and-regions",
  "/research/neuroacoustic-resonator/03-response-metrics-and-memory":
    "03-response-metrics-and-memory",
};

const redirects = {
  "/blog": "/log",
  "/research": "/log",
  "/portfolio": "/projects",
  "/portfolio/archive": "/projects",
  "/portfolio/cristalix": "/projects/cristalix",
  "/portfolio/proxyvirtualizer": "/projects/proxyvirtualizer",
  "/portfolio/medical-appointment": "/projects/medical-appointment",
  "/research/neuroacoustic-resonator": "/projects/neuroacoustic-resonator",
  ...Object.fromEntries(
    Object.entries(legacyLogPaths).map(([from, slug]) => [
      from,
      `/log/${slug}`,
    ]),
  ),
};

export default defineConfig({
  site: "https://zapolyarnydev.ru",
  integrations: [mdx(), sitemap()],
  redirects,
  vite: {
    build: {
      target: ["chrome107", "edge107", "firefox104", "safari16"],
      cssTarget: ["chrome107", "edge107", "firefox104", "safari16"],
    },
  },
});
