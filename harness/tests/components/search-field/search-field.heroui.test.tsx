import { expect, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";
import { lastGroup, lastInput, lastRoot } from "../../testers/search-field";

/*
 * HeroUI 3.2.7 regression cases for SearchField, per port sheet 4b
 * (T-001, T-004 … T-008). T-002 / T-003 are deleted there: they assert BEM
 * classes and `data-slot` attributes, which D18 drops. T-009 moves focus with
 * Tab and lives in the `.web.` file ("Real hosts" in the loop brief).
 *
 * Every case runs headless on the default desktop platform
 * (`platform: "windows"`): typing focuses an Input on every platform, and no
 * case here needs Tab focus movement. The render-prop probes come from
 * `harness/tests/testers/search-field.ts`; the scenarios are shared with the
 * reference package except the `.split` ones (D17 accessors).
 *
 * The `S-` cases at the end are this unit's supplement for the core SearchField
 * behaviour HeroUI's own nine cases do not cover (port sheet 4b, closing note).
 * They carry no upstream `T-` number on purpose.
 */

// heroui/packages/react/tests/components/search-field/search-field.test.tsx:28
test("T-001 renders search role with accessible name", async () => {
  const app = await openScenario("search-field/basic");

  // NSH's role model has no `searchbox`; the Label text reaches the Input as
  // its accessibilityLabel, which is what `label:` matches.
  expect(app.shows("label:Search")).toBe(true);
});

// heroui/packages/react/tests/components/search-field/search-field.test.tsx:53
test("T-004 supports typing and calls onChange", async () => {
  const app = await openScenario("search-field/typing");

  await app.type("label:Search", "hero");

  expect(app.value("label:Search")).toBe("hero");
  expect(callsOf(app, "onChange").at(-1)?.[0]).toBe("hero");
});

// heroui/packages/react/tests/components/search-field/search-field.test.tsx:64
test("T-005 supports clearing via the clear button when non-empty", async () => {
  const app = await openScenario("search-field/clear");

  // Existence and default accessible name are two facts upstream; the `label:`
  // count is the view, the named selector proves "Clear search" reached it.
  expect(app.count("role:button")).toBe(1);
  expect(app.shows("role:button[Clear search]")).toBe(true);

  await app.press("role:button[Clear search]");

  expect(app.value("label:Search")).toBe("");
  expect(callsOf(app, "onChange").at(-1)?.[0]).toBe("");
});

// heroui/packages/react/tests/components/search-field/search-field.test.tsx:81
// Rewritten port (port sheet T-006): upstream reads the root's `data-empty`
// before and after the clear press. NSH has no such attribute, so the shared
// state behind it is read from the Root render prop. The CSS half
// (`opacity: 0`, `pointer-events: none`, R-004) is paint and is not readable
// here; `app.press` does no pointer hit testing either, so it cannot stand in.
test("T-006 exposes empty state when value is cleared", async () => {
  const app = await openScenario("search-field/empty.split");

  expect(lastRoot(app).isEmpty).toBe(false);

  await app.press("role:button[Clear search]");

  expect(lastRoot(app).isEmpty).toBe(true);
});

// heroui/packages/react/tests/components/search-field/search-field.test.tsx:93
// Partial port (port sheet T-007): the root's `data-disabled` attribute
// assertion is dropped (D18). The three observable facts stay: the input is
// disabled, typing leaves the value empty, and onChange never fires.
test("T-007 supports disabled state", async () => {
  const app = await openScenario("search-field/disabled");

  expect(app.enabled("label:Search")).toBe(false);

  await app.type("label:Search", "x").catch(() => undefined);

  expect(app.value("label:Search")).toBe("");
  expect(callsOf(app, "onChange")).toHaveLength(0);
});

// heroui/packages/react/tests/components/search-field/search-field.test.tsx:109
// Partial port (port sheet T-008): the root's `data-invalid` attribute is
// dropped (D18) and the visible half of R-002 takes its place: while the field
// is invalid the Description is hidden (`hidden` = display none), so its text
// is no longer on screen.
test("T-008 renders FieldError when invalid", async () => {
  const app = await openScenario("search-field/invalid");

  expect(app.shows("text:Enter at least 3 characters")).toBe(true);
  expect(app.shows("text:Search by title or author")).toBe(false);
});

/*
 * Supplement (port sheet 4b closing note): Escape clears the focused input and
 * calls `onClear`; the binding must be scoped to the focused input, so the
 * press first moves focus into it.
 */
test("S-001 clears on Escape and calls onClear", async () => {
  const app = await openScenario("search-field/escape");

  await app.press("label:Search");
  await app.keyboard.press("escape");

  expect(app.value("label:Search")).toBe("");
  expect(callsOf(app, "onClear")).toHaveLength(1);
  expect(callsOf(app, "onChange").at(-1)?.[0]).toBe("");
});

/* Supplement: Escape on an already empty value passes through (no onClear). */
test("S-002 does not call onClear when Escape meets an empty value", async () => {
  const app = await openScenario("search-field/empty.split");

  await app.press("role:button[Clear search]");
  expect(callsOf(app, "onClear")).toHaveLength(1);

  await app.press("label:Search");
  await app.keyboard.press("escape");

  expect(app.value("label:Search")).toBe("");
  expect(callsOf(app, "onClear")).toHaveLength(1);
});

/* Supplement: a read-only field disables its clear button. */
test("S-003 disables the clear button when read-only", async () => {
  const app = await openScenario("search-field/readonly");

  expect(app.value("label:Search")).toBe("hero");
  expect(app.enabled("role:button[Clear search]")).toBe(false);
});

/* Supplement: Return submits the current value through the root's onSubmit. */
test("S-004 submits the current value", async () => {
  const app = await openScenario("search-field/submit");

  await app.type("label:Search", "hero");
  await app.submit("label:Search");

  expect(callsOf(app, "onSubmit")).toHaveLength(1);
  expect(callsOf(app, "onSubmit")[0]?.[0]).toBe("hero");
});

/*
 * Supplement: a controlled value never writes itself back. Typing reports the
 * new text to onChange but the displayed value keeps the `value` prop.
 */
test("S-005 does not self-update a controlled value", async () => {
  const app = await openScenario("search-field/controlled");

  expect(app.value("label:Search")).toBe("hero");

  await app.type("label:Search", "x");

  expect(app.value("label:Search")).toBe("hero");
  expect(callsOf(app, "onChange").at(-1)?.[0]).toBe("herox");
});

/*
 * Supplement: the Group / Input render props carry the hover and focus-within
 * state the R-011 / R-012 classes are built from. The ring itself is paint.
 */
test("S-006 reports hover and focus-within through the render props", async () => {
  const app = await openScenario("search-field/focus.split");

  expect(lastGroup(app).isHovered).toBe(false);

  await app.hover("role:group");
  expect(lastGroup(app).isHovered).toBe(true);

  await app.type("label:Search", "hero");
  expect(lastGroup(app).isFocusWithin).toBe(true);
  expect(lastInput(app).isFocused).toBe(true);
});
