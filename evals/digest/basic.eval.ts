import { defineEval } from "eve/evals";

import { activityStub, ASK, fakeWeek, saveStub } from "../fixtures/activity";

export default defineEval({
  description: "A normal week: fetches activity once and covers every release, PR, and issue count.",
  async test(t) {
    const session = await t.session({ stubs: [activityStub(fakeWeek), saveStub] });
    const turn = await session.send(ASK);

    turn.expectOk();
    turn.calledTool("get_repo_activity", { input: { repo: "acme/widgets", days: 7 }, count: 1 });
    turn.notCalledTool("save_digest");
    turn.messageIncludes("v2.0.0");
    for (const pr of ["#101", "#102", "#103"]) turn.messageIncludes(pr);
    turn.messageIncludes(/2 opened, 5 closed/);
    turn.messageIncludes(/\*\*Breaking:\*\*[^\n]*#101/);
  },
});
