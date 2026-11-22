import { host, mount, Text } from "nsh";
import type { JSX } from "nsh";
import { EnvironmentScope, Surface, SurfaceContext } from "@heroui/react";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";

/*
 * NSH-only Surface fixture (adapt sheet A-005 / A-006, assertions M-001…M-006).
 *
 * A shared scenario cannot inject an environment — `EnvironmentScope` and
 * `host.params` are NSH-only — so the mobile cases live here, as in
 * breadcrumbs.fixtures.tsx / empty-state.fixtures.tsx. `host.params.case`
 * picks the case:
 *
 *   basic     a Surface with a bare string child: `renderChildren` wraps it
 *             in `Text` (the T-001 channel)
 *   variants  all four variants side by side, each `testID`-named: the
 *             variant table resolves and the transparent variant's text
 *             keeps the base `text-foreground` (the T-002 channel)
 *   press     a root carrying the caller's `onPress` probe and an `onLayout`
 *             box probe: the caller-composed interactive half of sheet A-002 —
 *             the container must record the probe exactly once per press and
 *             add no feedback or hit-area path of its own. Root `w-64` keeps
 *             the center — where `--target web`'s real click lands — on the
 *             text, not on a child
 *   context   a `SurfaceContext` consumer Text reads `variant()`: the outer
 *             `variant="secondary"` surface, then an independent inner
 *             `variant="tertiary"` surface that overrides it for its own
 *             subtree (M-003)
 *
 * Every case mounts under `ScopedMobile`: `host.params.input` /
 * `host.params.density` feed `EnvironmentScope`; an absent param keeps the
 * host-derived value, so a case opened without them is the desktop-parity
 * baseline the injected-environment assertions compare against.
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

function BasicCase() {
  return (
    <Stage>
      <Surface testID="basic-root">Panel content</Surface>
    </Stage>
  );
}

/** The four variants, `testID`-named so each block and its text are findable. */
function VariantsCase() {
  return (
    <Stage>
      <Surface testID="variant-default" className="w-64 rounded-xl p-4" variant="default">
        Default surface
      </Surface>
      <Surface testID="variant-secondary" className="w-64 rounded-xl p-4" variant="secondary">
        Secondary surface
      </Surface>
      <Surface testID="variant-tertiary" className="w-64 rounded-xl p-4" variant="tertiary">
        Tertiary surface
      </Surface>
      <Surface testID="variant-transparent" className="w-64 rounded-xl border border-border p-4" variant="transparent">
        Transparent surface
      </Surface>
    </Stage>
  );
}

/**
 * The press case (sheet A-002 / A-003, assertions M-002 / M-004 / M-005):
 * the caller's `onPress` probe rides on `rest` straight to the root View —
 * the component composes nothing of its own. The `layout` probe gives the
 * root box the density-injection checks compare (the table has no density
 * cell, so the box must not move).
 */
function PressCase() {
  return (
    <Stage>
      <Surface
        testID="press-root"
        className="w-64 rounded-xl p-4"
        onPress={probe("onPress")}
        onLayout={boxProbe("root")}
      >
        Pressable surface
      </Surface>
    </Stage>
  );
}

/** Reads the ambient `SurfaceContext`; every member stays optional outside a Surface. */
function VariantReader(props: { testID: string }) {
  const variant = SurfaceContext().variant;

  return <Text testID={props.testID}>{variant?.() ?? "none"}</Text>;
}

/**
 * The context case (assertion M-003): the outer surface hands `"secondary"`
 * down; the inner surface is an independent `SurfaceContext` provider whose
 * `"tertiary"` overrides it inside its own subtree only.
 */
function ContextCase() {
  return (
    <Stage>
      <Surface testID="context-outer" variant="secondary">
        <VariantReader testID="context-reader-outer" />
        <Surface testID="context-inner" variant="tertiary">
          <VariantReader testID="context-reader-inner" />
        </Surface>
      </Surface>
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
  const name = String(host.params.case ?? "basic");

  if (name === "variants") {
    return (
      <ScopedMobile>
        <VariantsCase />
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

  if (name === "context") {
    return (
      <ScopedMobile>
        <ContextCase />
      </ScopedMobile>
    );
  }

  return (
    <ScopedMobile>
      <BasicCase />
    </ScopedMobile>
  );
}

mount(Fixture);
