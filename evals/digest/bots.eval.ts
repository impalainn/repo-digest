import { defineEval } from "eve/evals";
import { satisfies } from "eve/evals/expect";

import { activityStub, ASK, fakeWeek } from "../fixtures/activity";

export default defineEval({
  description: "Contributors lists human authors only; bot accounts are left out.",
  async test(t) {
    const session = await t.session({ stubs: [activityStub(fakeWeek)] });
    const turn = await session.send(ASK);
    turn.expectOk();

    const contributors = (turn.message ?? "").split(/## Contributors/i)[1] ?? "";
    t.check(contributors, satisfies((text: string) => /alice/.test(text) && /bob/.test(text), "thanks alice and bob"));
    t.check(
      contributors,
      satisfies((text: string) => !/dependabot|github-actions/i.test(text), "no bots in Contributors"),
    );
  },
});
