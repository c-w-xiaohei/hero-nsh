import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Mobile assertions for the form adapt unit, one test per row of
 * adapt-sheets/form.md §4 (M-001…M-006). The fixture is
 * `harness/form.fixtures.tsx` — `case` picks the shape (basic / submit /
 * errors) and `scope` picks the environment (`"touch"` mounts
 * `EnvironmentScope input="touch"`; absent is the host default, pointer —
 * the desktop-parity baseline).
 *
 * Form's contract surface is observed through what `nsh/test` sees plus the
 * fixture's `probe()` records: `shows` for the named landmark and the error
 * text, the `form.submit` probe for the `FormContext.submit → onSubmit`
 * channel (one record per dispatch), and `app.submit("label:Your name")`
 * for Return in a field, bridged to `FormContext.submit()` inside the
 * fixture the way the field units will once they land (sheet A-005).
 *
 * Both environments are covered in the same file: `press`/`submit`/`shows`
 * behave the same on headless and web, so this is a dual-target
 * `.mobile.test.tsx`, pinned to `platform:"windows", 1024×768` like the
 * sibling `form.heroui.test.tsx` (an unpinned headless open would land on
 * the phone-sized engine where `input` defaults to touch and every
 * pointer-default assertion inverts).
 */

function openForm(caseName: string, scope?: "touch"): Promise<App> {
  return open("../../../form.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    host: { params: { case: caseName, ...(scope ? { scope } : {}) } },
  });
}

describe("form", () => {
  // adapt-sheets/form.md M-001 (A-001, A-007, 基线): under the default
  // environment the named landmark, the field's accessible name and the
  // error propagation render exactly as the desktop port asserts — the bare
  // container gained no class surface and the contract surface is
  // unchanged (T-001/T-003's sibling observations).
  test("M-001 default environment: landmark, field and error propagation unchanged", async () => {
    const basic = await openForm("basic");
    expect(basic.shows("role:region[Profile]")).toBe(true);
    expect(basic.shows("label:Your name")).toBe(true);

    const errors = await openForm("errors");
    expect(errors.shows("text:Name is required")).toBe(true);
  });

  // adapt-sheets/form.md M-002 (A-004, 基线): under the default environment
  // pressing `Button type="submit"` reaches `FormContext.submit()` →
  // `onSubmit` exactly once — the submit entry inherits Button's work, and
  // the press path matches T-002's desktop observation.
  test("M-002 default environment: Button submit press dispatches onSubmit once", async () => {
    const app = await openForm("submit");

    await app.press("role:button[Save]");
    await app.waitUntil(() => callsOf(app, "form.submit").length >= 1);

    expect(callsOf(app, "form.submit")).toHaveLength(1);
  });

  // adapt-sheets/form.md M-003 (A-003, A-005): under the injected touch
  // environment the same press still dispatches exactly once — the channel
  // gains no second path — and pressing a blank pressable next to the
  // container records nothing: the form is no press surface and no gesture
  // was added (the positive side of the `input`-axis-free, gesture-free
  // adaptation).
  test("M-003 injected touch: press submits once, blank press adds no record", async () => {
    const app = await openForm("submit", "touch");

    await app.press("role:button[Save]");
    await app.waitUntil(() => callsOf(app, "form.submit").length >= 1);
    expect(callsOf(app, "form.submit")).toHaveLength(1);

    // A press on the `away` sibling lands and records its own probe, but
    // the submit channel stays at one record.
    await app.press("id:away");
    await app.waitUntil(() => callsOf(app, "away").length >= 1);
    expect(callsOf(app, "form.submit")).toHaveLength(1);
  });

  // adapt-sheets/form.md M-004 (A-005): under the default environment
  // Return in the bridged field reaches `FormContext.submit()` → `onSubmit`
  // exactly once — keyboard submission shares the `submit → onSubmit`
  // channel with the press path, single event, single dispatch (the action
  // row's "验收键盘提交").
  test("M-004 default environment: Return in the field dispatches onSubmit once", async () => {
    const app = await openForm("submit");
    expect(app.shows("label:Your name")).toBe(true);

    await app.submit("label:Your name");
    await app.waitUntil(() => callsOf(app, "form.submit").length >= 1);

    expect(callsOf(app, "form.submit")).toHaveLength(1);
  });

  // adapt-sheets/form.md M-005 (A-004, A-005): under the injected touch
  // environment Return still dispatches exactly once — `EnvironmentScope`
  // replaces `input`/`density`, not the context, so the keyboard path and
  // its count are identical on both ends.
  test("M-005 injected touch: Return in the field still dispatches onSubmit once", async () => {
    const app = await openForm("submit", "touch");
    expect(app.shows("label:Your name")).toBe(true);

    await app.submit("label:Your name");
    await app.waitUntil(() => callsOf(app, "form.submit").length >= 1);

    expect(callsOf(app, "form.submit")).toHaveLength(1);
  });

  // adapt-sheets/form.md M-006 (A-008): the carrier itself works — the
  // pinned desktop `open` succeeds on `form.fixtures.tsx`, the bridged
  // field renders inside the form, and its `onSubmit` bridge is reachable
  // (the probe records M-004/M-005 read are the indirect proof; here the
  // mount and the field surface are asserted directly).
  test("M-006 fixture carrier: pinned open mounts the bridged field in the submit case", async () => {
    const app = await openForm("submit");

    expect(app.shows("role:region[Profile]")).toBe(true);
    expect(app.shows("label:Your name")).toBe(true);
    expect(app.shows("role:button[Save]")).toBe(true);
  });
});
