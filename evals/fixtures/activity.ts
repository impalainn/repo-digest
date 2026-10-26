import type { ToolStub } from "eve/evals";

import type { RepoActivity } from "../../agent/lib/github";

// A fixed fake week for acme/widgets, so evals can assert exact numbers.
export const fakeWeek: RepoActivity = {
  repo: "acme/widgets",
  since: "2026-10-19T00:00:00Z",
  until: "2026-10-26T00:00:00Z",
  mergedPullRequests: [
    {
      number: 101,
      title: "feat!: rename Widget.spin() to Widget.rotate()",
      url: "https://github.com/acme/widgets/pull/101",
      author: "alice",
      isBot: false,
      labels: ["breaking"],
      mergedAt: "2026-10-24T10:00:00Z",
    },
    {
      number: 102,
      title: "fix: crash when a widget has no color",
      url: "https://github.com/acme/widgets/pull/102",
      author: "bob",
      isBot: false,
      labels: ["bug"],
      mergedAt: "2026-10-23T10:00:00Z",
    },
    {
      number: 103,
      title: "docs: add rotation guide",
      url: "https://github.com/acme/widgets/pull/103",
      author: "alice",
      isBot: false,
      labels: ["docs"],
      mergedAt: "2026-10-22T10:00:00Z",
    },
    {
      number: 104,
      title: "chore(deps): bump zod from 4.5.3 to 4.5.4",
      url: "https://github.com/acme/widgets/pull/104",
      author: "dependabot[bot]",
      isBot: true,
      labels: ["dependencies"],
      mergedAt: "2026-10-21T10:00:00Z",
    },
    {
      number: 105,
      title: "Version Packages",
      url: "https://github.com/acme/widgets/pull/105",
      author: "github-actions[bot]",
      isBot: true,
      labels: [],
      mergedAt: "2026-10-24T12:00:00Z",
    },
  ],
  openedIssues: [
    {
      number: 201,
      title: "Regression: rotate() ignores the speed option",
      url: "https://github.com/acme/widgets/issues/201",
      author: "carol",
      labels: ["bug", "regression"],
      reactions: 12,
      comments: 4,
    },
    {
      number: 202,
      title: "Question about widget sizes",
      url: "https://github.com/acme/widgets/issues/202",
      author: "dave",
      labels: ["question"],
      reactions: 0,
      comments: 1,
    },
  ],
  openedIssueCount: 2,
  closedIssueCount: 5,
  releases: [
    {
      tag: "v2.0.0",
      name: "v2.0.0",
      url: "https://github.com/acme/widgets/releases/tag/v2.0.0",
      publishedAt: "2026-10-24T12:30:00Z",
      notes: "Breaking: Widget.spin() is now Widget.rotate(). Fixes a crash for colorless widgets.",
    },
  ],
  truncated: false,
};

export const quietWeek: RepoActivity = {
  ...fakeWeek,
  mergedPullRequests: [],
  openedIssues: [],
  openedIssueCount: 0,
  closedIssueCount: 0,
  releases: [],
};

// Stub responses are plain JSON, so round-trip the typed fixture into one.
export const activityStub = (activity: RepoActivity): ToolStub => ({
  id: "activity",
  tool: "get_repo_activity",
  outcome: { response: JSON.parse(JSON.stringify(activity)) },
});

export const notFoundStub = {
  id: "activity-not-found",
  tool: "get_repo_activity",
  outcome: { throw: { message: "Repository not found. Check the owner/name spelling." } },
} satisfies ToolStub;

export const saveStub = {
  id: "save",
  tool: "save_digest",
  outcome: { response: { saved: "digests/acme-widgets/2026-10-26.md" } },
} satisfies ToolStub;

export const ASK = "Write a digest for acme/widgets for the last 7 days.";
