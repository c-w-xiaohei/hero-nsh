import { expect, open, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";

test("scratch: dump layout probes", async () => {
  for (const params of [
    { case: "invalid" },
    { case: "invalid", partClass: "p-2" },
    { case: "toggle" },
    { case: "invalid", density: "compact" },
  ]) {
    const app = await open("../../../field-error.fixtures.tsx", {
      platform: "windows",
      width: 1024,
      height: 768,
      host: { params },
    });
    await app.wait(300);
    const layout = callsOf(app, "layout").map((c) => c[0]);
    console.log(JSON.stringify(params), "=>", JSON.stringify(layout));
  }
  expect(true).toBe(true);
});
