import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Headless mobile assertions for the color-field adapt unit — the rows of
 * adapt-sheets/color-field.md §4 that need a capability only the
 * headless engine has:
 *
 *   M-002  `app.hover` — a phone has no mouse, so the hover-suppression
 *          row moved here whole (touch + pointer halves) from
 *          `color-field.mobile.test.tsx`.
 *   M-008  `open({platform:"ios"})` host derivation — `--target web`
 *          rejects a `platform` option outright, so the phone-sized
 *          host deriving `input == "touch"` can only be exercised here.
 *
 * The fixture is `harness/color-field.fixtures.tsx`; `host.params.case`
 * is `layout`/`hover`. The ios open pins no desktop platform and no
 * `EnvironmentScope` — the host deriving `input == "touch"` on its own is
 * the subject (the date-input-group headless convention).
 */

function openIos(caseName: string): Promise<App> {
  return open("../../../color-field.fixtures.tsx", {
    platform: "ios",
    width: 390,
    height: 844,
    host: { params: { case: caseName } },
  });
}

function openCase(name: string, params: Record<string, string> = {}): Promise<App> {
  return open("../../../color-field.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    host: { params: { case: name, ...params } },
  });
}

type GroupLayout = { width: number; height: number };
type RootClassRecord = { isHovered: boolean };

function rootClassRecords(app: App): RootClassRecord[] {
  return callsOf(app, "root-class").map((args) => args[0] as RootClassRecord);
}

describe("color-field mobile (headless)", () => {
  // adapt-sheets/color-field.md M-008 (A-003): `platform:"ios"` with no
  // `EnvironmentScope` — the host derives `input()==="touch"` on its own,
  // so the inherited `min-h-11` lifts the Group row past the 44 pt hit
  // target exactly as the injected half (M-001) does.
  test("M-008 ios host derivation: the group row measures at least 44pt without a scope", async () => {
    const app = await openIos("layout");

    await app.waitUntil(() => callsOf(app, "layout").length > 0);
    const records = callsOf(app, "layout").map((args) => args[0] as GroupLayout);
    const layout = records[records.length - 1];

    expect(layout.height).toBeGreaterThanOrEqual(44);
  }, 120_000);

  // adapt-sheets/color-field.md M-002 (A-004): under touch the group's
  // hover face stays inert — pressing the input and hovering the group /
  // input leave `isHovered` false and every `onHoverStart/End/Change`
  // probe silent on both Group and Input (the JS signal behind the hover
  // styles never rises, so no hover residue can paint — sticky hover
  // included). The pointer environment keeps the desktop hover contract.
  test("M-002 injected touch: press and hover never raise the field's hover face", async () => {
    const touch = await openCase("hover", { testInput: "touch" });

    // The press is contact generation only: on headless it resolves to
    // the Group (the fixture's `root-press` makes it the pressable
    // ancestor), on web the click lands on the input itself — either way
    // it must raise no hover face under touch.
    await touch.press("id:color-input");
    await touch.hover("id:group");
    await touch.hover("id:color-input");

    for (const name of [
      "root-hover-start",
      "root-hover-end",
      "root-hover-change",
      "input-hover-start",
      "input-hover-end",
      "input-hover-change",
    ]) {
      expect(callsOf(touch, name)).toHaveLength(0);
    }
    expect(rootClassRecords(touch).every((r) => !r.isHovered)).toBe(true);

    const pointer = await openCase("hover", { testInput: "pointer" });
    await pointer.hover("id:group");
    await pointer.waitUntil(() =>
      rootClassRecords(pointer).some((r) => r.isHovered),
    );
    expect(callsOf(pointer, "root-hover-start")).toHaveLength(1);
    expect(callsOf(pointer, "root-hover-change")).toEqual([[true]]);
    expect(callsOf(pointer, "root-mouse-enter").length).toBeGreaterThanOrEqual(1);

    // The input's own hover pair — `app.hover` delivers to the named view,
    // so the input hears its own enter without leaving the group.
    await pointer.hover("id:color-input");
    await pointer.waitUntil(
      () => callsOf(pointer, "input-hover-start").length > 0,
      { timeout: 3_000 },
    );
    expect(callsOf(pointer, "input-hover-start").length).toBeGreaterThanOrEqual(1);
  }, 120_000);
});
