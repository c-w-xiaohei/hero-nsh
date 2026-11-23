import { describe, expect, open, test } from "nsh/test";
import type { App, OpenOptions } from "nsh/test";
import { lastChange } from "../../testers/time-field";

/*
 * Headless mobile assertion for the TimeField adapt unit — the row of
 * adapt-sheets/time-field.md §4 that needs a capability only the headless
 * engine has: M-007 (`open({platform:"ios"})` host derivation; `--target web`
 * rejects a `platform` option outright).
 *
 * The fixture is `harness/time-field.fixtures.tsx`; `host.params.case` is
 * "default" here. The ios opens pin no desktop platform and no `scope`: the
 * phone-sized host deriving `input == "touch"` is the subject (the
 * date-input-group headless convention).
 */

function openTimeField(
  caseName: string,
  params: Record<string, string> = {},
  options: Pick<OpenOptions, "platform" | "width" | "height"> = {},
): Promise<App> {
  return open("../../../time-field.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    locale: "en-US",
    ...options,
    host: { params: { case: caseName, ...params } },
  });
}

function openIos(caseName: string, params: Record<string, string> = {}): Promise<App> {
  return openTimeField(caseName, params, { platform: "ios", width: 390, height: 844 });
}

describe("time-field mobile (headless)", () => {
  // adapt-sheets/time-field.md M-007 (A-001, A-002): `platform:"ios"` with no
  // `EnvironmentScope` — the host derives `input()==="touch"` on its own, so
  // the `dig-seg-*` channels mount and `app.type` drives `field.type` exactly
  // as the injected half (M-002) does.
  test("M-007 ios host derivation: channels mount and type edits without a scope", async () => {
    const app = await openIos("default");

    expect(app.count("id:dig-seg-hour")).toBe(1);
    expect(app.count("id:dig-seg-minute")).toBe(1);
    expect(app.count("id:dig-seg-dayPeriod")).toBe(1);

    await app.type("id:dig-seg-hour", "10");
    await app.waitFor("id:tf-hour >> text:10");
    await app.waitUntil(() => {
      try {
        const committed = lastChange(app);
        return committed.hour === 10 && committed.minute === 30;
      } catch {
        return false;
      }
    });
    expect((lastChange(app) as Record<string, unknown>).year).toBeUndefined();
  }, 120_000);
});
