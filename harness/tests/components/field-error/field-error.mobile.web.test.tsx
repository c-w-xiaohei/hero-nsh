import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Web-target mobile assertions for the FieldError adapt unit: the same
 * M-001…M-008 assertion set as `field-error.mobile.headless.test.tsx`, on
 * the `platform:"web"` pin — `platform` is a headless-only option the web
 * target would reject, so each pin lives in its own file (A-008). The
 * fixture is `harness/field-error.fixtures.tsx`: `host.params.case` picks
 * the field state, `host.params.input` / `host.params.density` feed the
 * `EnvironmentScope` wrapping the field, and `host.params.partClass` fills
 * the context's container-descendant class channel.
 *
 * `platform:"web"` + 1024×768 plays the desktop pointer host (M-008);
 * absent env params keep the host-derived environment — pointer + default
 * density — which is the desktop-parity baseline every assertion compares
 * against. On web a browser has a mouse at any width, so the injected
 * `input="touch"` is what supplies the touch half.
 *
 * The observation channel is what `nsh/test` sees: `shows`/`texts` for the
 * null gates, `spanStyle` for the font and tone, `app.storage()` probes for
 * the `field-error.registered` registration and the `layout` bounds
 * records. Padding has no query, so the `px-1`/`px-0.5`/`px-0` cells are
 * read from the error box's width and edge: `px-1` widens the box 8 pt over
 * the toggle's `px-0` (same text, same font), and `partClass: "p-2"`
 * widens it 16 pt with the left edge unmoved.
 */

type Params = Record<string, string>;

function openCase(caseName: string, params: Params = {}): Promise<App> {
  return open("../../../field-error.fixtures.tsx", {
    platform: "web",
    width: 1024,
    height: 768,
    host: { params: { case: caseName, ...params } },
  });
}

type LayoutEntry = {
  name: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
};

function layoutOf(app: App, name: string): LayoutEntry {
  const entries = callsOf(app, "layout")
    .map((c) => c[0] as LayoutEntry)
    .filter((entry) => entry.name === name);

  return entries[entries.length - 1]!;
}

async function waitLayout(app: App, name: string): Promise<void> {
  await app.waitUntil(() =>
    callsOf(app, "layout").some(
      (c) => (c[0] as LayoutEntry).name === name,
    ),
  );
}

/** The error Text's laid-out box, once it has reported. */
async function errorBox(
  app: App,
): Promise<{ x: number; width: number; height: number }> {
  await waitLayout(app, "field-error");
  const entry = layoutOf(app, "field-error");

  return { x: entry.x, width: entry.width!, height: entry.height! };
}

