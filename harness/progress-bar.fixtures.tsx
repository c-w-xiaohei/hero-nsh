import { host, mount } from "nsh";
import { Label, ProgressBar } from "@heroui/react";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";

/*
 * NSH-only ProgressBar fixture (port sheet 4b), not a shared scenario.
 *
 * `nsh/test` cannot read aria-valuenow / aria-valuetext, so the Kobalte cases
 * assert the two visible facts those attributes stand for: the Output text and
 * the Fill's measured width. The root is fixed at 200 points and the Track spans
 * both grid columns, so percentages become whole widths (30% -> 60, 40% -> 80).
 *
 * It sits next to harness/nsh.json on purpose. NSH takes the entry's own
 * directory as the app root, so an entry under harness/tests/... finds no
 * nsh.json and loses the `@heroui/react` alias and the theme.
 *
 * host.params.case=geometry, with optional value / minValue / maxValue /
 * indeterminate / valueLabel.
 */

type LayoutEvent = {
  bounds: {
    origin: { x: number; y: number };
    size: { width: number; height: number };
  };
};

function layoutProbe(name: "track" | "fill") {
  return (event: LayoutEvent) =>
    probe("layout")({
      name,
      x: event.bounds.origin.x,
      y: event.bounds.origin.y,
      width: event.bounds.size.width,
      height: event.bounds.size.height,
    });
}

function numberParam(name: string): number | undefined {
  const raw = host.params[name];

  if (raw === undefined) return undefined;

  return typeof raw === "number" ? raw : Number(raw);
}

function GeometryCase() {
  const indeterminate =
    host.params.indeterminate === true || host.params.indeterminate === "true";
  const valueLabel =
    typeof host.params.valueLabel === "string" ? host.params.valueLabel : undefined;

  return (
    <Stage>
      <ProgressBar
        className="w-[200px]"
        isIndeterminate={indeterminate}
        maxValue={numberParam("maxValue")}
        minValue={numberParam("minValue")}
        value={numberParam("value")}
        valueLabel={valueLabel}
      >
        <Label>Progress Bar</Label>
        <ProgressBar.Output testID="output" />
        <ProgressBar.Track testID="track" onLayout={layoutProbe("track")}>
          <ProgressBar.Fill testID="fill" onLayout={layoutProbe("fill")} />
        </ProgressBar.Track>
      </ProgressBar>
    </Stage>
  );
}

function Fixture() {
  return <GeometryCase />;
}

mount(Fixture);
