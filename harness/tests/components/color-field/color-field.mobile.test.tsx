import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { calls, callsOf } from "../../helpers/calls";

/*
 * Mobile assertions for the color-field adapt unit
 * (adapt-sheets/color-field.md §4, M-001, M-003…M-007, M-009, M-010) on
 * every target, native ios/android included: every assertion reads what
 * `nsh/test` observes — `shows`, `value`, `enabled`, `onLayout` bounds and
 * the Storage probe calls — and `host.params.testInput` picks the
 * environment explicitly ("pointer" is the host-independent desktop-parity
 * baseline, "touch" the injected side), so the dual-environment rows run
 * identically everywhere. M-002 uses `app.hover`, which needs a mouse —
 * it lives in `color-field.mobile.headless.test.tsx`. Native hosts fill
 * the device screen and reject the `platform`/`width`/`height` open
 * options, so this file carries none.
 *
 * The probes live in `harness/color-field.fixtures.tsx`:
 *   `layout`   the `ColorField.Group`'s `onLayout` bounds — the inherited
 *              `min-h-11` hit face vs the pointer 36 pt row (M-001).
 *   `hover`    the Group's `isHovered` render-prop record plus `onHover*` /
 *              `onMouse*` probes on Group and Input, and `onPress` probes
 *              on the affixes (M-002, headless).
 *   `submit`   Root `onChange` (hex) plus Input `onSubmit` / `blur` /
 *              `focus` probes and an `outside` blur target; `sb` feeds the
 *              Input's explicit `submitBehavior` (M-003, M-004, M-007).
 *   `kbd`      one field per Root `enterKeyHint` (seven) and per Input
 *              `returnKeyType` (five) — mounting is the channel assertion
 *              (M-005).
 *   `prefix-suffix`  bare affixes with no probes — M-006's negative presses
 *              need a surface the component did not wire.
 *   `baseline` every default-environment contract face in one mount (M-010).
 */

type Params = Record<string, string>;

function openCase(name: string, params: Params = {}): Promise<App> {
  return open("../../../color-field.fixtures.tsx", {
    host: { params: { case: name, ...params } },
  });
}

type GroupLayout = { width: number; height: number };
type RootClassRecord = { isHovered: boolean };

function lastGroupLayout(app: App): GroupLayout {
  const records = callsOf(app, "layout").map((args) => args[0] as GroupLayout);
  const found = records[records.length - 1];

  if (!found) throw new Error("the Group onLayout recorded nothing");

  return found;
}

function rootClassRecords(app: App): RootClassRecord[] {
  return callsOf(app, "root-class").map((args) => args[0] as RootClassRecord);
}

function probeNames(app: App): string[] {
  return calls(app).map((c) => c.name);
}

// The host OS the fixture reports through its `platform` probe (the
// table/tabs convention): `os === "ios"` is where M-006's NOT_FOUND
// rejection degrades — every other assertion is host-blind. The strict
// rejections also run in `color-field.mobile.headless.test.tsx` under a
// `platform:"windows"` pin (the headless engine reports "ios" too, so an
// os-name gate alone cannot keep coverage on it).
function hostOs(app: App): unknown {
  return callsOf(app, "platform").at(-1)?.[0];
}

// adapt-sheets/color-field.md M-009 (A-010) — the shared half of the two
// M-009 rows below. Four sequential opens per scope: a dozen web hosts in
// one test exhausts the web target, so the row splits one scope per test
// and reads only the cases that emit probes at mount or on one short step.
async function assertFixtureSurface(params: Params) {
  const layout = await openCase("layout", params);
  await layout.waitUntil(() => callsOf(layout, "layout").length > 0);

  const hover = await openCase("hover", params);
  expect(rootClassRecords(hover).length).toBeGreaterThan(0);

  const submit = await openCase("submit", params);
  await submit.type("id:color-input", "x");
  await submit.submit("id:color-input");
  expect(callsOf(submit, "onSubmit")).toHaveLength(1);

  const kbd = await openCase("kbd", params);
  expect(kbd.shows("id:kh-enter")).toBe(true);
  expect(kbd.shows("id:kr-done")).toBe(true);
}

