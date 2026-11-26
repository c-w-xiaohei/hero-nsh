import { effect, host, mount, platform, signal, Text, View } from "nsh";
import type { JSX } from "nsh";
import type { Color } from "@heroui/react";
import {
  ColorArea,
  ColorPicker,
  ColorSlider,
  ColorSwatch,
  ColorSwatchPicker,
  EnvironmentScope,
  Label,
  OverlayTriggerContext,
  parseColor,
} from "@heroui/react";
import type {
  EnvironmentDensity,
  EnvironmentInput,
  EnvironmentWidth,
  PopoverPlacement,
} from "@heroui/react";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";

/*
 * NSH-only ColorPicker fixture (port sheet 4b), not a shared scenario.
 *
 * It sits next to harness/nsh.json on purpose. NSH takes the entry's own
 * directory as the app root, so an entry under harness/tests/... finds no
 * nsh.json and loses the `@heroui/react` alias and the theme.
 *
 * `host.params.case` picks the shape:
 *   with-swatches  the upstream fixture tree, the `withSwatches` branch of
 *                  `renderColorPicker`
 *                  (heroui/packages/react/tests/components/color-picker/
 *                  color-picker.test.tsx:17-59): defaultValue #0485F7, a
 *                  trigger with a ColorSwatch and the Label "Pick a color", and
 *                  a popover holding the three presets, the ColorArea and the
 *                  hue slider. onChange writes the color's lowercase hex into
 *                  Storage (T-007). The three presets are the upstream ones
 *                  because the case asserts #22c55e for the second one.
 *   default        the same tree without the presets, onChange recorded; the
 *                  open / close case (T-006) runs on the shared
 *                  `color-picker/default` scenario instead, so this case only
 *                  exists as the fixture's plain shape.
 *   controlled     the with-swatches tree on a controlled `value` (seeded
 *                  #325578) whose onChange writes the signal back; a `Text`
 *                  echoes the current hex so the round-trip is observable
 *                  without a class read (M-009's value-semantics half).
 *
 * Every case mounts inside `Scoped` (A-007): `host.params.input` /
 * `host.params.width` / `host.params.density` inject an `EnvironmentScope`
 * per field, and absent params keep the host-derived environment (pointer +
 * regular + default on headless/web — the desktop-parity baseline). The
 * wrapper is always a real provider, never a bare fragment: popover's §7
 * measured that a fragment wrapper breaks the exit-hold unmount.
 *
 * `host.params.presentation` ∈ "auto"|"panel"|"sheet" pins the carrier on
 * `ColorPicker.Popover`; `host.params.nonmodal`="1" sets `isNonModal` (the
 * non-modal fold of A-002). The popover carries `testID="cp"` so the carrier
 * probes read `cp-panel` / `cp-sheet` (the `<id>-panel` derivation
 * convention).
 *
 * Open-state observation has two channels, both reporting `openChange`:
 *   - `OpenProbe` reads the root-owned `OverlayTriggerContext` inside
 *     `ColorPicker.Root` — the trigger/Escape/outside-press channel. It is
 *     required because `ColorPicker.Popover.onOpenChange` fires only when
 *     the Popover owns its state (RAC `Popover` / `PopoverContent` semantics,
 *     verbatim: `localState` is bypassed while a context state exists), and
 *     `ColorPicker.Root` exposes no open callback of its own.
 *   - the Popover's own `onOpenChange` prop, live only in the owns-state
 *     cases below (`defaultopen` / `controlledopen`), where the root trigger
 *     channel is deliberately bypassed.
 * The two never fire in the same case, so `callsOf(app, "openChange")`
 * reads one round per edge either way.
 *
 * `host.params.defaultopen`="1" gives the Popover `defaultOpen` (owns state,
 * mounts open); `host.params.controlledopen`="1" gives it a controlled
 * `isOpen` the fixture drives through `host.send("cp.open"|"cp.close")` and
 * keeps in sync inside `onOpenChange`.
 * `host.params.kbdismiss`="1" sets `isKeyboardDismissDisabled`;
 * `host.params.skipanim`="1" sets `shouldSkipAnimation`;
 * `host.params.placement` / `host.params.offset` pass through to the Popover
 * (M-009's anchoring sample — the geometry itself is the sheet §6 host gap);
 * `host.params.trigdisabled`="1" sets `isDisabled` on the Trigger.
 *
 * The Trigger reports `triggerPress` / `hoverStart` / `hoverEnd` / `focus` /
 * `blur` probes so M-007/M-009 can pin the forwarded callback chain.
 */

const PRESETS = ["#ef4444", "#22c55e", "#3b82f6"] as const;

function recordColor(name: string) {
  return (color: Color) => probe(name)({ hex: color.toString("hex").toLowerCase() });
}

/**
 * The root-owned open channel (see the header note): reports every
 * false→true / true→false edge of the `PopoverRoot` disclosure as
 * `openChange`, plus a `open-state:open|closed` Text the tests can `shows`.
 * Mounted as a `ColorPicker` child so it sits inside the root's
 * `OverlayTriggerContext` but outside the Popover's scoped no-op context.
 */
function OpenProbe() {
  const trigger = OverlayTriggerContext();
  const report = probe("openChange");
  let primed = false;
  let last = false;

  effect(() => {
    const open = trigger?.isOpen() ?? false;

    if (!primed) {
      primed = true;
      last = open;

      return;
    }

    if (open !== last) {
      last = open;
      report(open);
    }
  });

  return <Text>{`open-state:${trigger?.isOpen() ? "open" : "closed"}`}</Text>;
}

