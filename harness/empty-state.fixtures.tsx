import { host, mount, Text, View } from "nsh";
import type { JSX } from "nsh";
import { Button, EmptyState, EnvironmentScope } from "@heroui/react";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";

/*
 * NSH-only EmptyState fixtures (port sheet 4b, T-003 and X-001; adapt sheet
 * A-006 / A-007, assertions M-001…M-008).
 *
 * `View` and `accessibilityLabel` are not HeroUI props, so these cases cannot
 * live in a shared scenario: the reference app would receive an unknown
 * element or attribute. `host.params.case` picks the case:
 *
 *   inherited   an EmptyState and a plain Text under class="text-lg"; the
 *               plain child inherits 18, so a 14 on the EmptyState text can
 *               only come from the block's own text-sm (R-002), not from the
 *               harness default
 *   aria-label  aria-label on the root next to a different caller
 *               accessibilityLabel; the aria name must win, as in Skeleton
 *   press       a root carrying the caller's `onPress` probe and a Button
 *               child: the caller-composed interactive (sheet A-002) the
 *               container must not wrap, gate or relay; it sits `absolute`
 *               top-right so a press at the root's center lands on the text
 *               and stays the caller's own
 *   layout      a `size-10` child inside the auto-width root; `onLayout`
 *               bounds are parent-relative, so the child's x/y are the
 *               top-left padding directly and the right/bottom paddings fall
 *               out of the root's own bounds — the four sides the density
 *               axis varies (sheet A-001)
 *
 * Every case mounts under `ScopedMobile` (sheet A-006): `host.params.input` /
 * `host.params.density` feed `EnvironmentScope`; an absent param keeps the
 * host-derived value, so a case opened without them is the desktop-parity
 * baseline the mobile assertions compare against.
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

/** A full bounds box, named per probe call (breadcrumbs.fixtures.tsx's shape). */
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

function InheritedCase() {
  return (
    <Stage>
      <View class="text-lg">
        <EmptyState />
        <Text>plain</Text>
      </View>
    </Stage>
  );
}

function AriaLabelCase() {
  return (
    <Stage>
      <EmptyState accessibilityLabel="Fallback name" aria-label="No search results">
        Nothing here
      </EmptyState>
    </Stage>
  );
}

/**
 * The press case (sheet A-002 / A-003 / A-004, assertions M-002 / M-006 /
 * M-007): the caller's `onPress` probe and a caller-composed `Button` in the
 * same root. The button is `absolute` top-right and the root is widened
 * (`w-64`) so the root's center — where `--target web`'s real click lands —
 * stays clear of it: a press there must record the caller's probe exactly
 * once, with the component adding no feedback path of its own. The children
 * are the literal default text plus the button (an array, mapped by
 * `renderChildren`), which is also what lets M-007 read the rendered copy
 * unchanged next to the interactive child.
 */
function PressCase() {
  return (
    <Stage>
      <EmptyState
        className="relative w-64"
        testID="press-root"
        onPress={probe("onPress")}
        onLayout={boxProbe("root")}
      >
        No results found
        <Button className="absolute right-2 top-2">Action</Button>
      </EmptyState>
    </Stage>
  );
}

/**
 * The layout case (sheet A-001, assertions M-001 / M-003 / M-004 / M-005): a
 * `size-10` child is shrink-wrapped by the auto-width root (the stage's
 * `items-start` keeps it out of the stretch path). `onLayout` reports bounds
 * relative to the view's parent, so the child's x/y are the root's top-left
 * padding directly and `root - child` gives the far sides. A `View`, not a
 * `Text`, so the case adds no on-screen text (M-002's inline-render check).
 */
function LayoutCase() {
  return (
    <Stage>
      <EmptyState testID="layout-root" onLayout={boxProbe("root")}>
        <View class="size-10" onLayout={boxProbe("content")} />
      </EmptyState>
    </Stage>
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
  const name = String(host.params.case ?? "inherited");

  if (name === "aria-label") {
    return (
      <ScopedMobile>
        <AriaLabelCase />
      </ScopedMobile>
    );
  }

  if (name === "press") {
    return (
      <ScopedMobile>
        <PressCase />
      </ScopedMobile>
    );
  }

  if (name === "layout") {
    return (
      <ScopedMobile>
        <LayoutCase />
      </ScopedMobile>
    );
  }

  return (
    <ScopedMobile>
      <InheritedCase />
    </ScopedMobile>
  );
}

mount(Fixture);
