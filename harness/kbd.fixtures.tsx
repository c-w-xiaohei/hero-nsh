import { host, mount, platform, Text, View } from "nsh";
import type { Component, JSX } from "nsh";
import { EnvironmentScope, Kbd } from "@heroui/react";
import type { KbdKey } from "@heroui/react";
import { probe } from "@scenario/probe";

/*
 * NSH-only fixture for the kbd adapt unit (adapt-sheets/kbd.md §2
 * A-001…A-009, §4 M-001…M-007). Every sheet 落点 is 保留: kbd is a pure
 * display component — no `input`/`density` axis lands in its variant table,
 * no gesture path exists, no presentation seam applies — so this fixture is
 * the observable half of "键帽形貌与按键提示两端恒定".
 *
 * `host.params.case` picks the shape:
 *
 *   basic      `<Kbd>` with Abbr `command` + Content "K": `testID`s and a
 *              root `onLayout` -> `layout` report give M-001's 24 pt height
 *              pin and M-003/M-004's cross-environment geometry compare;
 *              `spanStyle` on the parts' texts reads the 14 pt font size.
 *   keys       All 23 `KbdKey` glyphs mounted, so M-001's full-table mount
 *              is one `texts()`/`shows` sweep.
 *   variants   The default and `light` rows side by side, each with its own
 *              `testID` and `layout` report (M-002, M-003).
 *   inline     A `Kbd` inside a `Text` line (the docs InlineUsage shape),
 *              showing the row context stays rendered in both environments.
 *   bare-text  Bare string `Esc` and number `42` root children: the
 *              `renderChildren` path M-002 pins.
 *   title      A lone `Kbd.Abbr keyValue="command"`: its `title` channel
 *              (tooltip + accessibilityHint) is what M-006 hovers for in
 *              both environments.
 *
 * `host.params.input` / `host.params.density` feed `EnvironmentScope`; an
 * absent param keeps the host-derived value, so a case opened without them
 * is the desktop-parity baseline (same convention as
 * `breadcrumbs.fixtures.tsx`). It sits next to harness/nsh.json on purpose:
 * NSH takes the entry's own directory as the app root, so an entry under
 * harness/tests/... finds no nsh.json and loses the `@heroui/react` alias
 * and the theme.
 */

type LayoutEvent = {
  bounds: {
    origin: { x: number; y: number };
    size: { width: number; height: number };
  };
};

/** A full bounds box; M-001 pins `height`, the env compares diff the rest. */
function layoutProbe(name: string) {
  return (event: LayoutEvent) =>
    probe("layout")({
      name,
      x: event.bounds.origin.x,
      y: event.bounds.origin.y,
      width: event.bounds.size.width,
      height: event.bounds.size.height,
    });
}

/* -------------------------------------------------------------------------------------------------
 * basic (M-001, M-003, M-004, M-005)
 * -----------------------------------------------------------------------------------------------*/

function BasicCase() {
  return (
    <Kbd testID="kbd-basic" onLayout={layoutProbe("kbd-basic")}>
      <Kbd.Abbr keyValue="command" testID="abbr-basic" />
      <Kbd.Content testID="content-basic">K</Kbd.Content>
    </Kbd>
  );
}

/* -------------------------------------------------------------------------------------------------
 * keys (M-001): every KbdKey, one root each, so the whole glyph table mounts
 * -----------------------------------------------------------------------------------------------*/

const KEYS: KbdKey[] = [
  "command",
  "shift",
  "ctrl",
  "option",
  "enter",
  "delete",
  "escape",
  "tab",
  "capslock",
  "up",
  "right",
  "down",
  "left",
  "pageup",
  "pagedown",
  "home",
  "end",
  "help",
  "space",
  "fn",
  "win",
  "alt",
];

function KeysCase() {
  return (
    <View class="flex-row flex-wrap gap-2">
      {KEYS.map((key) => (
        <Kbd testID={`kbd-${key}`} onLayout={layoutProbe(`kbd-${key}`)}>
          <Kbd.Abbr keyValue={key} testID={`abbr-${key}`} />
        </Kbd>
      ))}
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * variants (M-002, M-003): the default and light rows side by side
 * -----------------------------------------------------------------------------------------------*/

function VariantsCase() {
  return (
    <View class="flex-col items-start gap-2">
      <Kbd testID="kbd-default" onLayout={layoutProbe("kbd-default")}>
        <Kbd.Abbr keyValue="command" testID="abbr-default" />
        <Kbd.Content>K</Kbd.Content>
      </Kbd>
      <Kbd
        variant="light"
        testID="kbd-light"
        onLayout={layoutProbe("kbd-light")}
      >
        <Kbd.Abbr keyValue="command" testID="abbr-light" />
        <Kbd.Content>K</Kbd.Content>
      </Kbd>
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * inline (M-002, M-003): a Kbd inside a Text line
 * -----------------------------------------------------------------------------------------------*/

function InlineCase() {
  return (
    <Text class="text-sm" testID="inline-line">
      Press{" "}
      <Kbd testID="kbd-inline" onLayout={layoutProbe("kbd-inline")}>
        <Kbd.Content>Esc</Kbd.Content>
      </Kbd>{" "}
      to close the dialog.
    </Text>
  );
}

/* -------------------------------------------------------------------------------------------------
 * bare-text (M-002, M-003): bare string and number root children
 * -----------------------------------------------------------------------------------------------*/

function BareTextCase() {
  return (
    <View class="flex-col items-start gap-2">
      <Kbd testID="kbd-esc" onLayout={layoutProbe("kbd-esc")}>
        Esc
      </Kbd>
      <Kbd testID="kbd-num" onLayout={layoutProbe("kbd-num")}>
        42
      </Kbd>
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * title (M-006): the abbreviation whose `title` channel the test hovers for
 * -----------------------------------------------------------------------------------------------*/

function TitleCase() {
  return (
    <Kbd testID="kbd-title">
      <Kbd.Abbr keyValue="command" testID="abbr-title" />
    </Kbd>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Cases table + scope
 * -----------------------------------------------------------------------------------------------*/

const cases: Record<string, Component> = {
  basic: BasicCase,
  keys: KeysCase,
  variants: VariantsCase,
  inline: InlineCase,
  "bare-text": BareTextCase,
  title: TitleCase,
};

/**
 * `host.params.input` / `host.params.density` feed `EnvironmentScope`; an
 * absent param keeps the host-derived value, so a case opened without them
 * is the desktop-parity baseline.
 */
function ScopedMobile(props: { children?: JSX.Element }) {
  const input = String(host.params.input ?? "");
  const density = String(host.params.density ?? "");

  return (
    <EnvironmentScope
      input={input === "touch" || input === "pointer" ? input : undefined}
      density={density === "compact" || density === "default" ? density : undefined}
    >
      {props.children}
    </EnvironmentScope>
  );
}

function Fixture() {
  const name = String(host.params.case ?? "basic");
  const Case = cases[name] ?? BasicCase;

  // The host's own platform report: M-007's desktop-pin assertion reads it —
  // under the `platform:"windows"` pin `desktop` is true on both targets,
  // while the unpinned headless engine would report the phone host.
  probe("env")({ os: platform.os, desktop: platform.desktop });

  return (
    <View class="flex-1 items-start bg-background p-6">
      <ScopedMobile>
        <Case />
      </ScopedMobile>
    </View>
  );
}

mount(Fixture);
