import { expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

/*
 * HeroUI 3.2.7 regression cases for Avatar / AvatarGroup, per port sheet 4b
 * (T-001, T-003, T-006 … T-015).
 *
 * Deleted there: T-002, T-004 and T-005 assert `data-slot`, BEM class names or a
 * `data-*` attribute, which D18 drops. T-016 … T-020 are browser pixel probes
 * converted to screenshots (no mask / clip-path on NSH, R-034): their scenarios
 * are avatar/group-ring, avatar/group-grid, avatar/group-sizes,
 * avatar/group-colors, avatar/group-variants and avatar/group-overlap-lab.
 *
 * Class assertions become visible consequences. Color cases read the resolved
 * fallback span color; group geometry is measured through onLayout in
 * harness/avatar.fixtures.tsx (see the port sheet's NSH-only fixture table).
 *
 * Resolved on the harness theme (hero-nsh.theme.json):
 * accent-soft-foreground #1e63aeff.
 */
const ACCENT_SOFT_FOREGROUND = "#1e63aeff";

type LayoutCall = { name: string; x: number; width: number; height: number };

function openFixture(name: string) {
  return open("../../../avatar.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    host: { params: { fixture: name } },
  });
}

function lastLayout(app: App, name: string): LayoutCall {
  const calls = callsOf(app, "layout")
    .map((args) => args[0] as LayoutCall)
    .filter((call) => call.name === name);
  const found = calls[calls.length - 1];

  if (!found) throw new Error(`no layout call recorded for ${name}`);

  return found;
}

// heroui/packages/react/tests/components/avatar/avatar.test.tsx:6
test("T-001 renders fallback text content", async () => {
  const app = await openScenario("avatar/basic");

  expect(app.shows("text:JD")).toBe(true);
});

// heroui/packages/react/tests/components/avatar/avatar.test.tsx:26
// Rewritten port (port sheet T-003): upstream asserts that the fallback carries
// the `avatar__fallback--accent` BEM modifier. NSH does not project class names,
// so the case reads the modifier's visible effect: the five `color` values
// resolve to five different text colors, with accent fixed to the theme's
// resolved accent-soft-foreground. A color mapping that is missing falls back
// to the default text color, which collapses the set below five and makes the
// success / warning / danger comparisons fail.
test("T-003 exposes color fallback modifier", async () => {
  const app = await openScenario("avatar/colors");

  const defaultColor = app.spanStyle("text:A").color;
  const accentColor = app.spanStyle("text:B").color;
  const successColor = app.spanStyle("text:C").color;
  const warningColor = app.spanStyle("text:D").color;
  const dangerColor = app.spanStyle("text:E").color;

  expect(accentColor).toBe(ACCENT_SOFT_FOREGROUND);

  for (const color of [successColor, warningColor, dangerColor]) {
    expect(color).not.toBe(defaultColor);
  }

  expect(new Set([defaultColor, accentColor, successColor, warningColor, dangerColor]).size).toBe(5);
});

// heroui/packages/react/tests/components/avatar-group/avatar-group.test.tsx:7
// Partial port (port sheet T-006): the upstream case asserts `data-slot`,
// the `avatar-group` block class and the default `avatar-group--clip` modifier.
// D18 drops the first two. The third one means the default overlap is 8pt, so
// the fixture measures it: the second md avatar starts 40 - 8 = 32 points after
// the first.
test("T-006 exposes data-slot and BEM block", async () => {
  const app = await openFixture("geometry-overlap");

  const first = lastLayout(app, "first");
  const second = lastLayout(app, "second");

  expect(second.x - first.x).toBe(32);
});

// heroui/packages/react/tests/components/avatar-group/avatar-group.test.tsx:23
// Partial port (port sheet T-007): the two upstream assertions are class-name
// checks for `avatar-group--ring` and the absence of `avatar-group--clip`. The
// visible contract is kept: with overlap="ring" the two md avatars still
// overlap by 8pt, so the second starts 32 points after the first and both
// render. The 2pt background ring is checked by screenshots on the web target
// and by the Windows spot check.
test("T-007 applies overlap=ring BEM modifier", async () => {
  const app = await openFixture("geometry-ring");

  const first = lastLayout(app, "first");
  const second = lastLayout(app, "second");

  expect(second.x - first.x).toBe(32);
  expect(app.shows("id:first")).toBe(true);
  expect(app.shows("id:second")).toBe(true);
});

// heroui/packages/react/tests/components/avatar-group/avatar-group.test.tsx:38
test("T-008 without max, renders all avatars and no auto count", async () => {
  const app = await openScenario("avatar/group-all");

  expect(app.shows("text:A")).toBe(true);
  expect(app.shows("text:B")).toBe(true);
  expect(app.shows("text:C")).toBe(true);
  expect(app.shows("text:D")).toBe(true);
  expect(app.shows("text:E")).toBe(true);
  expect(app.shows("text:F")).toBe(true);
  // Upstream's last assertion is that no `avatar-group-count` element exists.
  // Its visible consequence is that no `+N` text is rendered at all.
  expect(app.texts().some((text) => text.startsWith("+"))).toBe(false);
});

