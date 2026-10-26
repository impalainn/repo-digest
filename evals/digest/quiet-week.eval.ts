import { defineEval } from "eve/evals";
import { satisfies } from "eve/evals/expect";

import { activityStub, ASK, quietWeek } from "../fixtures/activity";

export default defineEval({
  description: "A week with no activity gets a one-line reply, not empty sections.",
  async test(t) {
    const session = await t.session({ stubs: [activityStub(quietWeek)] });
    const turn = await session.send(ASK);
    turn.expectOk();
    turn.calledTool("get_repo_activity", { count: 1 });

    const message = turn.message ?? "";
    t.check(message, satisfies((text: string) => !/^## /m.test(text), "no section headings"));
    t.check(message, satisfies((text: string) => text.split(/\s+/).length < 80, "short reply"));
  },
});
