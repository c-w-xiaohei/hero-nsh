import {
  CanvasRenderingContext2D,
  host,
  mount,
  Path2D,
  token,
  View,
} from "nsh";
import { ProgressCircle } from "@heroui/react";
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

function Fixture() {
  const color = String(host.params.color ?? "warning") as ProgressCircleColor;
  const tokenName = colorTokens[color];

  recordStrokes();

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

mount(Fixture);
