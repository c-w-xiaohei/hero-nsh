import { describe, expect, open, test } from "nsh/test";

/*
 * Headless-only half of adapt-sheets/breadcrumbs.md M-001 (A-001): the
 * pointer baseline's hover underline. `app.hover` is a mouse gesture the
 * ios/android targets cannot perform, so the shared
 * `breadcrumbs.mobile.test.tsx` file — which runs natively there — cannot
 * carry it. This local file keeps the `platform:"windows"` pin that
 * creates the pointer host and asserts the original contract: hovering a
 * non-current link underlines its label.
 */

function openMobile(caseName: string): ReturnType<typeof open> {
  return open("../../../breadcrumbs.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    clock: {},
    host: { params: { case: caseName } },
  });
}

describe("breadcrumbs mobile headless", () => {
  test("M-001 default pointer environment: hovering a non-current link underlines it", async () => {
    const app = await openMobile("links");

    const home = "id:item-home >> text:Home";
    expect(app.spanStyle(home).underline).toBe(false);

    await app.hover("role:link[Home]");

    expect(app.spanStyle(home).underline).toBe(true);
  }, 120_000);
});
