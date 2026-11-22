import { effect, host, mount, View } from "nsh";
import type { Component, JSX } from "nsh";
import {
  Button,
  EnvironmentScope,
  PressableFeedbackContext,
  ToggleButton,
  ToggleButtonGroup,
  Toolbar,
} from "@heroui/react";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";

/*
 * NSH-only Toolbar fixtures for the mobile layer
 * (adapt-sheets/toolbar.md §4 M-001…M-008), kept next to harness/nsh.json for
 * the same reason disclosure-group.fixtures.tsx is: NSH takes the entry's own
 * directory as the app root.
 *
 * Every press probe is tagged ("undo", "redo", "disabled", "root") so one
 * `onPress` name tells the controls apart; the selection probe spreads the
 * `Set` into sorted arguments, because `JSON.stringify(new Set(...))` is `{}`.
 *
 * host.params.case picks the case:
 *   press        labelled toolbar, no root onPress: Undo/Redo Buttons, a
 *                `id:toolbar-gap` spacer on the bare surface between items, a
 *                ToggleButtonGroup with Bold, and a disabled Button
 *                (M-001…M-004, M-008)
 *   press-root   the same toolbar with an explicit root `onPress` probe —
 *                "root" must fire only from the bare surface, never from a
 *                control inside (M-002, M-003)
 *   wide         seven Buttons on one row, root + per-child `onLayout` frames
 *                (M-005 overflow acceptance, M-006 bounds parity)
 *   attached     `isAttached` toolbar with one Button and both frames
 *                (M-005 inset, M-008 padding baseline)
 *   vertical     `orientation="vertical"` toolbar, three different-width
 *                Buttons (M-006 axis geometry)
 *   nested       horizontal toolbar holding a horizontal ToggleButtonGroup
 *                and a nested vertical toolbar holding a vertical one
 *                (M-007 axis inheritance, role:group)
 *
 * host.params.scope picks the `EnvironmentScope` wrapper ("" = host default,
 * "touch" = `input="touch"`, "touch-compact" = `input="touch" width="compact"`),
 * same convention as disclosure-group.fixtures.tsx.
 */

type LayoutEvent = {
  bounds: {
    origin: { x: number; y: number };
    size: { width: number; height: number };
  };
};

/** Records the frame `name` got, so a test can compare controls' positions. */
function frame(name: string) {
  return (event: LayoutEvent) =>
    probe("layout")({
      name,
      x: event.bounds.origin.x,
      y: event.bounds.origin.y,
      width: event.bounds.size.width,
      height: event.bounds.size.height,
    });
}

function selectionChanged(keys: Set<string>) {
  probe("onSelectionChange")([...keys].sort());
}

/*
 * The hit-area a child control reaches under `input="touch"` is split in two
 * by the encapsulation model: the visible side comes from the child's own
 * tv() `input` axis, the invisible expansion from the press-feedback seam's
 * `hitSlop` — a View prop nsh/test cannot read (sheet §6). The seam's read
 * half rides `PressableFeedbackContext`, so a probe placed inside the control
 * reports the only observable surface: `enabled` (the seam's gate, live under
 * touch), `hitSlop` (the Edges or null) and `bounds` (the laid-out box).
 *
 * A control that never mounted the seam answers the context's resting
 * default (`enabled: false`, `hitSlop: undefined`, zero bounds) — the same
 * value a desktop mount reports, so the test asserts the contract, not the
 * snapshot: an enabled seam's bounds plus its slop must reach 44pt, a resting
 * one must claim no slop.
 */
function SeamProbe(props: { id: string }) {
  const ctx = PressableFeedbackContext();
  const reportEnv = probe("ctx-env");

  effect(() => {
    reportEnv({
      id: props.id,
      enabled: ctx.enabled(),
      hitSlop: ctx.hitSlop() ?? null,
      bounds: ctx.bounds(),
    });
  });

  return null;
}

/* -------------------------------------------------------------------------------------------------
 * press / press-root (M-001 … M-004, M-008)
 * -----------------------------------------------------------------------------------------------*/

