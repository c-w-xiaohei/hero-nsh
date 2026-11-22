import { describe, expect, open, test } from "nsh/test";
import type { App, OpenOptions } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { lastSegment } from "../../testers/date-input-group";

/*
 * Headless mobile assertions for the DateField adapt unit — the row of
 * adapt-sheets/date-field.md §4 that needs a capability only the headless
 * engine has: M-007 (`open({platform:"ios"})` host derivation — `--target
 * web` rejects a `platform` option outright, the date-input-group split).
 *
 * The fixture is `harness/date-field.fixtures.tsx`; `host.params`: `case`,
 * `scope`. The ios open pins no desktop platform and injects no
 * `EnvironmentScope` — the phone-sized host deriving `input == "touch"` is
 * the subject (the date-input-group headless convention).
 */

function openCase(
  name: string,
  params: Record<string, string | number | boolean> = {},
  options: Pick<OpenOptions, "platform" | "width" | "height"> = {},
): Promise<App> {
  return open("../../../date-field.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    locale: "en-US",
    ...options,
    host: { params: { case: name, ...params } },
  });
}

function openIos(name: string, params: Record<string, string | number | boolean> = {}): Promise<App> {
  return openCase(name, params, { platform: "ios", width: 390, height: 844 });
}

// The last `segment-props` record per type decides: earlier renders still
// carry the previous `isFocused`, so "focused" means the latest render says so.
function focusedTypes(app: App): string[] {
  const last = new Map<string, boolean>();
  for (const c of callsOf(app, "segment-props")) {
    const r = c[0] as { type: string; isFocused: boolean };
    last.set(r.type, r.isFocused);
  }
  return [...last.entries()].filter(([, focused]) => focused).map(([type]) => type);
}

async function waitFocused(app: App, type: string): Promise<void> {
  await app.waitUntil(() => focusedTypes(app).includes(type));
}

describe("date-field mobile (headless)", () => {
  // adapt-sheets/date-field.md M-007 (A-001, A-002): `platform:"ios"` with no
  // `EnvironmentScope` — the host derives `input()==="touch"` on its own, so
  // the channels mount and `app.type` drives `field.type` on DateFieldRoot's
  // state exactly as the injected half (M-002) does.
  test("M-007 ios host derivation: channels mount and type edits without a scope", async () => {
    const app = await openIos("default");

    expect(app.count("id:dig-seg-month")).toBe(1);
    expect(app.count("id:dig-seg-day")).toBe(1);
    expect(app.count("id:dig-seg-year")).toBe(1);

    await app.type("id:dig-seg-month", "12");
    await app.waitUntil(() => lastSegment(app, "month").text === "12");
    await waitFocused(app, "day");
  }, 120_000);
});