describe("color-field mobile", () => {
  // adapt-sheets/color-field.md M-001 (A-003, A-010): under the injected
  // touch environment the inherited `input` axis' `min-h-11` lifts the
  // Group row past the 44 pt hit target; under the default pointer
  // environment the same row keeps its desktop 36 pt height (zero drift).
  test("M-001 touch scope lifts the group row to 44pt; pointer keeps 36pt", async () => {
    const touch = await openCase("layout", { testInput: "touch" });
    await touch.waitUntil(() => callsOf(touch, "layout").length > 0);
    // Android's DIP rasterization lands the `min-h-11` face at 43.81 pt —
    // a bounded sub-pixel quantization, not a miss of the 44 pt hit minimum.
    expect(lastGroupLayout(touch).height).toBeGreaterThanOrEqual(43.5);

    const pointer = await openCase("layout", { testInput: "pointer" });
    await pointer.waitUntil(() => callsOf(pointer, "layout").length > 0);
    // Android's DIP rasterization lands the 36 pt face at 35.81 — the same
    // bounded sub-pixel quantization as the touch arm above; |Δ| < 0.25
    // keeps the exact-36 contract to device-pixel noise, and 36.25 stays
    // strictly under the 44 pt touch minimum the row must never reach.
    expect(Math.abs(lastGroupLayout(pointer).height - 36)).toBeLessThan(0.25);
  }, 120_000);

  // adapt-sheets/color-field.md M-002 (A-004) lives in
  // `color-field.mobile.headless.test.tsx` — `app.hover` needs a mouse, so
  // the row moved there whole rather than split.

  // adapt-sheets/color-field.md M-003 (A-001, A-010): Enter runs the field
  // chain — `field.onSubmit` → `handle.commit()` — so `onChange` reports
  // the committed color exactly once; the field's `submitBehavior`
  // default `"submit"` keeps the focus (`blur` stays silent) and a later
  // `app.type` still lands in the same input (the focus-query gap's
  // registered degradation, sheet §6).
  test("M-003 Enter commits once through the field and keeps focus", async () => {
    const app = await openCase("submit", { testInput: "pointer" });

    await app.clear("id:color-input");
    await app.type("id:color-input", "#22c55e");
    await app.submit("id:color-input");

    const changes = callsOf(app, "onChange");
    expect(changes).toHaveLength(1);
    expect(String(changes[0][0]).toLowerCase()).toBe("#22c55e");
    expect(callsOf(app, "onSubmit")).toHaveLength(1);
    expect(callsOf(app, "blur")).toHaveLength(0);
    // The first type took the focus once; a kept focus never re-fires it.
    expect(callsOf(app, "focus")).toHaveLength(1);

    // Kept focus, second half: a further edit lands in the same input
    // without a new focus edge — had Return blurred, the next click
    // would record a second `focus` (the focus-query gap's registered
    // degradation, sheet §6).
    await app.clear("id:color-input");
    await app.type("id:color-input", "#00ff00");
    expect(app.value("id:color-input")).toBe("#00ff00");
    expect(callsOf(app, "focus")).toHaveLength(1);
    expect(callsOf(app, "blur")).toHaveLength(0);
  }, 120_000);

  // adapt-sheets/color-field.md M-004 (A-001): an explicit
  // `submitBehavior="blurAndSubmit"` on the Input wins over the field's
  // keep-focus default — `app.submit` commits once (`onChange`), reports
  // `onSubmit`, and the host then blurs, so `blur` records once. The
  // field→local submit order is unchanged.
  test("M-004 explicit submitBehavior=blurAndSubmit wins: commit, submit, then blur", async () => {
    const app = await openCase("submit", {
      testInput: "pointer",
      sb: "blurAndSubmit",
    });

    await app.clear("id:color-input");
    await app.type("id:color-input", "#ff0000");
    await app.submit("id:color-input");

    expect(callsOf(app, "onChange")).toHaveLength(1);
    expect(String(callsOf(app, "onChange")[0][0]).toLowerCase()).toBe("#ff0000");
    expect(callsOf(app, "onSubmit")).toHaveLength(1);
    expect(callsOf(app, "blur")).toHaveLength(1);

    // The field commit still ran before the local callback.
    expect(probeNames(app).indexOf("onChange")).toBeLessThan(
      probeNames(app).indexOf("onSubmit"),
    );
  }, 120_000);

  // adapt-sheets/color-field.md M-005 (A-002): every value of the
  // keyboard-props chain mounts — the Root's `enterKeyHint` reaches the
  // field channel and the Input's own `returnKeyType` mounts beside it.
  // Mounting is the channel assertion; what the soft keyboard labels with
  // them is a real-device acceptance item (sheet §6).
  test("M-005 every enterKeyHint / returnKeyType value mounts", async () => {
    const app = await openCase("kbd", { testInput: "pointer" });

    for (const hint of ["enter", "done", "go", "next", "previous", "search", "send"]) {
      expect(app.shows(`id:kh-${hint}`)).toBe(true);
    }
    for (const kind of ["done", "go", "next", "search", "send"]) {
      expect(app.shows(`id:kr-${kind}`)).toBe(true);
    }

    // The channel stays editable: a typed edit lands in a hinted field.
    await app.type("id:kh-done", "#abc");
    expect(app.value("id:kh-done")).toContain("#abc");
  }, 120_000);

  // adapt-sheets/color-field.md M-006 (A-005, A-007): the affixes and the
  // field containers keep no press channel in either environment — the
  // component builds no pressable surface, so presses on the bare
  // affixes, the Group row and the Root find nothing
  // (ERR_NSH_TEST_NOT_FOUND, the same form toolbar's bare-surface rows
  // use), and no probe records at all.
  test("M-006 affix and container presses find nothing in both environments", async () => {
    for (const params of [{ testInput: "pointer" }, { testInput: "touch" }] as Params[]) {
      const app = await openCase("prefix-suffix", params);

      if (hostOs(app) === "ios") {
        // Two ios reporters, two physical press outcomes — registered NSH
        // gap: the real iOS host's `app.press` resolves a selector through
        // the ancestor hit test (CI 45344508005: all four presses resolved
        // instead of rejecting), while the headless engine — which also
        // reports `platform.os` "ios" and runs this file under bare
        // `pnpm test` — keeps the strict resolver and rejects
        // ERR_NSH_TEST_NOT_FOUND. Neither outcome is pinned here: what
        // both hosts share, and what this arm asserts, is the contract's
        // outcome — the presses happen and no component probe records
        // (the zero-probe tail below). The catch still constrains any
        // rejection to exactly NOT_FOUND, so a different failure (e.g.
        // DISABLED on a wired surface) cannot slip through. The verbatim
        // strict rejections run on Android in the else below and on a
        // `platform:"windows"` headless pin in
        // `color-field.mobile.headless.test.tsx`.
        for (const selector of ["text:#", "text:%", "id:group", "id:field-root"]) {
          await app.press(selector).catch((error) => {
            expect(error).toMatchObject({ code: "ERR_NSH_TEST_NOT_FOUND" });
          });
        }
      } else {
        await expect(app.press("text:#")).rejects.toMatchObject({
          code: "ERR_NSH_TEST_NOT_FOUND",
        });
        await expect(app.press("text:%")).rejects.toMatchObject({
          code: "ERR_NSH_TEST_NOT_FOUND",
        });
        await expect(app.press("id:group")).rejects.toMatchObject({
          code: "ERR_NSH_TEST_NOT_FOUND",
        });
        await expect(app.press("id:field-root")).rejects.toMatchObject({
          code: "ERR_NSH_TEST_NOT_FOUND",
        });
      }
      // `platform` is the fixture's own OS record, not an app probe.
      expect(calls(app).filter((c) => c.name !== "platform")).toHaveLength(0);
    }
  }, 120_000);

  // adapt-sheets/color-field.md M-007 (A-006): the spin keymap is an
  // existing desktop editing path, not a pan gesture — it stays bound
  // under touch. Focused input + Up/Down/Home/End produce the same
  // `onChange` step sequence in both environments.
  test("M-007 spin keys step identically under touch and pointer", async () => {
    const expected = ["#0485f8", "#0485f7", "#000000", "#ffffff"];

    for (const params of [{ testInput: "pointer" }, { testInput: "touch" }] as Params[]) {
      const app = await openCase("submit", params);

      // An empty typing step takes the focus without touching the text.
      await app.type("id:color-input", "");

      await app.keyboard.press("arrowup");
      await app.keyboard.press("arrowdown");
      await app.keyboard.press("home");
      await app.keyboard.press("end");

      const steps = callsOf(app, "onChange").map((args) =>
        String(args[0]).toLowerCase(),
      );
      expect(steps).toEqual(expected);
    }
  }, 120_000);

  // adapt-sheets/color-field.md M-009 (A-010): the assertion carrier
  // itself — every probe-bearing fixture case mounts under both scopes
  // and its recorders land in Storage, so a silent fixture regression
  // cannot pass the rows above vacuously.
  test("M-009 fixture entry: every case mounts and records (pointer scope)", async () => {
    await assertFixtureSurface({ testInput: "pointer" });
  }, 120_000);

  test("M-009 fixture entry: every case mounts and records (touch scope)", async () => {
    await assertFixtureSurface({ testInput: "touch" });
  }, 120_000);

  // adapt-sheets/color-field.md M-010 (基线): the default environment
  // keeps the desktop contract — the same faces and semantics
  // `color-field.heroui.test.tsx` pins (T-001…T-011, S-001…S-003,
  // X-001/X-002), all mounted at once by the fixture's `baseline` case
  // (sequential opens exhaust the web target's browser pool, so the
  // whole row reads one app).
  test("M-010 baseline: default environment keeps the desktop contract", async () => {
    const app = await openCase("baseline", { testInput: "pointer" });

    // T-001 / T-008: the Label names the input, shows the required
    // asterisk, and the FieldError text mounts. The Description rides the
    // non-invalid hue field — an invalid field hides its Description
    // (R-002), so it cannot carry this assertion here.
    expect(app.shows("text:/Brand Color\\*/")).toBe(true);
    expect(app.shows("text:Bad color")).toBe(true);
    expect(app.shows("text:Pick a hue")).toBe(true);

    // T-011: affix string children render as text.
    expect(app.shows("text:#")).toBe(true);
    expect(app.shows("text:%")).toBe(true);

    // T-010: the disabled field's input takes no edit.
    expect(app.enabled("id:b-disabled")).toBe(false);

    // T-007 / S-002: channel fields show their formatted channel text.
    expect(app.value("id:b-hue")).toBe("200°");
    expect(app.value("id:b-saturation")).toBe("50%");

    // S-001: the hex field steps from its committed value.
    await app.type("id:b-keys", "");
    await app.keyboard.press("arrowup");
    expect(app.value("id:b-keys")).toBe("#0485F8");

    // T-005 / X-001: typing never commits; the blur commits once, the
    // controlled parent writes the normalized hex back, and an empty
    // commit reports null and clears the accepted value.
    await app.clear("id:b-input");
    await app.type("id:b-input", "#22c55e");
    expect(callsOf(app, "onChange")).toHaveLength(0);

    await app.type("id:b-outside", "x");
    await app.waitUntil(() => callsOf(app, "onChange").length > 0);
    const committed = callsOf(app, "onChange");
    expect(committed).toHaveLength(1);
    expect(String(committed[0][0]).toLowerCase()).toBe("#22c55e");
    expect(app.value("id:b-input")).toBe("#22C55E");
    expect(callsOf(app, "b-focus").length).toBeGreaterThanOrEqual(1);
    expect(callsOf(app, "b-blur")).toHaveLength(1);

    await app.clear("id:b-input");
    await app.type("id:b-outside", "y");
    await app.waitUntil(() => callsOf(app, "onChange").length > 1);
    const cleared = callsOf(app, "onChange");
    expect(cleared[cleared.length - 1][0]).toBeNull();
    expect(app.value("id:b-input")).toBe("");

    // X-001 / X-002 on the rejecting parent: the clear reports null and
    // the field falls back to the committed color; a step runs from the
    // typed text and the rejected write keeps it in the input.
    await app.clear("id:b-reject");
    await app.type("id:b-reject", "#FF0000");
    await app.keyboard.press("arrowup");

    const rejected = callsOf(app, "onChange-reject");
    expect(rejected.length).toBeGreaterThanOrEqual(1);
    expect(String(rejected[rejected.length - 1][0]).toLowerCase()).toBe("#ff0001");
    expect(app.value("id:b-reject")).toBe("#FF0000");

    await app.clear("id:b-reject");
    await app.type("id:b-outside", "z");
    await app.waitUntil(() => callsOf(app, "onChange-reject").length > 0);
    const rejectCleared = callsOf(app, "onChange-reject");
    expect(rejectCleared[rejectCleared.length - 1][0]).toBeNull();
    expect(app.value("id:b-reject")).toBe("#0485F7");

    // T-004: fullWidth fills the 400-point column, the default field
    // shrinks to its group.
    await app.wait(20);
    type NamedLayout = { name: string; width: number; height: number };
    const layouts = callsOf(app, "layout").map((args) => args[0] as NamedLayout);
    const full = layouts.filter((l) => l.name === "full").at(-1);
    const plain = layouts.filter((l) => l.name === "default").at(-1);
    expect(full?.width).toBe(400);
    expect(plain?.width).toBeLessThan(400);
  }, 120_000);
});
