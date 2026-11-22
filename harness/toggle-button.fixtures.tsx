import { effect, host, mount, signal, Text, View } from "nsh";
import type { JSX } from "nsh";
import {
  EnvironmentScope,
  ToggleButton,
  ToggleButtonGroup,
} from "@heroui/react";
import { PressableFeedbackContext } from "../src/primitives/pressable";
import type { PressableFeedbackContextValue } from "../src/primitives/pressable";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";

/*
 * NSH-only ToggleButton / ToggleButtonGroup fixtures (adapt sheet A-007), not
 * shared scenarios. It sits next to harness/nsh.json on purpose: NSH takes
 * the entry's own directory as the app root, so an entry under
 * harness/tests/... loses the `@heroui/react` alias and the theme.
 *
 * Every case is built from HeroUI's public API and records callbacks through
 * `probe` so the test reads them back from Storage. Selection prints as text
 * (the render prop's On/Off and Hovered/Idle markers) because nsh/test cannot
 * read aria-pressed / aria-checked.
 *
 * host.params.case picks the fixture:
 *   basic        standalone uncontrolled button with the full press-callback
 *                surface; `events` records the down → up → change → press
 *                sequence (`state.toggle` fires `onChange` inside `handlePress`
 *                before the `onPress` callback — sheet M-002) and `layout`
 *                the view bounds (M-004)
 *   selected     defaultSelected, same surface
 *   controlled   isSelected bound to a signal; `force` sets it true outside
 *   disabled     isDisabled, same surface (M-005)
 *   sizes        three standalone sm / md / lg buttons, `layout` reports
 *                each `onLayout` bounds (the touch 40 / 48 / 56 pt half of
 *                M-004) — ids tb-sm / tb-md / tb-lg
 *   icon-only    three isIconOnly sm / md / lg buttons, same layout reports —
 *                the sm one (40 pt) is M-003's hitSlop target
 *   group        single-mode group of three, `events` + `onSelectionChange`
 *   group-multi  multiple-mode group of three
 *   group-disallow  single + disallowEmptySelection
 *   group-disabled  isDisabled group (M-005's group half)
 *   group-idless two members without `id` + one with (M-008): the id-less
 *                ones toggle locally, never enter selectedKeys
 *   group-vertical  same group, vertical orientation
 *   group-detached  isDetached group (non-press-face half: gap presses hit
 *                the group's own box, M-010)
 *
 * Mobile-layer params (adapt sheet §4):
 *   scope    "" = the host's default environment (pointer — the desktop
 *            parity side); "touch" wraps the case in
 *            EnvironmentScope(input="touch"), the injected environment the
 *            assertions drive.
 *   probe    "1" mounts the seam surface: a `CtxProbe` inside the button
 *            (reads `PressableFeedbackContext` — the provider wraps the
 *            button's root View, so a child sees the live channels) plus a
 *            `ctx-sample` sibling button that reads the AnimatedValue
 *            channels on demand (on web a press settles inside one tick, so
 *            the sample reads the end values; headless holds sample mid-run).
 *            Reports: `ctx-env` (gate/hitSlop at mount), `ctx-pressed`
 *            (isPressed edges), `ctx-state` / `ctx-channels` (pressed / scale
 *            / hitSlop / origin / bounds). Off by default so the text surface
 *            is unchanged.
 */

const NAME = "Toggle me";

/* -------------------------------------------------------------------------------------------------
 * Environment injection + seam probe (the mobile layer's observation surface)
 * -----------------------------------------------------------------------------------------------*/

function Scoped(props: { children?: JSX.Element }) {
  return String(host.params.scope ?? "") === "touch" ? (
    <EnvironmentScope input="touch">{props.children}</EnvironmentScope>
  ) : (
    <>{props.children}</>
  );
}

function probeOn() {
  return String(host.params.probe ?? "") === "1";
}

// The last mounted button's context value, kept for `ctx-sample` — presses
// that never raise the seam's `isPressed` edge (the default pointer
// environment) still leave observable channel values.
let buttonCtx: PressableFeedbackContextValue | null = null;

