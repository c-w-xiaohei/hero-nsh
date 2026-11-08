import { expect, test } from "nsh/test";
import { openScenario } from "../../helpers/open-scenario";
import { callsOf } from "../../helpers/calls";

for (const platform of ["windows", "web"] as const) {
  test(`smoke renders through the @heroui/react alias on ${platform}`, async () => {
    const app = await openScenario("smoke/basic", { platform });
    expect(app.texts()).toContain("hero-nsh 0.0.0");
  });

  test(`smoke reads probe calls back on ${platform}`, async () => {
    const app = await openScenario("smoke/basic", { platform });
    await app.press("id:smoke-box");
    await app.waitUntil(() => callsOf(app, "onPress").length === 1);
    expect(callsOf(app, "onPress")).toHaveLength(1);
  });
}
