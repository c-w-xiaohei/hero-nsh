import { effect, host, mount, Text, View } from "nsh";
import type { JSX, MouseEvent as NshMouseEvent, PressEvent } from "nsh";
import type { Color, PressableFeedbackContextValue } from "@heroui/react";
import {
  ColorSwatchPicker,
  EnvironmentScope,
  PressableFeedbackContext,
} from "@heroui/react";
// The item context is internal (not a public export), so the fixture imports
// the context file directly the way switch.fixtures.tsx imports SwitchContext.
import { ColorSwatchPickerItemContext } from "../src/components/color-swatch-picker/color-swatch-picker-context";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";

/*
 * NSH-only ColorSwatchPicker fixture (port sheet 4b), not a shared scenario.
 *
 * It sits next to harness/nsh.json on purpose. NSH takes the entry's own
 * directory as the app root, so an entry under harness/tests/... finds no
 * nsh.json and loses the `@heroui/react` alias and the theme.
 *
 * `host.params.case` picks the shape:
 *   select        the upstream fixture tree
 *                 (heroui/packages/react/tests/components/color-swatch-picker/
 *                 color-swatch-picker.test.tsx:11-29): three presets, circle /
 *                 md / grid, aria-label "Color presets", Swatch and Indicator
 *                 on every Item, and onChange recording the selected color as
 *                 its lowercase hex string (T-004). The three colors are the
 *                 upstream ones because the case asserts #22c55e for the
 *                 second preset.
 *   layout-grid   three Items, each wrapped in a View that reports its bounds
 *                 through onLayout; no `layout` prop, so the picker keeps its
 *                 default (T-003)
 *   layout-stack  the same tree with layout="stack" (T-003)
 *   custom-indicator
 *                 three presets whose Indicator holds a caller block instead of
 *                 the default check, with the middle preset selected by
 *                 defaultValue (X-001): upstream's `.color-swatch-picker__indicator
 *                 > *` rule scales every direct child to 0 and only raises the
 *                 selected item's to 1, so a picture taken now has one lime
 *                 block, on the middle swatch. A port that scales only the
 *                 default checkmark paints the block on all three.
 *   mobile        three `size` pickers (xs/sm/md), each Item wrapped in a
 *                 `layout`-probe box (M-002's 16/24/32 → 44 hit minimum, and
 *                 M-006's density gap between the md boxes).
 *   ctx-probe     one picker whose Item's children read
 *                 `PressableFeedbackContext` (A-003): `ctx-pressed`
 *                 ({seam, active} edges), `ctx-state`/`ctx-channels`
 *                 (pressed/scale/hitSlop/origin/bounds samples), `ctx-env`
 *                 (mount-time gate). A sibling `ctx-sample` button reads the
 *                 AnimatedValue channels on demand — the only read for
 *                 presses that never raise the seam edge (default pointer).
 *   events        one picker whose first Item probes the press/hover chain
 *                 (`events`: down/up/press/hover-start/hover-end/
 *                 hover-change/mouse-enter/mouse-leave) plus `onChange` —
 *                 M-004's hover-channel and M-005's disabled/baseline halves.
 *                 `disabled=1` disables the middle Item.
 *   hover         one picker whose first Item is the render-prop form: the
 *                 `isHovered` accessor paints "Hovered"/"Idle" (M-004).
 *
 * `host.params.input` / `host.params.density` feed `EnvironmentScope` through
 * `ScopedMobile`; absent params keep the host-derived environment (pointer +
 * default density on headless and web — the desktop-parity baseline). Every
 * case mounts inside it, so the mobile tests reopen the existing select/
 * layout trees under `input="touch"` without a second fixture.
 */

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

const COLORS = ["#ef4444", "#22c55e", "#3b82f6"] as const;

function recordColor(name: string) {
  return (color: Color) => probe(name)({ hex: color.toString("hex").toLowerCase() });
}

function SelectCase() {
  return (
    <Stage>
      <ColorSwatchPicker aria-label="Color presets" onChange={recordColor("onChange")}>
        {COLORS.map((color) => (
          <ColorSwatchPicker.Item color={color}>
            <ColorSwatchPicker.Swatch />
            <ColorSwatchPicker.Indicator />
          </ColorSwatchPicker.Item>
        ))}
      </ColorSwatchPicker>
    </Stage>
  );
}

function LayoutCase(props: { layout?: "grid" | "stack" }) {
  return (
    <Stage>
      <ColorSwatchPicker aria-label="Color presets" layout={props.layout}>
        {COLORS.map((color, index) => (
          <View onLayout={layoutProbe(`box-${index}`)}>
            <ColorSwatchPicker.Item color={color}>
              <ColorSwatchPicker.Swatch />
              <ColorSwatchPicker.Indicator />
            </ColorSwatchPicker.Item>
          </View>
        ))}
      </ColorSwatchPicker>
    </Stage>
  );
}

