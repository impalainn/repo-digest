# repo-digest

An [eve](https://eve.dev) agent that writes a weekly digest of a public GitHub repository: releases, notable merged pull requests, issue activity, and contributors. You can ask it for a digest in chat, and a cron schedule writes one every Monday.

## Example

Excerpt from a digest of `vercel/eve` for 2026-10-19 to 2026-10-26:

```markdown
## Highlights
- **Breaking:** Replaced individual numerical token limits with a single, unified
  `limits.sessionUsage` function ([#5028](https://github.com/vercel/eve/pull/5028)).
- **Channels & Templates:** Added Discord integration with message relays and templates
  ([#4934](https://github.com/vercel/eve/pull/4934), [#5030](https://github.com/vercel/eve/pull/5030), ...).
```

All 31 PR links, 3 issue links, 6 releases, and 14 contributors in that digest were checked against the GitHub API.

## How it works

| File | Role |
| --- | --- |
| `agent/instructions.md` | Workflow, digest format, and rules (only use tool data, mark breaking changes, leave bots out of Contributors) |
| `agent/tools/get_repo_activity.ts` | Fetches merged PRs, opened/closed issues, and releases for the last N days |
| `agent/lib/github.ts` | Read-only GitHub REST client used by the tool |
| `agent/tools/save_digest.ts` | Writes the digest to `digests/<owner>-<name>/<YYYY-MM-DD>.md` |
| `agent/schedules/weekly-digest.md` | Runs every Monday at 15:00 UTC for `vercel/eve` and saves the result |
| `evals/` | Behavior tests that use fixed GitHub data |

Data sources:

- **Merged PRs**: `GET /repos/{repo}/pulls`, sorted by last update, up to 3 pages, stopping once results leave the window.
- **Issues**: the search API (`is:issue created:>=` / `closed:>=`). It excludes pull requests and returns exact totals. The `/issues` endpoint mixes in PRs: on `vercel/eve`, 253 of 300 results were PRs, which undercounted closed issues (18 instead of 57).
- **Releases**: `GET /repos/{repo}/releases`, filtered to the window. Release notes are cut to 1,500 characters.

## Setup

Requires Node.js 24+ and pnpm.

```bash
pnpm install
```

Model access goes through [Vercel AI Gateway](https://vercel.com/docs/ai-gateway). The agent uses `google/gemini-3.5-flash`, set in `agent/agent.ts`, which needs paid Gateway credits. Free-tier accounts can only use a subset of models. On first run, `eve dev` opens `/login` to connect a credential.

Optional: GitHub allows 60 unauthenticated requests per hour, and one digest uses up to 6. To raise the limit, add a read-only token to `.env.local`:

```
GITHUB_TOKEN=github_pat_...
```

## Usage

Chat with the agent:

```bash
pnpm dev
```

```
Write a digest for vercel/eve for the last 7 days
```

`eve dev` does not fire schedules on their cron. To trigger the weekly schedule once, keep the dev server running and run:

```bash
curl -X POST http://localhost:2000/eve/v1/dev/schedules/weekly-digest
```

The digest is written to `digests/vercel-eve/<date>.md`.

## Evals

```bash
pnpm eval
```

Each eval stubs `get_repo_activity` with a fixed week for a fake repository (`evals/fixtures/activity.ts`), so assertions can check exact values.

| Eval | Checks |
| --- | --- |
| `digest/basic` | One tool call; every release, PR, and issue count appears; breaking change marked |
| `digest/no-invented-numbers` | Every `#number` and GitHub link exists in the tool output |
| `digest/bots` | Contributors names human authors only |
| `digest/quiet-week` | An empty week gets a short reply with no sections |
| `digest/repo-not-found` | A failed lookup is explained; no digest, nothing saved |
| `digest/scheduled-save` | The schedule prompt fetches, then calls `save_digest` with the digest |

Latest run: 12/12 passed (`--repeat 2`, 42 gates), on `google/gemini-3.5-flash`.

Tool stubs require explicit permission. `agent/channels/eve.ts` grants `allowToolStubs` to local callers only, which applies under `eve dev` and `eve eval` and never in production.

## Limitations

- Public repositories only. The agent reads GitHub and never writes to it.
- `save_digest` writes to the local filesystem, which does not persist on Vercel. A deployed schedule needs another delivery target, such as a GitHub issue or a webhook.
- In very busy repositories, PRs past 300 recently closed ones are dropped. The digest notes this when it happens.
- Vercel Cron evaluates the schedule in UTC.
