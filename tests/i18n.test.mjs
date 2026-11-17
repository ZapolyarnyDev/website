import assert from "node:assert/strict";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import { detectLocale, getLocale, localizedPath } from "../src/lib/i18n.ts";
import { initializeLanguage } from "../src/lib/language-init.ts";

test("uses the primary browser locale, including CIS regions and language-only locales", () => {
  for (const language of [
    "ru-RU",
    "be-BY",
    "kk-KZ",
    "uz-Latn-UZ",
    "ro-MD",
    "en-AM",
    "ru",
    "ru-DE",
    "hy",
    " ru_RU ",
  ]) {
    assert.equal(detectLocale([language]), "ru", language);
  }
  for (const language of ["en-US", "fr-FR", "de", "ro-RO", "es-419"]) {
    assert.equal(detectLocale([language]), "en", language);
  }
  assert.equal(detectLocale(["en-US", "ru-RU"]), "en");
  assert.equal(detectLocale(["kk-KZ", "en-US"]), "ru");
  assert.equal(detectLocale([]), "en");
});

test("switches the locale without changing a page's identity", () => {
  for (const route of [
    "/",
    "/about",
    "/log/colonist/",
    "/projects/proxyvirtualizer",
    "/rss.xml",
  ]) {
    const english = localizedPath(route, "en");
    assert.equal(getLocale(english), "en");
    assert.equal(localizedPath(english, "ru"), route);
    assert.equal(localizedPath(english, "en"), english);
  }
  assert.equal(getLocale("/engineering"), "ru");
});

function visit({
  language = "en-US",
  saved = null,
  pathname = "/log/colonist/",
  search = "",
  hash = "",
  blocked = false,
} = {}) {
  let redirected;
  const classes = new Set();
  runInNewContext(
    `(${initializeLanguage.toString()})(${detectLocale.toString()}, ${localizedPath.toString()})`,
    {
      URLSearchParams,
      document: {
        documentElement: {
          lang: getLocale(pathname),
          classList: { add: (value) => classes.add(value) },
        },
      },
      navigator: { language, languages: [language, "ru-RU"] },
      location: {
        pathname,
        search,
        hash,
        replace: (value) => {
          redirected = value;
        },
      },
      localStorage: {
        getItem: () => {
          if (blocked) throw new Error("Storage disabled");
          return saved;
        },
      },
    },
  );
  assert.ok(classes.has("js"));
  return redirected;
}

test("initial navigation preserves the deep link, query and fragment", () => {
  assert.equal(
    visit({ search: "?from=profile", hash: "#task" }),
    "/en/log/colonist/?from=profile#task",
  );
  assert.equal(visit({ language: "kk-KZ" }), undefined);
  assert.equal(visit({ pathname: "/en/log/colonist/" }), undefined);
});

test("manual choice overrides browser detection and survives reloads", () => {
  assert.equal(visit({ saved: "ru" }), undefined);
  assert.equal(visit({ language: "ru-RU", saved: "en" }), "/en/log/colonist/");
  assert.equal(visit({ pathname: "/en/about", saved: "ru" }), "/about");
  assert.equal(visit({ saved: "invalid" }), "/en/log/colonist/");
});

test("works when browser storage is disabled", () => {
  assert.equal(visit({ blocked: true }), "/en/log/colonist/");
  assert.equal(visit({ blocked: true, search: "?lang=ru" }), undefined);
});
