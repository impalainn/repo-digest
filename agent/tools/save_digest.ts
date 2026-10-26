import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { defineTool } from "eve/tools";
import { z } from "zod";

// Digests land in digests/<owner>-<name>/<YYYY-MM-DD>.md under the project root.
const DIGEST_DIR = path.join(process.cwd(), "digests");

export default defineTool({
  description:
    "Save a finished weekly digest as a markdown file. Call this after writing the digest when the request comes from a schedule or the user asks to save it.",
  inputSchema: z.object({
    repo: z
      .string()
      .regex(/^[\w.-]+\/[\w.-]+$/, "Use the owner/name form, such as vercel/eve.")
      .describe("Repository in owner/name form, such as vercel/eve."),
    markdown: z.string().min(1).describe("The complete digest in markdown."),
  }),
  label: {
    start: ({ repo }) => `Save digest for ${repo}`,
  },
  async execute({ repo, markdown }) {
    const date = new Date().toISOString().slice(0, 10);
    const dir = path.join(DIGEST_DIR, repo.replace("/", "-"));
    const file = path.join(dir, `${date}.md`);
    await mkdir(dir, { recursive: true });
    await writeFile(file, markdown.endsWith("\n") ? markdown : `${markdown}\n`);
    return { saved: path.relative(process.cwd(), file) };
  },
});
