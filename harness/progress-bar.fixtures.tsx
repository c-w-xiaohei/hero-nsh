import { host, mount, Text, View } from "nsh";
import type { JSX } from "nsh";
import { Label, ProgressBar, EnvironmentScope } from "@heroui/react";
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
 * host.params.case (adapt sheet §2 A-006):
 *
 *   geometry      (default; unchanged signature: value / minValue / maxValue /
 *                  indeterminate / valueLabel) — one bar at 200 points with
 *                  track/fill `onLayout` bounds probes. The mobile assertions
 *                  re-open this same tree under `EnvironmentScope` to prove
 *                  the untouched `input`/`density` axes change nothing.
 *   sizes         sm / md / lg bars at 50%: the size axis' track heights.
 *   colors        success / danger bars at 70%: the color variants' mounts.
 *   value-label   one bar whose `valueLabel` overrides the formatted text.
 *   custom-format one bar with `formatOptions` `{style: "decimal",
 *                  minimumFractionDigits: 1}` over minValue -50 / maxValue 50 —
 *                  a non-percent style formats the clamped value itself.
 *   disabled      one `aria-disabled` bar, the disabled render path.
 *   render-prop   one bar whose one-argument children function reads the
 *                  { percentage, valueText, isIndeterminate } accessors.
 *
 * `host.params.input` / `host.params.density` feed `EnvironmentScope`
 * (breadcrumbs convention): an absent param keeps the host-derived value, so
 * opening any case without them is the desktop-parity baseline the mobile
 * assertions compare against.
 */

type LayoutEvent = {
  bounds: {
    origin: { x: number; y: number };
    size: { width: number; height: number };
  };
};

function layoutProbe(name: "track" | "fill" | "root" | string) {
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
        testID="root"
        className="w-[200px]"
        isIndeterminate={indeterminate}
        maxValue={numberParam("maxValue")}
        minValue={numberParam("minValue")}
        value={numberParam("value")}
        valueLabel={valueLabel}
        onLayout={layoutProbe("root")}
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

/* -------------------------------------------------------------------------------------------------
 * Mobile-environment cases (adapt-sheets/progress-bar.md §2 A-006)
 * -----------------------------------------------------------------------------------------------*/

/**
 * A-006: `host.params.input` / `host.params.density` feed `EnvironmentScope`;
 * an absent param keeps the host-derived value, so a case opened without them
 * is the desktop-parity baseline (same convention as
 * breadcrumbs.fixtures.tsx's ScopedMobile).
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

/** One fixed-shape bar: label, output, probed track/fill inside a 200pt root. */
function Bar(props: {
  name: string;
  value: number;
  minValue?: number;
  maxValue?: number;
  size?: "sm" | "md" | "lg";
  color?: "default" | "accent" | "success" | "warning" | "danger";
  formatOptions?: { style: "percent" } | { style: "decimal"; minimumFractionDigits?: number };
  valueLabel?: string;
  disabled?: boolean;
}) {
  return (
    <ProgressBar
      testID={`root-${props.name}`}
      className="w-[200px]"
      aria-disabled={props.disabled ? "true" : undefined}
      color={props.color}
      formatOptions={props.formatOptions}
      maxValue={props.maxValue}
      minValue={props.minValue}
      size={props.size}
      value={props.value}
      valueLabel={props.valueLabel}
      onLayout={layoutProbe(`root-${props.name}`)}
    >
      <Label>{props.name}</Label>
      <ProgressBar.Output testID={`output-${props.name}`} />
      <ProgressBar.Track
        testID={`track-${props.name}`}
        onLayout={layoutProbe(`track-${props.name}`)}
      >
        <ProgressBar.Fill
          testID={`fill-${props.name}`}
          onLayout={layoutProbe(`fill-${props.name}`)}
        />
      </ProgressBar.Track>
    </ProgressBar>
  );
}

function SizesCase() {
  return (
    <Stage>
      <Bar color="accent" name="sm" size="sm" value={50} />
      <Bar color="accent" name="md" size="md" value={50} />
      <Bar color="accent" name="lg" size="lg" value={50} />
    </Stage>
  );
}

function ColorsCase() {
  return (
    <Stage>
      <Bar color="success" name="success" value={70} />
      <Bar color="danger" name="danger" value={70} />
    </Stage>
  );
}

function ValueLabelCase() {
  return (
    <Stage>
      <Bar name="value-label" value={30} valueLabel="3 of 10 completed" />
    </Stage>
  );
}

function CustomFormatCase() {
  return (
    <Stage>
      <Bar
        formatOptions={{ style: "decimal", minimumFractionDigits: 1 }}
        maxValue={50}
        minValue={-50}
        name="custom-format"
        value={0}
      />
    </Stage>
  );
}

function DisabledCase() {
  return (
    <Stage>
      <Bar disabled name="disabled" value={60} />
    </Stage>
  );
}

/**
 * The render-prop contract: the one-argument children function runs once with
 * `{ percentage, valueText, isIndeterminate }` accessors, called at the
 * placement below so each `Text` still tracks them.
 */
function RenderPropCase() {
  return (
    <Stage>
      <ProgressBar
        testID="root-render-prop"
        className="w-[200px]"
        value={40}
        onLayout={layoutProbe("root-render-prop")}
      >
        {({ percentage, valueText, isIndeterminate }) => (
          <>
            <Label>Render prop</Label>
            <Text testID="percentage">{`percentage:${percentage()}`}</Text>
            <Text testID="value-text">{`valueText:${valueText()}`}</Text>
            <Text testID="indeterminate">{`indeterminate:${isIndeterminate()}`}</Text>
            <ProgressBar.Track
              testID="track-render-prop"
              onLayout={layoutProbe("track-render-prop")}
            >
              <ProgressBar.Fill
                testID="fill-render-prop"
                onLayout={layoutProbe("fill-render-prop")}
              />
            </ProgressBar.Track>
          </>
        )}
      </ProgressBar>
    </Stage>
  );
}

function Fixture() {
  const name = String(host.params.case ?? "geometry");

  // Every case mounts inside ScopedMobile: with no `input`/`density` params
  // the wrapper injects nothing, so the `geometry` case and its parameter
  // signature stay byte-identical while the same trees can be re-opened
  // under an injected environment (adapt sheet §4 M-003 / M-004 / M-005).
  let shape: JSX.Element;
  if (name === "sizes") {
    shape = <SizesCase />;
  } else if (name === "colors") {
    shape = <ColorsCase />;
  } else if (name === "value-label") {
    shape = <ValueLabelCase />;
  } else if (name === "custom-format") {
    shape = <CustomFormatCase />;
  } else if (name === "disabled") {
    shape = <DisabledCase />;
  } else if (name === "render-prop") {
    shape = <RenderPropCase />;
  } else {
    shape = <GeometryCase />;
  }

  return <ScopedMobile>{shape}</ScopedMobile>;
}

mount(Fixture);
