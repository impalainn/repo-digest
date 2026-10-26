// Read-only GitHub REST helpers for the weekly digest.
// Works without a token for public repos (60 requests/hour); - will add token to raise limits later

const API = "https://api.github.com";
const PER_PAGE = 100;
const MAX_PAGES = 3;
const MAX_RELEASE_NOTES = 1500;

export interface PullRequestSummary {
  number: number;
  title: string;
  url: string;
  author: string;
  isBot: boolean;
  labels: string[];
  mergedAt: string;
}

export interface IssueSummary {
  number: number;
  title: string;
  url: string;
  author: string;
  labels: string[];
  reactions: number;
  comments: number;
}

export interface ReleaseSummary {
  tag: string;
  name: string;
  url: string;
  publishedAt: string;
  notes: string;
}

export interface RepoActivity {
  repo: string;
  since: string;
  until: string;
  mergedPullRequests: PullRequestSummary[];
  // Up to 100 most recent; openedIssueCount is the exact total.
  openedIssues: IssueSummary[];
  openedIssueCount: number;
  closedIssueCount: number;
  releases: ReleaseSummary[];
  truncated: boolean;
}

export class GitHubError extends Error {}

async function gh<T>(path: string): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "repo-digest-agent",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  const res = await fetch(`${API}${path}`, { headers });
  if (res.status === 404) throw new GitHubError("Repository not found. Check the owner/name spelling.");
  if (res.status === 403 || res.status === 429) {
    throw new GitHubError("GitHub rate limit reached. Set GITHUB_TOKEN in .env.local and try again.");
  }
  if (!res.ok) throw new GitHubError(`GitHub API error ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

// Fetch up to MAX_PAGES pages, stopping early once `done` says the rest is outside the window.
async function ghPages(path: string, done: (page: any[]) => boolean): Promise<any[]> {
  const items: any[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const batch = await gh<any[]>(`${path}&per_page=${PER_PAGE}&page=${page}`);
    items.push(...batch);
    if (batch.length < PER_PAGE || done(batch)) break;
  }
  return items;
}

interface SearchResult {
  total_count: number;
  items: any[];
}

// The search API filters to real issues (the issues endpoint mixes in pull requests) and returns exact totals.
const searchIssues = (repo: string, qualifier: string, perPage: number) =>
  gh<SearchResult>(
    `/search/issues?q=${encodeURIComponent(`repo:${repo} is:issue ${qualifier}`)}&sort=created&order=desc&per_page=${perPage}`,
  );

const isBot = (login: string, type?: string) => type === "Bot" || login.endsWith("[bot]");

export async function getRepoActivity(repo: string, days: number): Promise<RepoActivity> {
  const until = new Date();
  const since = new Date(until.getTime() - days * 24 * 60 * 60 * 1000);
  const inWindow = (date: string | null | undefined) => date != null && new Date(date) >= since;

  // Pulls sorted by last update: every PR merged in the window was updated in the window.
  const sinceQualifier = since.toISOString().replace(/\.\d+Z$/, "Z");
  const [pulls, opened, closed, releases] = await Promise.all([
    ghPages(`/repos/${repo}/pulls?state=closed&sort=updated&direction=desc`, (page) => !inWindow(page.at(-1)?.updated_at)),
    searchIssues(repo, `created:>=${sinceQualifier}`, PER_PAGE),
    searchIssues(repo, `closed:>=${sinceQualifier}`, 1),
    gh<any[]>(`/repos/${repo}/releases?per_page=20`),
  ]);

  const mergedPullRequests = pulls
    .filter((pr) => inWindow(pr.merged_at))
    .map((pr) => ({
      number: pr.number,
      title: pr.title,
      url: pr.html_url,
      author: pr.user?.login ?? "unknown",
      isBot: isBot(pr.user?.login ?? "", pr.user?.type),
      labels: (pr.labels ?? []).map((l: any) => l.name),
      mergedAt: pr.merged_at,
    }));

  const openedIssues = opened.items.map((issue) => ({
      number: issue.number,
      title: issue.title,
      url: issue.html_url,
      author: issue.user?.login ?? "unknown",
      labels: (issue.labels ?? []).map((l: any) => l.name),
      reactions: issue.reactions?.total_count ?? 0,
    comments: issue.comments ?? 0,
  }));

  const recentReleases = releases
    .filter((r) => !r.draft && inWindow(r.published_at))
    .map((r) => ({
      tag: r.tag_name,
      name: r.name ?? r.tag_name,
      url: r.html_url,
      publishedAt: r.published_at,
      notes: (r.body ?? "").slice(0, MAX_RELEASE_NOTES),
    }));

  return {
    repo,
    since: since.toISOString(),
    until: until.toISOString(),
    mergedPullRequests,
    openedIssues,
    openedIssueCount: opened.total_count,
    closedIssueCount: closed.total_count,
    releases: recentReleases,
    // Hitting the page cap while still inside the window means older PRs were cut off.
    truncated: pulls.length === PER_PAGE * MAX_PAGES && inWindow(pulls.at(-1)?.updated_at),
  };
}