// heroui/packages/react/tests/components/avatar-group/avatar-group.test.tsx:71
// Partial port (port sheet T-009): the `data-slot="avatar-group-count"`
// existence assertion is dropped; its visible result is the `+2` text, which is
// asserted here.
test("T-009 max truncates extra avatars and auto-appends +N count", async () => {
  const app = await openScenario("avatar/group-max");

  expect(app.shows("text:A")).toBe(true);
  expect(app.shows("text:B")).toBe(true);
  expect(app.shows("text:C")).toBe(false);
  expect(app.shows("text:D")).toBe(false);
  expect(app.shows("text:+2")).toBe(true);
});

// heroui/packages/react/tests/components/avatar-group/avatar-group.test.tsx:97
test("T-010 renders an explicit Count child with no max", async () => {
  const app = await openScenario("avatar/group-count");

  expect(app.shows("text:A")).toBe(true);
  expect(app.shows("text:B")).toBe(true);
  expect(app.shows("text:C")).toBe(true);
  expect(app.shows("text:+9")).toBe(true);
  // Upstream counts the `avatar-group-count` elements; the text count is the
  // same measure of "exactly one count rendered".
  expect(app.count("text:+9")).toBe(1);
});

// heroui/packages/react/tests/components/avatar-group/avatar-group.test.tsx:120
test("T-011 explicit Count suppresses auto count when max is also set", async () => {
  const app = await openScenario("avatar/group-count-max");

  expect(app.shows("text:A")).toBe(true);
  expect(app.shows("text:B")).toBe(true);
  expect(app.shows("text:C")).toBe(false);
  expect(app.shows("text:D")).toBe(false);
  expect(app.shows("text:+99")).toBe(true);
  expect(app.shows("text:+2")).toBe(false);
  expect(app.count("text:+99")).toBe(1);
});

// heroui/packages/react/tests/components/avatar-group/avatar-group.test.tsx:148
// Rewritten port (port sheet T-012): upstream asserts the `avatar-group--grid`
// modifier and the still-present clip modifier. The visible effect of isGrid is
// no overlap and a 12pt gap instead of the 8pt overlap, so the second md avatar
// starts 40 + 12 = 52 points after the first.
test("T-012 exposes isGrid BEM modifier", async () => {
  const app = await openFixture("geometry-grid");

  const first = lastLayout(app, "first");
  const second = lastLayout(app, "second");

  expect(second.x - first.x).toBe(52);
});

// heroui/packages/react/tests/components/avatar-group/avatar-group.test.tsx:164
// Rewritten port (port sheet T-013): upstream asserts the child Avatar's
// `avatar--sm` class. The class carries the group's size, whose visible effect
// is the avatar's width: 32 / 40 / 48 points for sm / md / lg. A size that is
// not passed down stays at the md default of 40.
test("T-013 passes size via context to child Avatars", async () => {
  const app = await openFixture("geometry-sizes");

  const sm = lastLayout(app, "sm");
  const md = lastLayout(app, "md");
  const lg = lastLayout(app, "lg");

  expect(sm.width).toBe(32);
  expect(md.width).toBe(40);
  expect(lg.width).toBe(48);
});

// heroui/packages/react/tests/components/avatar-group/avatar-group.test.tsx:178
// Rewritten port (port sheet T-014): upstream asserts the child fallback's
// `avatar__fallback--accent` class. Each of the five groups carries one color,
// so the fallback colors must match the Avatar color case: accent resolves to
// accent-soft-foreground and all five differ. A group that does not pass color
// down leaves every fallback at the default color, collapsing the set.
test("T-014 passes color via context to child Avatar fallbacks", async () => {
  const app = await openScenario("avatar/group-colors");

  const defaultColor = app.spanStyle("text:1").color;
  const accentColor = app.spanStyle("text:2").color;
  const successColor = app.spanStyle("text:3").color;
  const warningColor = app.spanStyle("text:4").color;
  const dangerColor = app.spanStyle("text:5").color;

  expect(accentColor).toBe(ACCENT_SOFT_FOREGROUND);
  expect(new Set([defaultColor, accentColor, successColor, warningColor, dangerColor]).size).toBe(5);
});

// heroui/packages/react/tests/components/avatar-group/avatar-group.test.tsx:192
// Partial port (port sheet T-015): the `avatar--soft` class assertion is
// dropped. `soft` turns the fallback background into the `*-soft` token, which
// `nsh test` cannot read (spanStyle reports character color, size and weight,
// not the fallback view's background); that difference is covered by the web
// screenshot and the Windows spot check. What is kept: in both groups the
// fallback text renders and resolves to the same default color.
test("T-015 group variant=soft applies avatar--soft on child", async () => {
  const app = await openScenario("avatar/group-variants");

  expect(app.shows("text:D")).toBe(true);
  expect(app.shows("text:S")).toBe(true);
  expect(app.spanStyle("text:S").color).toBe(app.spanStyle("text:D").color);
});
