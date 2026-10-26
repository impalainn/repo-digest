import { defineEval } from "eve/evals";
import { satisfies } from "eve/evals/expect";

import { notFoundStub } from "../fixtures/activity";

export default defineEval({
  description: "When GitHub says the repository does not exist, explain it instead of inventing a digest.",
  async test(t) {
    const session = await t.session({ stubs: [notFoundStub] });
    const turn = await session.send("Write a digest for acme/does-not-exist for the last 7 days.");
    turn.expectOk();
    turn.calledTool("get_repo_activity", { status: "failed" });
    turn.notCalledTool("save_digest");

    turn.messageIncludes(/not (be )?found|doesn't exist|does not exist/i);
    t.check(turn.message ?? "", satisfies((text: string) => !/^## /m.test(text), "no digest sections"));
  },
});
