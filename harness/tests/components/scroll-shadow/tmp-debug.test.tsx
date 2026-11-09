import { expect, open, test } from "nsh/test";

test("probe rtl offsets", async () => {
  const app = await open("./tmp-probe.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
  });

  await app.wait(300);
  expect(app.texts()).toEqual([]);
});
