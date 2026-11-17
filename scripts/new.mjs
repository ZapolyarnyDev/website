import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const logDir = join(root, "content", "log");
const projectsDir = join(root, "content", "projects");

const usage = `Usage: pnpm new <type> "<title>" [options]

Types: devlog, lab, essay, note, case

Options:
  --project <id>   project from content/projects (required for devlog)
  --lang <ru|en|ar|he>   entry language (default: ru)
  --days <n>       commit window for devlog (default: 7)
  --repo <path>    project repository (default: ../<repo name from project>)
`;

const bodies = {
  devlog: "## Сделано\n\n## Сломалось / узнал\n\n## Дальше\n",
  lab: "## Вопрос\n\n## Что сделал\n\n## Что увидел\n\n## Что дальше\n",
  essay: "",
  note: "",
  case: "## Задача\n\n## Решение\n\n## Результат\n",
};

const englishBodies = {
  devlog: "## Done\n\n## Broke / learned\n\n## Next\n",
  lab: "## Question\n\n## What I did\n\n## What I saw\n\n## What's next\n",
  essay: "",
  note: "",
  case: "## Task\n\n## Solution\n\n## Result\n",
};

const localizedBodies = {
  ru: bodies,
  en: englishBodies,
  ar: {
    devlog: "## ما أُنجز\n\n## ما تعطل / ما تعلّمته\n\n## التالي\n",
    lab: "## السؤال\n\n## ما فعلته\n\n## ما لاحظته\n\n## ما التالي\n",
    essay: "",
    note: "",
    case: "## المهمة\n\n## الحل\n\n## النتيجة\n",
  },
  he: {
    devlog: "## מה נעשה\n\n## מה נשבר / מה למדתי\n\n## בהמשך\n",
    lab: "## השאלה\n\n## מה עשיתי\n\n## מה ראיתי\n\n## מה הלאה\n",
    essay: "",
    note: "",
    case: "## המשימה\n\n## הפתרון\n\n## התוצאה\n",
  },
};

const translit = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

function fail(message) {
  process.stderr.write(`${message}\n\n${usage}`);
  process.exit(1);
}

function slugify(title) {
  return [...title.toLowerCase()]
    .map((char) => translit[char] ?? char)
    .join("")
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

function today() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");

  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function projectRepoPath(projectId) {
  const file = join(projectsDir, `${projectId}.mdx`);

  if (!existsSync(file)) fail(`Unknown project: ${projectId}`);

  const repo = readFileSync(file, "utf8").match(/^repo:\s*(\S+)\s*$/m)?.[1];

  return repo ? resolve(root, "..", basename(repo)) : undefined;
}

function recentCommits(repoPath, days) {
  if (!repoPath || !existsSync(join(repoPath, ".git"))) return null;

  const output = execFileSync(
    "git",
    [
      "log",
      `--since=${days} days ago`,
      "--no-merges",
      "--reverse",
      "--format=%cs %an%x09%s",
    ],
    { cwd: repoPath, encoding: "utf8" },
  );

  return output
    .split("\n")
    .filter(Boolean)
    .map((line) => line.split("\t"))
    .filter(([meta, subject]) => {
      return !meta.includes("dependabot") && !/^(chore\()?deps/.test(subject);
    })
    .map(([meta, subject]) => `${meta.slice(0, 10)} ${subject}`);
}

// One single-line comment per row: Prettier escapes multi-line MDX comments
// into visible text, and lint-staged runs Prettier on every commit.
function mdxComments(lines) {
  return lines
    .map((line) => `{/* ${line.replaceAll("*/", "* /")} */}`)
    .join("\n");
}

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    project: { type: "string" },
    lang: { type: "string", default: "ru" },
    days: { type: "string", default: "7" },
    repo: { type: "string" },
  },
});

const [type, title] = positionals;

if (!type || !title) fail("Type and title are required.");
if (!(type in bodies)) fail(`Unknown type: ${type}`);
if (!Object.hasOwn(localizedBodies, values.lang))
  fail(`Unknown lang: ${values.lang}`);
if (type === "devlog" && !values.project) fail("devlog needs --project.");

const slug = slugify(title);
if (!slug) fail("Title produces an empty slug.");

const languageDir = values.lang === "ru" ? logDir : join(logDir, values.lang);
const relativeFile = `content/log/${values.lang === "ru" ? "" : `${values.lang}/`}${slug}.mdx`;
const file = join(languageDir, `${slug}.mdx`);
if (existsSync(file)) fail(`Already exists: ${relativeFile}`);
const projectId =
  values.project && values.lang !== "ru"
    ? `${values.lang}/${values.project.replace(/^(?:en|ar|he)\//, "")}`
    : values.project;

const frontmatter = [
  "---",
  `title: ${JSON.stringify(title)}`,
  'description: ""',
  `date: ${today()}`,
  `type: ${type}`,
  `lang: ${values.lang}`,
  ...(projectId ? [`project: ${projectId}`] : []),
  "tags: []",
  "draft: true",
  "---",
];

let commitsNote = "";

if (type === "devlog") {
  const repoPath = values.repo
    ? resolve(values.repo)
    : projectRepoPath(projectId);
  const commits = recentCommits(repoPath, Number(values.days));

  if (!repoPath) {
    process.stderr.write(
      `Project ${values.project} has no repo, skipping commits\n`,
    );
  } else if (commits === null) {
    process.stderr.write(`No git repository found at ${repoPath}\n`);
  } else {
    commitsNote = `\n${mdxComments([
      {
        ru: `Коммиты ${values.project} за ${values.days} дн., удалить перед публикацией:`,
        en: `Commits for ${values.project} over ${values.days} days, remove before publishing:`,
        ar: `تعديلات ${values.project} خلال ${values.days} أيام، تُحذف قبل النشر:`,
        he: `קומיטים של ${values.project} במהלך ${values.days} ימים, להסיר לפני הפרסום:`,
      }[values.lang],
      ...(commits.length > 0
        ? commits
        : [
            {
              ru: "нет коммитов",
              en: "no commits",
              ar: "لا توجد تعديلات",
              he: "אין קומיטים",
            }[values.lang],
          ]),
    ])}\n`;
  }
} else if (values.project) {
  projectRepoPath(projectId);
}

mkdirSync(languageDir, { recursive: true });
writeFileSync(
  file,
  `${frontmatter.join("\n")}\n\n${localizedBodies[values.lang][type]}${commitsNote}`,
  "utf8",
);

process.stdout.write(`Created ${relativeFile}\n`);