function PickerCase(props: { withSwatches?: boolean; controlledValue?: boolean }) {
  const presentation = String(host.params.presentation ?? "");
  const nonModal = String(host.params.nonmodal ?? "") === "1";
  const defaultOpen = String(host.params.defaultopen ?? "") === "1";
  const controlledOpen = String(host.params.controlledopen ?? "") === "1";
  const kbdDismiss = String(host.params.kbdismiss ?? "") === "1";
  const skipAnim = String(host.params.skipanim ?? "") === "1";
  const placement = String(host.params.placement ?? "");
  const offset = String(host.params.offset ?? "");
  const triggerDisabled = String(host.params.trigdisabled ?? "") === "1";

  const openState = signal(false);
  const color = signal(parseColor("#325578"));

  if (controlledOpen) {
    host.on("cp.open", () => openState.set(true));
    host.on("cp.close", () => openState.set(false));
  }

  const handleOpenChange = (next: boolean) => {
    probe("openChange")(next);
    if (controlledOpen) {
      openState.set(next);
    }
  };

  return (
    <Stage>
      <ColorPicker
        {...(props.controlledValue
          ? {
              value: color(),
              onChange: (next: Color) => {
                color.set(next);
                recordColor("onChange")(next);
              },
            }
          : { defaultValue: "#0485F7", onChange: recordColor("onChange") })}
      >
        <ColorPicker.Trigger
          isDisabled={triggerDisabled || undefined}
          onPress={() => probe("triggerPress")()}
          onHoverStart={() => probe("hoverStart")()}
          onHoverEnd={() => probe("hoverEnd")()}
          onFocus={() => probe("focus")()}
          onBlur={() => probe("blur")()}
        >
          <ColorSwatch size="lg" />
          <Label>Pick a color</Label>
        </ColorPicker.Trigger>
        <ColorPicker.Popover
          testID="cp"
          presentation={
            presentation === ""
              ? undefined
              : (presentation as "auto" | "panel" | "sheet")
          }
          isNonModal={nonModal || undefined}
          isKeyboardDismissDisabled={kbdDismiss || undefined}
          shouldSkipAnimation={skipAnim || undefined}
          defaultOpen={defaultOpen || undefined}
          isOpen={controlledOpen ? openState() : undefined}
          onOpenChange={handleOpenChange}
          placement={placement === "" ? undefined : (placement as PopoverPlacement)}
          offset={offset === "" ? undefined : Number(offset)}
        >
          {props.withSwatches ? (
            <ColorSwatchPicker aria-label="Color presets" size="xs">
              {PRESETS.map((preset) => (
                <ColorSwatchPicker.Item color={preset}>
                  <ColorSwatchPicker.Swatch />
                </ColorSwatchPicker.Item>
              ))}
            </ColorSwatchPicker>
          ) : null}
          <ColorArea
            aria-label="Color area"
            colorSpace="hsb"
            xChannel="saturation"
            yChannel="brightness"
          >
            <ColorArea.Thumb />
          </ColorArea>
          <ColorSlider channel="hue" colorSpace="hsb">
            <Label>Hue</Label>
            <ColorSlider.Output />
            <ColorSlider.Track>
              <ColorSlider.Thumb />
            </ColorSlider.Track>
          </ColorSlider>
        </ColorPicker.Popover>
        <OpenProbe />
      </ColorPicker>
      {props.controlledValue ? (
        <Text>{`selected:${color().toString("hex").toLowerCase()}`}</Text>
      ) : null}
      {/* Hover-away target for the Trigger's `onHoverEnd` chain (M-009). */}
      <View testID="away" class="size-8 bg-default" />
    </Stage>
  );
}

/**
 * EnvironmentScope wrapper (A-007): always a real provider, per-field. An
 * absent param keeps the host-derived value, so a case opened without them is
 * the desktop-parity baseline. NSH context reaches a subtree only for
 * elements created under the provider, so the case element is built inside
 * the provider, never outside it.
 */
function Scoped(props: { children?: JSX.Element }) {
  const input = host.params.input;
  const width = host.params.width;
  const density = host.params.density;

  return (
    <EnvironmentScope
      input={input === undefined ? undefined : (String(input) as EnvironmentInput)}
      width={width === undefined ? undefined : (String(width) as EnvironmentWidth)}
      density={
        density === undefined ? undefined : (String(density) as EnvironmentDensity)
      }
    >
      {props.children}
    </EnvironmentScope>
  );
}

function Fixture() {
  const name = String(host.params.case ?? "with-swatches");

  // The host OS as the app itself sees it (the tabs fixture convention):
  // tests gate per-platform channels on this probe — M-009 closes through
  // `app.back()` on Android because the delivered Escape KeyEvent never
  // reaches the popover there (the registered gap below records it).
  probe("platform")(platform.os);

  if (name === "default") {
    return (
      <Scoped>
        <PickerCase />
      </Scoped>
    );
  }

  if (name === "controlled") {
    return (
      <Scoped>
        <PickerCase withSwatches controlledValue />
      </Scoped>
    );
  }

  return (
    <Scoped>
      <PickerCase withSwatches />
    </Scoped>
  );
}

mount(Fixture);
