import { defineTool } from "eve/tools";
import { z } from "zod";

import { getRepoActivity } from "../lib/github";

export default defineTool({
  description:
    "Fetch a public GitHub repository's merged pull requests, opened and closed issues, and releases for the last N days. Call this once per digest.",
  inputSchema: z.object({
    repo: z
      .string()
      .regex(/^[\w.-]+\/[\w.-]+$/, "Use the owner/name form, such as vercel/eve.")
      .describe("Repository in owner/name form, such as vercel/eve."),
    days: z.number().int().min(1).max(31).default(7).describe("How many days back to look."),
  }),
  label: {
    start: ({ repo, days }) => `Fetch ${days} days of activity for ${repo}`,
  },
  async execute({ repo, days }) {
    return getRepoActivity(repo, days);
  },
});
