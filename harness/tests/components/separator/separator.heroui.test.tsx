import { expect, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

/*
 * HeroUI 3.2.7 regression cases for Separator, per port sheet 4b
 * (T-001, T-003, T-006 … T-009). Every case keeps its upstream file:line above
 * it and its title starts with the port-sheet id. The assertions follow SOP 3.2:
 * what NSH cannot read (role, aria, tagName, data-*, BEM/module class names) is
 * replaced by the visible effect — the divider is on screen, there is exactly
 * one of it, or its geometry matches the orientation. The partial ports say
 * which assertions stay unread, and T-004 turns into a screenshot case that the
 * current acceptance does not run (port sheet §5).
 */

type LayoutCall = { name: string; x: number; y: number; width: number; height: number };

function lastLayout(app: App, name: string): LayoutCall {
  const calls = callsOf(app, "layout")
    .map((args) => args[0] as LayoutCall)
    .filter((call) => call.name === name);
  const found = calls[calls.length - 1];

  if (!found) throw new Error(`no layout call recorded for ${name}`);

  return found;
}

// heroui/packages/react/tests/components/separator/separator.test.tsx:8
// Partial port (port sheet T-001): the upstream case asserts role="separator".
// NSH's AccessibilityRole has no separator and nsh/test cannot query roles, so
// the assertion that survives is that the divider is on screen.
test("T-001 renders with separator role", async () => {
  const app = await openScenario("separator/default");

  expect(app.shows("id:separator")).toBe(true);
});

// heroui/packages/react/tests/components/separator/separator.test.tsx:22
// Rewritten port (port sheet T-003): upstream asserts data-orientation="vertical"
// and the separator--vertical BEM modifier, neither of which NSH has. Their user
// visible effect is the vertical line's geometry inside the docs' 20-point row:
// 1 point wide, stretched to the row height. A missing vertical variant would
// give width 300 and height 1.
test("T-003 exposes orientation BEM modifier and data attribute", async () => {
  const app = await openScenario("separator/vertical");
  const divider = lastLayout(app, "vertical");

  expect(divider.width).toBe(1);
  expect(divider.height).toBe(20);
});

for (const orientation of ["horizontal", "vertical"] as const) {
  // heroui/packages/react/tests/components/separator/separator.test.tsx:44
  // Partial port (port sheet T-006): upstream runs horizontal and vertical and
  // asserts tagName, aria-hidden, the absent aria-orientation, the absent
  // separator role, data-slot, data-orientation, the BEM modifier and the absent
  // isDecorative attribute — eight assertions that NSH cannot read. What stays:
  // the decorative divider is on screen and there is exactly one of it.
  test(`T-006 renders a decorative ${orientation} divider without separator semantics`, async () => {
    const app = await openScenario(
      orientation === "horizontal" ? "separator/decorative" : "separator/decorative-vertical",
    );

    expect(app.shows("id:divider")).toBe(true);
    expect(app.count("id:divider")).toBe(1);
  });
}

// heroui/packages/react/tests/components/separator/separator.test.tsx:61
// Partial port (port sheet T-007): elementType="hr" only changes the tag name
// and the aria/role decorations upstream. NSH has one host view and no tag name,
// so elementType has no effect; the assertion that survives is that the
// decorative divider still renders.
test("T-007 supports an explicit element type for decorative dividers", async () => {
  const app = await openScenario("separator/decorative-hr");

  expect(app.shows("id:divider")).toBe(true);
});

for (const isDecorative of [false, true] as const) {
  // heroui/packages/react/tests/components/separator/separator.test.tsx:69
  // Partial port (port sheet T-008): upstream runs both isDecorative values and
  // asserts the ref equals the DOM node, class names, and three aria/role
  // attributes per run. NSH has no DOM node, no render replacement and no role
  // queries, so the scenario applies the same className, orientation and variant
  // directly and the one assertion left is that the divider still renders.
  test(`T-008 supports custom renders and refs with isDecorative=${isDecorative}`, async () => {
    const app = await openScenario(
      isDecorative ? "separator/custom-vertical-decorative" : "separator/custom-vertical",
    );

    expect(app.shows("id:custom-divider")).toBe(true);
  });
}

// heroui/packages/react/tests/components/separator/separator.test.tsx:100
// Partial port (port sheet T-009): upstream asserts role and the absent
// aria-hidden after switching isDecorative off, both unreadable in NSH. What
// survives is the switch itself: the divider renders decorated, and still
// renders after the Button flips the signal to semantic.
test("T-009 supports switching between decorative and semantic dividers", async () => {
  const app = await openScenario("separator/toggle");

  expect(app.count("id:divider")).toBe(1);

  await app.press("id:toggle");

  expect(app.shows("id:divider")).toBe(true);
});

// Ref forwarding regression: this scenario passes no ref to Separator. NSH
// treats a plain `ref={local.ref}` with an undefined value as a ref store and
// throws at mount on the web target, leaving the page empty. The forwarded
// callback ref keeps the divider mounted on every target.
test("X-010 renders a ref-less Separator on a real engine", async () => {
  const app = await openScenario("separator/default");

  expect(app.shows("id:separator")).toBe(true);
});
