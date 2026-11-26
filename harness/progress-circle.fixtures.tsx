import {
  CanvasRenderingContext2D,
  host,
  mount,
  Path2D,
  token,
  View,
} from "nsh";
import type { JSX } from "nsh";
import { EnvironmentScope, ProgressCircle } from "@heroui/react";
import { probe } from "@scenario/probe";

/*
 * NSH-only ProgressCircle fixture (port sheet 4b), not a shared scenario.
 *
 * `paint` renders one circle in the `color` the host names. Every stroke the
 * two canvases record is logged with its paint and dash pattern, so the test
 * can read the visible effect T-003 used to assert through the BEM modifier
 * class: the fill arc is the dashed stroke, and its `strokeStyle` must be the
 * token the color variant names. The track's own paint (a solid stroke of
 * `--default`) is recorded too, so filtering is visible in one place rather
 * than hidden in the component.
 *
 * It sits next to harness/nsh.json on purpose: NSH takes the entry's own
 * directory as the app root, so a fixture under harness/tests/... would find no
 * nsh.json and lose the `@heroui/react` alias and the theme.
 */

const colorTokens = {
  default: "default-foreground",
  accent: "accent",
  success: "success",
  warning: "warning",
  danger: "danger",
} as const;

export type ProgressCircleColor = keyof typeof colorTokens;

type StrokeCall = { paint: string; lineCap: string; dash: number[] };

let strokesRecorded = false;

/**
 * Records what each stroke hands the canvas. The canvas replays recorded
 * operations natively, so this is the only place the ring's paint is readable
 * on a headless run: `nsh/test` has no computed style or pixel query.
 */
function recordStrokes() {
  if (strokesRecorded) return;

  strokesRecorded = true;

  const stroke = CanvasRenderingContext2D.prototype.stroke;

  CanvasRenderingContext2D.prototype.stroke = function (path?: Path2D) {
    probe("stroke")({
      paint:
        typeof this.strokeStyle === "string"
          ? this.strokeStyle
          : String(this.strokeStyle),
      lineCap: this.lineCap,
      dash: this.getLineDash(),
    } satisfies StrokeCall);

    return stroke.call(this, path);
  };
}

function PaintCase() {
  const color = String(host.params.color ?? "warning") as ProgressCircleColor;
  const tokenName = colorTokens[color];

  // The same token the component must paint with, read in the app's own
  // appearance, so the test does not hardcode a converted color.
  probe("expected-paint")({ color, paint: token(tokenName) });

  return (
    <View class="p-4">
      <ProgressCircle aria-label="Loading" color={color} value={60}>
        <ProgressCircle.Track>
          <ProgressCircle.TrackCircle />
          <ProgressCircle.FillCircle />
        </ProgressCircle.Track>
      </ProgressCircle>
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Mobile-environment cases (adapt-sheets/progress-circle.md §4 M-001…M-007)
 * -----------------------------------------------------------------------------------------------*/

type LayoutEvent = {
  bounds: {
    origin: { x: number; y: number };
    size: { width: number; height: number };
  };
};

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

/**
 * `sizes` (M-002…M-004): one circle per `size` variant. The probe lands on
 * the Track — the box the `size` axis actually sizes (`size-5`/`size-7`/
 * `size-9`) — so the recorded bounds are the geometry contract an
 * environment axis must never move.
 */
function SizesCase() {
  return (
    <View class="flex-col items-start gap-4 p-4">
      <ProgressCircle aria-label="Loading sm" size="sm" value={60}>
        <ProgressCircle.Track testID="track-sm" onLayout={boxProbe("track-sm")}>
          <ProgressCircle.TrackCircle />
          <ProgressCircle.FillCircle />
        </ProgressCircle.Track>
      </ProgressCircle>
      <ProgressCircle aria-label="Loading md" size="md" value={60}>
        <ProgressCircle.Track testID="track-md" onLayout={boxProbe("track-md")}>
          <ProgressCircle.TrackCircle />
          <ProgressCircle.FillCircle />
        </ProgressCircle.Track>
      </ProgressCircle>
      <ProgressCircle aria-label="Loading lg" size="lg" value={60}>
        <ProgressCircle.Track onLayout={boxProbe("track-lg")}>
          <ProgressCircle.TrackCircle />
          <ProgressCircle.FillCircle />
        </ProgressCircle.Track>
      </ProgressCircle>
    </View>
  );
}

/** `indeterminate` (M-002): the no-known-value mount; strokes are recorded so the fill's quarter-arc dash is readable. */
function IndeterminateCase() {
  return (
    <View class="p-4">
      <ProgressCircle aria-label="Loading" isIndeterminate>
        <ProgressCircle.Track>
          <ProgressCircle.TrackCircle />
          <ProgressCircle.FillCircle />
        </ProgressCircle.Track>
      </ProgressCircle>
    </View>
  );
}

/** `disabled` (M-002): the `aria-disabled` path — `accessibilityState.disabled` plus R-011's halved opacity. */
function DisabledCase() {
  return (
    <View class="p-4">
      <ProgressCircle aria-label="Loading" aria-disabled value={60}>
        <ProgressCircle.Track>
          <ProgressCircle.TrackCircle />
          <ProgressCircle.FillCircle />
        </ProgressCircle.Track>
      </ProgressCircle>
    </View>
  );
}

/**
 * `host.params.input` / `host.params.density` feed `EnvironmentScope`; an
 * absent param keeps the host-derived value, so a case opened without them
 * is the desktop-parity baseline (breadcrumbs.fixtures.tsx convention).
 */
function ScopedMobile(props: { children?: JSX.Element }) {
  const input = String(host.params.input ?? "");
  const density = String(host.params.density ?? "");

  return (
    <EnvironmentScope
      input={input === "touch" || input === "pointer" ? input : undefined}
      density={
        density === "compact" || density === "default" ? density : undefined
      }
    >
      {props.children}
    </EnvironmentScope>
  );
}

function Fixture() {
  const name = String(host.params.case ?? "paint");

  recordStrokes();

  switch (name) {
    case "sizes":
      return (
        <ScopedMobile>
          <SizesCase />
        </ScopedMobile>
      );
    case "indeterminate":
      return (
        <ScopedMobile>
          <IndeterminateCase />
        </ScopedMobile>
      );
    case "disabled":
      return (
        <ScopedMobile>
          <DisabledCase />
        </ScopedMobile>
      );
    default:
      return (
        <ScopedMobile>
          <PaintCase />
        </ScopedMobile>
      );
  }
}

mount(Fixture);