function PressCase(props: { rootPress?: boolean }) {
  return (
    <Stage>
      <Toolbar
        aria-label="Text formatting"
        onPress={
          props.rootPress === true ? () => probe("onPress")("root") : undefined
        }
      >
        <Button onPress={() => probe("onPress")("undo")} onLayout={frame("press-undo")}>
          <SeamProbe id="undo" />
          Undo
        </Button>
        <Button onPress={() => probe("onPress")("redo")} onLayout={frame("press-redo")}>
          Redo
        </Button>
        {/*
         * The toolbar's bare surface between two items: fixture chrome, not a
         * component part — it hears no presses itself, so `app.press` on it
         * can only reach an ancestor press surface (the root, when the caller
         * gave it one).
         */}
        <View testID="toolbar-gap" class="h-6 w-6" />
        <ToggleButtonGroup
          aria-label="Text style"
          selectionMode="multiple"
          onSelectionChange={selectionChanged}
        >
          <ToggleButton id="bold" onLayout={frame("press-bold")}>
            <SeamProbe id="bold" />
            Bold
          </ToggleButton>
        </ToggleButtonGroup>
        <Button
          isDisabled
          onPress={() => probe("onPress")("disabled")}
          onLayout={frame("press-disabled")}
        >
          Disabled
        </Button>
      </Toolbar>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * wide (M-005, M-006)
 * -----------------------------------------------------------------------------------------------*/

const WIDE_LABELS = ["Cut", "Copy", "Paste", "Select All", "Undo", "Redo", "Find"];

/*
 * The children carry a fixed `h-10`: M-006 compares this scenario's bounds
 * across environments to prove the toolbar's own variant table has no
 * `input`/`density` axis, and a child's touch hit-area growth (button unit's
 * `input` axis, M-004) would legitimately move the root's fit-content
 * height. Pinning the child height keeps the comparison on the toolbar's
 * own layout — order, gaps, widths, `w-fit` — which is what the row pins.
 */
function WideCase() {
  return (
    <Stage>
      <Toolbar aria-label="Wide toolbar" onLayout={frame("wide-root")}>
        {WIDE_LABELS.map((label, index) => (
          <Button style={{ height: 40 }} onLayout={frame(`wide-${index}`)}>
            {label}
          </Button>
        ))}
      </Toolbar>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * attached (M-005, M-008)
 * -----------------------------------------------------------------------------------------------*/

function AttachedCase() {
  return (
    <Stage>
      <Toolbar isAttached aria-label="Attached toolbar" onLayout={frame("att-root")}>
        <Button onLayout={frame("att-0")}>Undo</Button>
      </Toolbar>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * vertical (M-006)
 * -----------------------------------------------------------------------------------------------*/

function VerticalCase() {
  return (
    <Stage>
      <Toolbar aria-label="Tools" orientation="vertical" onLayout={frame("v-root")}>
        <Button className="w-20" onLayout={frame("v-0")}>
          Undo
        </Button>
        <Button className="w-28" onLayout={frame("v-1")}>
          Redo
        </Button>
        <Button className="w-24" onLayout={frame("v-2")}>
          Paste
        </Button>
      </Toolbar>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * nested (M-007)
 * -----------------------------------------------------------------------------------------------*/

function NestedCase() {
  return (
    <Stage>
      <Toolbar aria-label="Editor">
        <ToggleButtonGroup aria-label="Text style" selectionMode="multiple">
          <ToggleButton id="bold" onLayout={frame("n-outer-0")}>
            Bold
          </ToggleButton>
          <ToggleButton id="italic" onLayout={frame("n-outer-1")}>
            Italic
          </ToggleButton>
        </ToggleButtonGroup>
        <Toolbar aria-label="Tools" orientation="vertical">
          <ToggleButtonGroup aria-label="Align" selectionMode="multiple">
            <ToggleButton id="left" onLayout={frame("n-inner-0")}>
              Align left
            </ToggleButton>
            <ToggleButton id="right" onLayout={frame("n-inner-1")}>
              Align right
            </ToggleButton>
          </ToggleButtonGroup>
        </Toolbar>
      </Toolbar>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Entry
 * -----------------------------------------------------------------------------------------------*/

function Press() {
  return <PressCase />;
}

function PressRoot() {
  return <PressCase rootPress />;
}

const cases: Record<string, Component> = {
  press: Press,
  "press-root": PressRoot,
  wide: WideCase,
  attached: AttachedCase,
  vertical: VerticalCase,
  nested: NestedCase,
};

function Scoped(props: { children?: JSX.Element }) {
  const scope = String(host.params.scope ?? "");

  if (scope === "touch") {
    return <EnvironmentScope input="touch">{props.children}</EnvironmentScope>;
  }

  if (scope === "touch-compact") {
    return (
      <EnvironmentScope input="touch" width="compact">
        {props.children}
      </EnvironmentScope>
    );
  }

  return <>{props.children}</>;
}

function Fixture() {
  const name = String(host.params.case ?? "press");
  const Case = cases[name] ?? Press;

  return (
    <Scoped>
      <Case />
    </Scoped>
  );
}

mount(Fixture);