function CtxProbe() {
  const ctx = PressableFeedbackContext();
  const reportPressed = probe("ctx-pressed");
  const reportState = probe("ctx-state");
  const reportEnv = probe("ctx-env");

  effect(() => {
    buttonCtx = ctx;
  });

  // Mount-time environment of the seam: the effective gate and the computed
  // hitSlop (undefined until `onLayout` reports the bounds, so this effect
  // re-reports on the layout edge too).
  effect(() => {
    void ctx.bounds();
    reportEnv({
      enabled: ctx.enabled(),
      hitSlop: ctx.hitSlop() ?? null,
      bounds: ctx.bounds(),
    });
  });

  const sample = () => {
    void ctx.pressed.getValue().then((pressed) => {
      void ctx.scale.getValue().then((scale) => {
        reportState({
          pressed,
          scale,
          isPressed: ctx.isPressed(),
          hitSlop: ctx.hitSlop() ?? null,
          origin: ctx.pressOrigin(),
          bounds: ctx.bounds(),
          enabled: ctx.enabled(),
        });
      });
    });
  };

  // Both the edge and deferred samples, so a held press catches mid-run and
  // settled values (the switch fixture's cadence).
  effect(() => {
    reportPressed(ctx.isPressed());
    setTimeout(sample, 600);
    setTimeout(sample, 1500);
  });

  // Polling sampler: on `--target web` the edge effect above only ever sees
  // the settled flag — `pressDown`/`pressUp` land inside one press tick — so
  // a `isPressed: true` mid-press sample must come from reading the flag on
  // a clock.
  effect(() => {
    const timer = setInterval(() => {
      if (ctx.isPressed()) {
        sample();
      }
    }, 200);

    return () => clearInterval(timer);
  });

  return <Text>{ctx.isPressed() ? "seam-pressed" : "seam-idle"}</Text>;
}

/** Mounts `CtxProbe` inside the button only when `probe=1` asks for it. */
function SeamProbe() {
  return probeOn() ? <CtxProbe /> : null;
}

function SampleButton() {
  const reportChannels = probe("ctx-channels");

  const sampleChannels = () => {
    const c = buttonCtx;
    if (c === null) {
      return;
    }
    void c.pressed.getValue().then((pressed) => {
      void c.scale.getValue().then((scale) => {
        reportChannels({
          pressed,
          scale,
          isPressed: c.isPressed(),
          hitSlop: c.hitSlop() ?? null,
          origin: c.pressOrigin(),
          bounds: c.bounds(),
          enabled: c.enabled(),
        });
      });
    });
  };

  return probeOn() ? (
    <View testID="ctx-sample" role="button" class="p-2" onPress={sampleChannels}>
      <Text>ctx-sample</Text>
    </View>
  ) : null;
}

type LayoutEvent = {
  bounds: {
    origin: { x: number; y: number };
    size: { width: number; height: number };
  };
};

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
 * Standalone cases
 * -----------------------------------------------------------------------------------------------*/

/**
 * One standalone button with the full press-callback surface. `events`
 * records the component's order — down (onPressDown) → up (onPressUp) →
 * change (onChange, fired by `state.toggle` inside `handlePress`) → press —
 * which the touch environment must reproduce unchanged (M-002).
 */
function BasicCase() {
  const name = String(host.params.case ?? "basic");
  const reportEvent = probe("events");
  const controlled = name === "controlled";
  const value = signal(false);

  return (
    <Stage>
      <ToggleButton
        testID="tb"
        aria-label={NAME}
        defaultSelected={name === "selected"}
        isDisabled={name === "disabled"}
        isSelected={controlled ? value() : undefined}
        onChange={(isSelected) => {
          probe("onChange")(isSelected);
          reportEvent("change");
        }}
        onPressDown={(e) => {
          probe("onPressDown")(e);
          reportEvent("down");
        }}
        onPressStart={(e) => {
          probe("onPressStart")(e);
        }}
        onPressUp={(e) => {
          probe("onPressUp")(e);
          reportEvent("up");
        }}
        onPressEnd={(e) => {
          probe("onPressEnd")(e);
        }}
        onPressChange={(isPressed) => probe("onPressChange")(isPressed)}
        onPress={(e) => {
          probe("onPress")(e);
          reportEvent("press");
        }}
        onHoverStart={() => probe("onHover")("start")}
        onHoverEnd={() => probe("onHover")("end")}
        onFocusChange={(isFocused) => probe("onFocusChange")(isFocused)}
        onLayout={layoutProbe("tb")}
      >
        {({ isSelected, isHovered, isPressed, isFocusVisible }) => (
          <View class="flex-row items-center gap-2">
            <Text>{isSelected() ? "On" : "Off"}</Text>
            <Text>{isHovered() ? "Hovered" : "Idle"}</Text>
            <Text>{isFocusVisible() ? "FocusRing" : "NoRing"}</Text>
            <Text>{isPressed() ? "Pressed" : "NotPressed"}</Text>
            <SeamProbe />
          </View>
        )}
      </ToggleButton>
      <View testID="away" class="size-8 bg-default" />
      <SampleButton />
      {controlled ? (
        <View
          testID="force"
          role="button"
          class="px-3 py-1 bg-default"
          onPress={() => value.set(true)}
        >
          <Text>force</Text>
        </View>
      ) : null}
    </Stage>
  );
}