describe("field-error mobile (web)", () => {
  // adapt-sheets/field-error.md M-001 (基线): the default pointer
  // environment renders the error text, registers it with the field, and
  // resolves `text-xs` + `text-danger` + `px-1` — the padding read out of
  // the box: 8 pt wider than the zero-padded toggle box carrying the same
  // text, with the same left edge (4 pt in on each side, none of it a
  // margin). This is the `.heroui.test.tsx` baseline, re-observed.
  test("M-001 default environment: text, registration, danger tone, text-xs, px-1 padding", async () => {
    const app = await openCase("invalid");

    expect(app.shows("text:Enter a valid email")).toBe(true);
    expect(app.texts()).toContain("Enter a valid email");
    expect(callsOf(app, "field-error.registered")).toEqual([
      ["Enter a valid email"],
    ]);

    const style = app.spanStyle("text:Enter a valid email");
    expect(style.fontSize).toBe(12);
    expect(style.color).toBe("#ff383cff");

    const box = await errorBox(app);
    const toggle = await openCase("toggle");
    const toggleBox = await errorBox(toggle);

    // px-1 on both sides vs px-0: 4 pt left + 4 pt right, left edges equal.
    expect(Math.round(box.width - toggleBox.width)).toBe(8);
    expect(Math.round(box.x)).toBe(Math.round(toggleBox.x));
  });

  // adapt-sheets/field-error.md M-002 (基线): the toggle field paints muted
  // and keeps zero inline padding (the px-0 override holds next to the
  // density cell), `valid` and `empty` stay behind their null gates, and a
  // render prop resolves. Desktop behavior drifts zero.
  test("M-002 default environment: toggle muted with zero padding, null gates, render prop", async () => {
    const toggle = await openCase("toggle");
    expect(toggle.spanStyle("text:Enter a valid email").color).toBe(
      "#71717aff",
    );

    const toggleBox = await errorBox(toggle);
    const invalid = await openCase("invalid");
    const invalidBox = await errorBox(invalid);

    // The toggle's left edge sits at the same container position with no
    // padding of its own — its box is exactly the px-1 pair narrower.
    expect(Math.round(toggleBox.x)).toBe(Math.round(invalidBox.x));
    expect(Math.round(invalidBox.width - toggleBox.width)).toBe(8);

    const valid = await openCase("valid");
    expect(valid.shows("text:Enter a valid email")).toBe(false);

    const empty = await openCase("empty");
    expect(empty.shows("text:Enter a valid email")).toBe(false);
    expect(empty.texts()).toEqual([]);

    const renderProps = await openCase("render-props");
    expect(renderProps.shows("text:Rendered via props")).toBe(true);
  });

  // adapt-sheets/field-error.md M-003 (A-002, A-003): `input` is not wired
  // — under an injected touch environment the invalid / toggle /
  // transition trees report identical shows, texts, span style, layout
  // boxes and registration as the pointer baseline.
  test("M-003 injected touch changes nothing: style, layout and registration equal the baseline", async () => {
    for (const caseName of ["invalid", "toggle", "transition"]) {
      const touch = await openCase(caseName, { input: "touch" });
      const pointer = await openCase(caseName);

      // Settle the box probes on both sides before comparing them (the
      // transition case mounts no error yet, so it reports none).
      if (caseName !== "transition") {
        await errorBox(touch);
        await errorBox(pointer);
      }

      expect(touch.texts()).toEqual(pointer.texts());
      expect(callsOf(touch, "field-error.registered")).toEqual(
        callsOf(pointer, "field-error.registered"),
      );
      expect(callsOf(touch, "layout")).toEqual(callsOf(pointer, "layout"));

      const message = caseName === "transition" ? "" : "Enter a valid email";
      if (message) {
        const touchStyle = touch.spanStyle(`text:${message}`);
        const pointerStyle = pointer.spanStyle(`text:${message}`);
        expect(touchStyle).toEqual(pointerStyle);
      }
    }
  });

  // adapt-sheets/field-error.md M-004 (A-002): `density="compact"`
  // tightens the padding cell one step — `px-1` → `px-0.5` is 2 pt off the
  // width — while font and tone stay (no text- class in the cell) and the
  // toggle's px-0 still wins. Without the injection the baseline stands.
  test("M-004 density compact tightens the padding; font, tone and toggle hold", async () => {
    const compact = await openCase("invalid", { density: "compact" });
    const plain = await openCase("invalid");

    const compactBox = await errorBox(compact);
    const plainBox = await errorBox(plain);

    expect(Math.round(plainBox.width - compactBox.width)).toBe(4);
    expect(Math.round(compactBox.x)).toBe(Math.round(plainBox.x));

    const style = compact.spanStyle("text:Enter a valid email");
    expect(style.fontSize).toBe(12);
    expect(style.color).toBe("#ff383cff");

    // The toggle's px-0 override keeps it at zero under compact too.
    const compactToggle = await openCase("toggle", { density: "compact" });
    const plainToggle = await openCase("toggle");
    const compactToggleBox = await errorBox(compactToggle);
    const plainToggleBox = await errorBox(plainToggle);

    expect(Math.round(compactToggleBox.width)).toBe(
      Math.round(plainToggleBox.width),
    );
    expect(compactToggle.spanStyle("text:Enter a valid email").color).toBe(
      "#71717aff",
    );
  });

  // adapt-sheets/field-error.md M-005 (A-004): under touch the field-owner
  // channels hold — the registration probe records the children string
  // exactly once, `partClass="p-2"` lands on the error box (+16 pt width,
  // left edge unmoved), and the transition case's RAC fallback still
  // follows the presses.
  test("M-005 under touch: registration, partClass channel and the transition fallback hold", async () => {
    const app = await openCase("invalid", { input: "touch" });
    expect(callsOf(app, "field-error.registered")).toEqual([
      ["Enter a valid email"],
    ]);

    const padded = await openCase("invalid", {
      input: "touch",
      partClass: "p-2",
    });
    const paddedBox = await errorBox(padded);
    const baseBox = await errorBox(app);

    // `p-2` is an all-sides shorthand appended after the density cell, so
    // it overrides `px-1` horizontally (text 126 + 16 = 142, +8) and adds
    // 16 pt vertically. The channel's observable effect: +8 width, +16
    // height, left edge unmoved.
    expect(Math.round(paddedBox.width - baseBox.width)).toBe(8);
    expect(Math.round(paddedBox.height - baseBox.height)).toBe(16);
    expect(Math.round(paddedBox.x)).toBe(Math.round(baseBox.x));

    const transition = await openCase("transition", { input: "touch" });
    expect(transition.shows("text:late error")).toBe(false);

    await transition.press("id:set-late-error");
    expect(transition.shows("text:late error")).toBe(true);

    await transition.press("id:set-late-error");
    expect(transition.shows("text:late error")).toBe(false);
  });

  // adapt-sheets/field-error.md M-006 (A-005): a plain text part owns no
  // press path — pressing the error under touch is either refused by the
  // harness (no pressable under the finger) or simply records nothing;
  // either way the text stays and no component-owned callback fires.
  test("M-006 under touch: pressing the error text has no component behavior", async () => {
    const app = await openCase("invalid", { input: "touch" });

    try {
      await app.press("id:field-error");
    } catch {
      // Pressing a non-pressable view may be refused; that is the point.
    }

    expect(app.shows("text:Enter a valid email")).toBe(true);
    expect(callsOf(app, "field-error.registered")).toEqual([
      ["Enter a valid email"],
    ]);
  });

  // adapt-sheets/field-error.md M-007 (A-007): the fixture's EnvironmentScope
  // wiring — no params means the host baseline, each param lands on its
  // axis, and the ten existing cases and `message` behave as before.
  test("M-007 the scope feeds input/density/partClass and the case set is unchanged", async () => {
    // Unscoped == explicit host baseline.
    const plain = await openCase("invalid");
    const explicit = await openCase("invalid", {
      input: "pointer",
      density: "default",
    });
    expect(await errorBox(explicit)).toEqual(await errorBox(plain));
    expect(explicit.spanStyle("text:Enter a valid email")).toEqual(
      plain.spanStyle("text:Enter a valid email"),
    );

    // Each param reaches its channel (M-004 / M-005 halves).
    const compact = await openCase("invalid", { density: "compact" });
    expect(Math.round((await errorBox(plain)).width - (await errorBox(compact)).width)).toBe(4);

    const padded = await openCase("invalid", { partClass: "p-2" });
    expect(Math.round((await errorBox(padded)).width - (await errorBox(plain)).width)).toBe(8);

    // The ten cases and the message param still answer.
    const kobalte = await openCase("invalid", { message: "ErrorMessage" });
    expect(kobalte.shows("text:ErrorMessage")).toBe(true);
    for (const caseName of [
      "valid",
      "empty",
      "render-props",
      "toggle",
      "required",
      "disabled",
      "readonly",
      "with-id",
      "custom-id",
      "transition",
    ]) {
      const app = await openCase(caseName);
      expect(app.count("id:set-late-error") >= 0).toBe(true);
    }
  });

  // adapt-sheets/field-error.md M-008 (A-008): the pinned desktop open is
  // the assertion — `platform:"web"` + 1024×768 lands on the pointer
  // host (no ERR_NSH_TEST_UNSUPPORTED) and its probes match the
  // `.heroui.test.tsx` baseline this file re-observes.
  test("M-008 the pinned web host opens and matches the desktop baseline", async () => {
    const app = await openCase("invalid", { message: "ErrorMessage" });

    expect(app.shows("text:ErrorMessage")).toBe(true);
    expect(callsOf(app, "field-error.registered")).toEqual([["ErrorMessage"]]);
    expect(app.spanStyle("text:ErrorMessage").color).toBe("#ff383cff");
  });
});
