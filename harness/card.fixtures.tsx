import { host, mount, View } from "nsh";
import type { JSX } from "nsh";
import { Card, EnvironmentScope } from "@heroui/react";
import { probe } from "@scenario/probe";

/*
 * NSH-only Card fixture (port sheet 4b, T-002 and T-005), not a shared
 * scenario: the upstream cases assert `data-slot` on the root and on each
 * sub-part, which D18 drops, so this fixture puts `testID` on the parts that
 * carried a slot and the tests read those instead.
 *
 * host.params.case picks the shape:
 *   basic      the upstream T-002 JSX with `testID="card"` on the root
 *   structure  the upstream T-005 JSX with a test id on every part
 *   mobile     the adapt-sheet §4 structure under `EnvironmentScope`:
 *              Header(Title+Description) / Content(two fixed-height probes) /
 *              Footer, every part reporting its `onLayout` box through the
 *              `layout` probe; `host.params.press === "1"` attaches the
 *              caller `onPress` probe to the root (M-004's pass-through half)
 *   mobile-variants  the four `variant` values under the same scope, for the
 *              bg-slot baseline half of M-004
 *
 * `host.params.input` / `host.params.density` feed `EnvironmentScope`; an
 * absent param keeps the host-derived value, so a `mobile*` case opened
 * without them is the desktop-parity baseline (pointer + default density).
 *
 * It sits next to harness/nsh.json on purpose: NSH takes the entry's own
 * directory as the app root, so an entry under harness/tests/... finds no
 * nsh.json and loses the `@heroui/react` alias and the theme.
 */

type LayoutEvent = {
  bounds: {
    origin: { x: number; y: number };
    size: { width: number; height: number };
  };
};

/** A full bounds box; the mobile assertions compute padding and gaps from it. */
function boxProbe(name: string) {
  return (event: LayoutEvent) =>
    probe("layout")({
      name,
      x: event.bounds.origin.x,
      y: event.bounds.origin.y,
      width: event.bounds.size.width,
      height: event.bounds.size.height,
    });
}

function Basic() {
  return (
    <View class="p-4">
      <Card testID="card">Body</Card>
    </View>
  );
}

function Structure() {
  return (
    <View class="p-4">
      <Card testID="card">
        <Card.Header testID="card-header">
          <Card.Title testID="card-title">Slot title</Card.Title>
          <Card.Description testID="card-description">Slot description</Card.Description>
        </Card.Header>
        <Card.Content testID="card-content">Slot content</Card.Content>
        <Card.Footer testID="card-footer">Slot footer</Card.Footer>
      </Card>
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Mobile-environment cases (adapt-sheets/card.md §4 M-001…M-005)
 * -----------------------------------------------------------------------------------------------*/

/**
 * The card the mobile assertions measure: Header / Content / Footer as the
 * root's three flex-column blocks, two fixed-height probe children inside
 * Content so the content slot's own gap is a box-to-box distance, and one in
 * Footer so the footer has a definite height. `press` attaches the caller's
 * `onPress` probe to the root — the pass-through channel M-004/M-005 read.
 */
function MobileCase(props: { press?: boolean }) {
  return (
    <View class="p-6">
      <Card
        testID="card-mobile"
        onLayout={boxProbe("root")}
        onPress={props.press ? probe("onPress") : undefined}
      >
        <Card.Header testID="card-header" onLayout={boxProbe("header")}>
          <Card.Title testID="card-title">Mobile title</Card.Title>
          <Card.Description testID="card-desc">Mobile description</Card.Description>
        </Card.Header>
        <Card.Content testID="card-content" onLayout={boxProbe("content")}>
          <View class="h-4" onLayout={boxProbe("content-a")} />
          <View class="h-4" onLayout={boxProbe("content-b")} />
        </Card.Content>
        <Card.Footer testID="card-footer" onLayout={boxProbe("footer")}>
          <View class="h-4" onLayout={boxProbe("footer-a")} />
        </Card.Footer>
      </Card>
    </View>
  );
}

/** The four upstream variants side by side, for M-004's unchanged-appearance half. */
function VariantsCase() {
  return (
    <View class="flex-col gap-4 p-6">
      <Card variant="default" testID="card-v-default">Default</Card>
      <Card variant="secondary" testID="card-v-secondary">Secondary</Card>
      <Card variant="tertiary" testID="card-v-tertiary">Tertiary</Card>
      <Card variant="transparent" testID="card-v-transparent">Transparent</Card>
    </View>
  );
}

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

  if (name === "mobile") {
    const press = String(host.params.press ?? "") === "1";

    return (
      <ScopedMobile>
        <MobileCase press={press} />
      </ScopedMobile>
    );
  }

  if (name === "mobile-variants") {
    return (
      <ScopedMobile>
        <VariantsCase />
      </ScopedMobile>
    );
  }

  return name === "structure" ? <Structure /> : <Basic />;
}

mount(Fixture);