/**
 * The three text sizes standalone, each reporting `onLayout` bounds — the
 * touch tier asserts 40 / 48 / 56 pt against the desktop 36 / 40 / 44
 * (h-9 / h-10 / h-11; M-004).
 */
function SizesCase() {
  return (
    <Stage>
      <View class="flex-row items-center gap-4">
        <ToggleButton testID="tb-sm" size="sm" aria-label="Small" onLayout={layoutProbe("tb-sm")}>
          Small
        </ToggleButton>
        <ToggleButton testID="tb-md" aria-label="Medium" onLayout={layoutProbe("tb-md")}>
          Medium
        </ToggleButton>
        <ToggleButton testID="tb-lg" size="lg" aria-label="Large" onLayout={layoutProbe("tb-lg")}>
          Large
        </ToggleButton>
      </View>
      <SampleButton />
    </Stage>
  );
}

/**
 * The three icon-only widths. The touch sm member is 40 pt — under the 44 pt
 * hit-target floor — so it is M-003's `hitSlop` assertion target while md's
 * 48 pt clears it.
 */
function IconOnlyCase() {
  return (
    <Stage>
      <View class="flex-row items-center gap-4">
        <ToggleButton
          testID="tb-sm"
          size="sm"
          isIconOnly
          aria-label="Icon small"
          onLayout={layoutProbe("tb-sm")}
        >
          <Text>★</Text>
          <SeamProbe />
        </ToggleButton>
        <ToggleButton
          testID="tb-md"
          isIconOnly
          aria-label="Icon medium"
          onLayout={layoutProbe("tb-md")}
        >
          <Text>★</Text>
        </ToggleButton>
        <ToggleButton
          testID="tb-lg"
          size="lg"
          isIconOnly
          aria-label="Icon large"
          onLayout={layoutProbe("tb-lg")}
        >
          <Text>★</Text>
        </ToggleButton>
      </View>
      <SampleButton />
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Group cases
 * -----------------------------------------------------------------------------------------------*/

const reportSelection = (keys: Set<string>) =>
  probe("onSelectionChange")([...keys].sort().join(","));

function member(id: string, label: string, extra?: { withoutId?: boolean }) {
  const reportEvent = probe("events");

  return (
    <ToggleButton
      testID={`tb-${id}`}
      id={extra?.withoutId ? undefined : id}
      onPress={() => reportEvent(`press:${id}`)}
      onChange={(isSelected) => probe("onChange")({ id, isSelected })}
      onLayout={layoutProbe(`tb-${id}`)}
    >
      {({ isSelected }) => <Text>{`${label}:${isSelected() ? "on" : "off"}`}</Text>}
    </ToggleButton>
  );
}

/**
 * A three-member group. `events` carries `press:<label>` so the test can
 * pair a member press with the `onSelectionChange` `Set<string>` it caused;
 * `onChange` reports `{id, isSelected}` for members without a group key the
 * way the standalone case does.
 */
function GroupCase() {
  const name = String(host.params.case ?? "group");

  return (
    <Stage>
      <ToggleButtonGroup
        testID="tb-group"
        selectionMode={name === "group-multi" ? "multiple" : "single"}
        disallowEmptySelection={name === "group-disallow"}
        isDisabled={name === "group-disabled"}
        orientation={name === "group-vertical" ? "vertical" : "horizontal"}
        isDetached={name === "group-detached"}
        onSelectionChange={(keys) => {
          probe("events")("selection");
          reportSelection(keys);
        }}
        onLayout={layoutProbe("tb-group")}
      >
        {member("one", "One", { withoutId: name === "group-idless" })}
        <ToggleButtonGroup.Separator />
        {member("two", "Two")}
        <ToggleButtonGroup.Separator />
        {member("three", "Three", { withoutId: name === "group-idless" })}
      </ToggleButtonGroup>
      <SampleButton />
    </Stage>
  );
}

function Fixture() {
  const name = String(host.params.case ?? "basic");

  if (name === "sizes") return <Scoped><SizesCase /></Scoped>;
  if (name === "icon-only") return <Scoped><IconOnlyCase /></Scoped>;
  if (name.startsWith("group")) return <Scoped><GroupCase /></Scoped>;

  return <Scoped><BasicCase /></Scoped>;
}

mount(Fixture);
