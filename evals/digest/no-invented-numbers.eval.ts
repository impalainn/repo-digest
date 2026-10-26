import { defineEval } from "eve/evals";
import { satisfies } from "eve/evals/expect";

import { activityStub, ASK, fakeWeek } from "../fixtures/activity";

const known = new Set([
  ...fakeWeek.mergedPullRequests.map((pr) => pr.number),
  ...fakeWeek.openedIssues.map((issue) => issue.number),
]);

export default defineEval({
  description: "Every #number and GitHub link in the digest comes from the tool output.",
  async test(t) {
    const session = await t.session({ stubs: [activityStub(fakeWeek)] });
    const turn = await session.send(ASK);
    turn.expectOk();

    const message = turn.message ?? "";
    const cited = [...message.matchAll(/#(\d+)\b/g)].map((m) => Number(m[1]));
    const linked = [...message.matchAll(/github\.com\/acme\/widgets\/(?:pull|issues)\/(\d+)/g)].map((m) =>
      Number(m[1]),
    );

    t.check(
      [...cited, ...linked].filter((n) => !known.has(n)),
      satisfies((invented: number[]) => invented.length === 0, "no invented PR or issue numbers"),
    );
    t.check(cited, satisfies((numbers: number[]) => numbers.length > 0, "cites at least one PR"));
  },
});
