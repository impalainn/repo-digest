import { defineEval } from "eve/evals";

import { activityStub, fakeWeek, saveStub } from "../fixtures/activity";

export default defineEval({
  description: "The weekly schedule's prompt fetches activity, then saves the finished digest.",
  async test(t) {
    // Mirrors agent/schedules/weekly-digest.md with the fake repository.
    const session = await t.session({ stubs: [activityStub(fakeWeek), saveStub] });
    const turn = await session.send(
      "Write the weekly digest for acme/widgets covering the last 7 days, then save it with `save_digest`.",
    );

    turn.expectOk();
    turn.toolOrder(["get_repo_activity", "save_digest"]);
    turn.calledTool("save_digest", {
      input: { repo: "acme/widgets", markdown: /#101[\s\S]*v2\.0\.0|v2\.0\.0[\s\S]*#101/ },
      count: 1,
    });
  },
});
