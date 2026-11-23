import { describe, expect, open, test } from "nsh/test";
import type { App, OpenOptions } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Headless mobile assertions for the search-field adapt unit — the row of
 * adapt-sheets/search-field.md §4 that needs a capability only the
 * headless engine has: M-010 (`open({platform:"ios"})` host derivation —
 * `--target web` rejects a `platform` option outright).
 *
 * The fixture is `harness/search-field.fixtures.tsx`; `host.params`:
 * `case` (`layout` for the bounds probes, `basic` for the press→type
 * chain) — no `scope`: the phone-sized host deriving `input == "touch"`
 * on its own is the subject (the switch / tabs / date-input-group
 * headless convention).
 */

type Bounds = { origin: { x: number; y: number }; size: { width: number; height: number } };

function openCase(
  name: string,
  params: Record<string, string> = {},
  options: Pick<OpenOptions, "platform" | "width" | "height"> = {},
): Promise<App> {
  return open("../../../search-field.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    ...options,
    host: { params: { case: name, ...params } },
  });
}

function openIos(name: string): Promise<App> {
  return openCase(name, {}, { platform: "ios", width: 390, height: 844 });
}

function lastOf<T>(app: App, name: string): T {
  const all = callsOf(app, name);
  const found = all[all.length - 1]?.[0] as T | undefined;

  if (found === undefined) throw new Error(`the fixture recorded no ${name} call`);

  return found;
}

describe("search-field mobile (headless)", () => {
  // adapt-sheets/search-field.md M-010 (A-001, A-006): `platform:"ios"`
  // with no `EnvironmentScope` — the host derives `input()==="touch"` on
  // its own, so the `min-h-11` group floor applies (the `layout` case's
  // `group-layout` probe reports the bounds) and the press→focus→type
  // editing chain works exactly as the injected half (M-005) does.
  test("M-010 ios host derivation: 44pt group floor and the press-to-type chain without a scope", async () => {
    const layout = await openIos("layout");
    await layout.waitUntil(() => callsOf(layout, "group-layout").length > 0);
    const bounds = lastOf<Bounds>(layout, "group-layout");
    expect(bounds.size.height).toBeGreaterThanOrEqual(44);

    const app = await openIos("basic");

    await app.press("label:Search");
    await app.waitUntil(() => callsOf(app, "onFocus").length > 0);

    await app.type("label:Search", "ios");
    await app.waitUntil(() => callsOf(app, "onChange").length > 0);

    expect(app.value("label:Search")).toBe("ios");
    expect(callsOf(app, "onChange").at(-1)?.[0]).toBe("ios");
    expect(callsOf(app, "onBlur")).toHaveLength(0);
  }, 120_000);
});
