import assert from "node:assert/strict";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import { readdirSync, readFileSync } from "node:fs";
import {
  contentSlug,
  detectLocale,
  getLocale,
  localizedPath,
  translations,
} from "../src/lib/i18n.ts";
import {
  defaultLocale,
  locales,
  localeCodes,
  getTextDirection,
} from "../src/lib/locales.ts";
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
  definitions = locales,
} = {}) {
  let redirected;
  const classes = new Set();
  runInNewContext(
    `(${initializeLanguage.toString()})(${detectLocale.toString()}, ${localizedPath.toString()}, ${JSON.stringify(definitions)}, ${JSON.stringify(defaultLocale)})`,
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

test("recognizes enabled RTL languages, legacy Hebrew locales and explicit script direction", () => {
  for (const tag of [
    "ar",
    "ar-SA",
    "ar-u-nu-latn",
    "he-IL",
    "iw-IL",
    "fa",
    "ur",
    "az-Arab",
    "ku_Arab",
  ]) {
    assert.equal(getTextDirection(tag), "rtl", tag);
  }
  for (const tag of ["ru", "en", "ar-Latn", "az-Latn", "unknown"]) {
    assert.equal(getTextDirection(tag), "ltr", tag);
  }
  assert.deepEqual(localeCodes, ["ru", "en", "ar", "he"]);
  assert.equal(detectLocale(["ar-SA"]), "ar");
  assert.equal(detectLocale(["he-IL"]), "he");
  assert.equal(detectLocale(["iw-IL"]), "he");
  assert.equal(detectLocale(["ar-KZ"]), "ar");
  assert.equal(detectLocale(["ru-IL"]), "ru");
  assert.equal(visit({ saved: "ar" }), "/ar/log/colonist/");
  assert.equal(visit({ saved: "he" }), "/he/log/colonist/");
  assert.equal(visit({ language: "ar-SA" }), "/ar/log/colonist/");
  assert.equal(visit({ language: "he-IL" }), "/he/log/colonist/");
  assert.equal(contentSlug("en/colonist"), "colonist");
  assert.equal(contentSlug("ar/colonist"), "colonist");
  assert.equal(contentSlug("he/colonist"), "colonist");
});

test("all languages share page identities and retain their configured direction", () => {
  for (const locale of localeCodes) {
    const path = localizedPath("/en/log/colonist/", locale);
    assert.equal(getLocale(path), locale);
    assert.equal(localizedPath(path, "en"), "/en/log/colonist/");
    assert.equal(locales[locale].direction, getTextDirection(locale));
    assert.equal(
      new Intl.DateTimeFormat(locales[locale].dateLocale).resolvedOptions()
        .calendar,
      "gregory",
    );
  }
});

test("Arabic and Hebrew UI dictionaries cover every English translation", () => {
  const keys = Object.keys(translations.en).sort();
  for (const locale of ["ar", "he"]) {
    assert.deepEqual(Object.keys(translations[locale]).sort(), keys, locale);
    for (const text of Object.values(translations[locale]))
      assert.ok(text.trim());
  }
});

test("translated content retains entries, structure, examples and language-specific project references", () => {
  const read = (url) => readFileSync(url, "utf8");
  const blocks = (text) =>
    [...text.matchAll(/```[^\n]*\n([\s\S]*?)```/g)].map((match) =>
      match[1].replace(/^\s*\/\/.*$/gm, "").trim(),
    );
  for (const collection of ["log", "projects"]) {
    const base = new URL(`../content/${collection}/en/`, import.meta.url);
    const files = readdirSync(base)
      .filter((file) => file.endsWith(".mdx"))
      .sort();
    for (const locale of ["ar", "he"]) {
      const translatedBase = new URL(
        `../content/${collection}/${locale}/`,
        import.meta.url,
      );
      assert.deepEqual(
        readdirSync(translatedBase)
          .filter((file) => file.endsWith(".mdx"))
          .sort(),
        files,
      );
      for (const file of files) {
        const source = read(new URL(file, base));
        const translated = read(new URL(file, translatedBase));
        assert.match(translated, new RegExp(`^lang: ${locale}$`, "m"));
        assert.doesNotMatch(translated, /[А-Яа-яЁё]/u, `${locale}/${file}`);
        for (const pattern of [/^#{2,3} /gm, /^- /gm, /^\d+\. /gm]) {
          assert.equal(
            [...translated.matchAll(pattern)].length,
            [...source.matchAll(pattern)].length,
            `${locale}/${file} structure`,
          );
        }
        assert.deepEqual(
          blocks(translated),
          blocks(source),
          `${locale}/${file} code examples`,
        );
        const project = source.match(/^project: en\/(.+)$/m)?.[1];
        if (project)
          assert.match(
            translated,
            new RegExp(`^project: ${locale}/${project}$`, "m"),
          );
        const sourceDate = source.match(/^date: (.+)$/m)?.[1];
        if (sourceDate)
          assert.match(translated, new RegExp(`^date: ${sourceDate}$`, "m"));
      }
    }
  }
});