const CUSTOM_COLORS = ["#ef4444", "#22c55e", "#3b82f6"] as const;

function CustomIndicatorCase() {
  return (
    <Stage>
      <ColorSwatchPicker aria-label="Color presets" defaultValue="#22c55e">
        {CUSTOM_COLORS.map((color) => (
          <ColorSwatchPicker.Item color={color}>
            <ColorSwatchPicker.Swatch />
            <ColorSwatchPicker.Indicator>
              <View class="size-3 rounded-full" style={{ backgroundColor: "#a3e635" }} />
            </ColorSwatchPicker.Indicator>
          </ColorSwatchPicker.Item>
        ))}
      </ColorSwatchPicker>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Mobile-layer cases (adapt sheet A-006)
 * -----------------------------------------------------------------------------------------------*/

const MOBILE_SIZES = ["xs", "sm", "md"] as const;

function MobileCase() {
  return (
    <Stage>
      {MOBILE_SIZES.map((size) => (
        <ColorSwatchPicker
          aria-label={`Presets ${size}`}
          size={size}
          onChange={recordColor("onChange")}
        >
          {COLORS.map((color, index) => (
            <View onLayout={layoutProbe(`${size}-box-${index}`)}>
              <ColorSwatchPicker.Item color={color} testID={`${size}-item-${index}`}>
                <ColorSwatchPicker.Swatch />
                <ColorSwatchPicker.Indicator />
              </ColorSwatchPicker.Item>
            </View>
          ))}
        </ColorSwatchPicker>
      ))}
    </Stage>
  );
}

// The live context the `ctx-sample` sibling reads on demand — presses that
// never raise the seam's `isPressed` edge (the default pointer environment)
// still leave observable channel values.
let liveCtx: PressableFeedbackContextValue | null = null;

/**
 * Reads `PressableFeedbackContext` inside an Item (A-003 provides the seam's
 * context to the item's children) and reports the seam's state, the
 * control-field / tabs fixture convention merged with the item's own press
 * flag:
 *   `ctx-pressed`   {seam, active} edges — `seam` is the gated
 *                   `feedback.isPressed` (silent under pointer — that
 *                   silence IS the negative assertion), `active` the item's
 *                   unconditional `pointerPressed` (round-trips in every
 *                   environment, so the press itself stays observable)
 *   `ctx-state`     every channel sampled on each edge, +150 ms, +600 ms and
 *                   +1500 ms so a held press reports its settled end values
 *   `ctx-env`       the reactive gate, computed `hitSlop` and bounds
 * `hitSlop` serializes `undefined` as `null` — the seam's rest value.
 */
function CtxProbe() {
  const ctx = PressableFeedbackContext();
  const itemState = ColorSwatchPickerItemContext()?.state;
  const reportPressed = probe("ctx-pressed");
  const reportState = probe("ctx-state");
  const reportEnv = probe("ctx-env");

  effect(() => {
    liveCtx = ctx;
  });

  effect(() => {
    reportEnv({
      enabled: ctx.enabled(),
      hitSlop: ctx.hitSlop() ?? null,
      bounds: ctx.bounds(),
      // M-005's observable half of "the selected item's Indicator shows":
      // `isSelected` is the one channel the Indicator's scale-0/scale-100
      // paint and the swatch shrink both read; the paint itself is X-001's
      // screenshot coverage in the read-only `.heroui.web.` file.
      selected: itemState?.isSelected() ?? false,
    });
  });

  const sample = () => {
    void ctx.pressed.getValue().then((pressed) => {
      void ctx.scale.getValue().then((scale) => {
        void ctx.highlightOpacity.getValue().then((highlight) => {
          void ctx.rippleProgress.getValue().then((ripple) => {
            reportState({
              seamPressed: ctx.isPressed(),
              active: itemState?.isPressed() ?? false,
              pressed,
              scale,
              highlight,
              ripple,
              origin: ctx.pressOrigin(),
              hitSlop: ctx.hitSlop() ?? null,
              bounds: ctx.bounds(),
              enabled: ctx.enabled(),
            });
          });
        });
      });
    });
  };

  // Both press flags on every edge plus deferred samples, so a held press
  // catches mid-run and settled values (the control-field fixture's cadence).
  effect(() => {
    const seam = ctx.isPressed();
    const active = itemState?.isPressed() ?? false;
    reportPressed({ seam, active });
    setTimeout(sample, 150);
    setTimeout(sample, 600);
    setTimeout(sample, 1500);
  });

  // Polling sampler: on `--target web` the edge effect above only ever sees
  // the settled flag — `pressDown`/`pressUp` land inside one press tick and
  // the batched signal update surfaces a single edge — so a `seamPressed:
  // true` mid-press sample must come from reading the flag on a clock (the
  // switch fixture's convention).
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

function CtxProbeCase() {
  const reportChannels = probe("ctx-channels");

  const sampleChannels = () => {
    const c = liveCtx;
    if (c === null) {
      return;
    }
    void c.pressed.getValue().then((pressed) => {
      void c.scale.getValue().then((scale) => {
        reportChannels({
          seamPressed: c.isPressed(),
          pressed,
          scale,
          origin: c.pressOrigin(),
          hitSlop: c.hitSlop() ?? null,
          bounds: c.bounds(),
          enabled: c.enabled(),
        });
      });
    });
  };

  return (
    <Stage>
      <ColorSwatchPicker aria-label="Color presets" onChange={recordColor("onChange")}>
        {COLORS.map((color, index) => (
          <ColorSwatchPicker.Item
            color={color}
            testID={`ctx-item-${index}`}
            // `tiny=1` pins the item under the 44 pt target and overrides the
            // touch `min-h-11 min-w-11`, so a real hitSlop expansion is
            // observable (inline style wins over the variant class; the
            // radio fixture's `short=1` convention, sheet M-003).
            style={
              String(host.params.tiny ?? "") === "1"
                ? { width: 16, height: 16, minWidth: 0, minHeight: 0 }
                : undefined
            }
          >
            <ColorSwatchPicker.Swatch />
            {index === 0 ? <CtxProbe /> : undefined}
          </ColorSwatchPicker.Item>
        ))}
      </ColorSwatchPicker>
      <View testID="ctx-sample" role="button" class="p-2" onPress={sampleChannels}>
        <Text>ctx-sample</Text>
      </View>
    </Stage>
  );
}

function EventsCase() {
  const report = probe("events");
  const disabled = String(host.params.disabled ?? "") === "1";

  const kind = (name: string) => (_event: PressEvent | NshMouseEvent) => report(name);

  return (
    <Stage>
      <ColorSwatchPicker aria-label="Color presets" onChange={recordColor("onChange")}>
        {COLORS.map((color, index) => (
          <ColorSwatchPicker.Item
            color={color}
            testID={`ev-item-${index}`}
            isDisabled={disabled && index === 1}
            onPressStart={kind("down")}
            onPressUp={kind("up")}
            onPress={kind("press")}
            onHoverStart={kind("hover-start")}
            onHoverEnd={kind("hover-end")}
            onHoverChange={(hovered) => report(`hover-change:${hovered}`)}
            onMouseEnter={kind("mouse-enter")}
            onMouseLeave={kind("mouse-leave")}
          >
            <ColorSwatchPicker.Swatch />
          </ColorSwatchPicker.Item>
        ))}
      </ColorSwatchPicker>
      <View testID="away" class="size-8 bg-default" />
    </Stage>
  );
}

function HoverCase() {
  const disabled = String(host.params.disabled ?? "") === "1";

  return (
    <Stage>
      <ColorSwatchPicker aria-label="Color presets" onChange={recordColor("onChange")}>
        {COLORS.map((color, index) => (
          <ColorSwatchPicker.Item
            color={color}
            testID={`hv-item-${index}`}
            isDisabled={disabled && index === 1}
            onHoverStart={probe("onHoverStart")}
            onHoverEnd={probe("onHoverEnd")}
            onHoverChange={probe("onHoverChange")}
            onMouseEnter={probe("onMouseEnter")}
            onMouseLeave={probe("onMouseLeave")}
          >
            {index === 0
              ? (values) => <Text>{values.isHovered() ? "Hovered" : "Idle"}</Text>
              : <ColorSwatchPicker.Swatch />}
          </ColorSwatchPicker.Item>
        ))}
      </ColorSwatchPicker>
      <View testID="away" class="size-8 bg-default" />
    </Stage>
  );
}

/**
 * `host.params.input` / `host.params.density` feed `EnvironmentScope`; an
 * absent param keeps the host-derived value, so a case opened without them
 * is the desktop-parity baseline (the tabs/breadcrumbs convention). Every
 * case mounts inside it: NSH context reaches a subtree only for elements
 * created under the provider, so the case element must be built inside
 * `Case`'s body — a `content` variable assigned in `Fixture`'s body would
 * keep `Fixture` as its owner and bypass the scope.
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

function Case(props: { name: string }) {
  const name = props.name;

  if (name === "layout-grid") return <LayoutCase />;
  if (name === "layout-stack") return <LayoutCase layout="stack" />;
  if (name === "custom-indicator") return <CustomIndicatorCase />;
  if (name === "mobile") return <MobileCase />;
  if (name === "ctx-probe") return <CtxProbeCase />;
  if (name === "events") return <EventsCase />;
  if (name === "hover") return <HoverCase />;

  return <SelectCase />;
}

function Fixture() {
  const name = String(host.params.case ?? "select");

  return (
    <ScopedMobile>
      <Case name={name} />
    </ScopedMobile>
  );
}

mount(Fixture);
