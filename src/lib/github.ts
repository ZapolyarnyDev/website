export const GITHUB_USER = "ZapolyarnyDev";

const EXCLUDED_OWNERS = [GITHUB_USER, "KittensWithBugs", "IsMirakl"];

export interface MergedPullRequest {
  repo: string;
  number: number;
  title: string;
  url: string;
  mergedAt: Date;
}

interface SearchItem {
  number: number;
  title: string;
  html_url: string;
  repository_url: string;
  pull_request?: { merged_at: string | null };
}

const query = [
  `author:${GITHUB_USER}`,
  "is:pr",
  "is:merged",
  ...EXCLUDED_OWNERS.map((owner) => `-user:${owner}`),
].join(" ");

export const mergedPullRequestsUrl = `https://github.com/pulls?${new URLSearchParams(
  { q: query },
)}`;

async function fetchMergedPullRequests(): Promise<MergedPullRequest[]> {
  const url = `https://api.github.com/search/issues?${new URLSearchParams({
    q: query,
    sort: "updated",
    order: "desc",
    per_page: "100",
  })}`;

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "zapolyarnydev-website",
  };
  const token = import.meta.env.GITHUB_TOKEN as string | undefined;
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      console.warn(
        `[github] merged PRs request failed: ${response.status} ${response.statusText}`,
      );
      return [];
    }

    const { items } = (await response.json()) as { items: SearchItem[] };

    return items
      .filter((item) => item.pull_request?.merged_at)
      .map((item) => ({
        repo: item.repository_url.replace("https://api.github.com/repos/", ""),
        number: item.number,
        title: item.title,
        url: item.html_url,
        mergedAt: new Date(item.pull_request?.merged_at ?? 0),
      }))
      .sort((a, b) => b.mergedAt.getTime() - a.mergedAt.getTime());
  } catch (error) {
    console.warn("[github] merged PRs request failed:", error);
    return [];
  }
}

let cached: Promise<MergedPullRequest[]> | undefined;

export function getMergedPullRequests(): Promise<MergedPullRequest[]> {
  cached ??= fetchMergedPullRequests();
  return cached;
}
