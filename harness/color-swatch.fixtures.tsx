import { host, mount, Text, View } from "nsh";
import type { Component, JSX } from "nsh";
import { ColorSwatch, EnvironmentScope } from "@heroui/react";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";

/*
 * NSH-only ColorSwatch fixture (port sheet 4b), not a shared scenario.
 *
 * T-003 is a partial port: upstream asserts the `color-swatch--lg` and
 * `color-swatch--square` BEM modifiers. NSH does not project class names (D18)
 * and `nsh test` cannot read them, so the size half is read from the box the
 * component actually lays out and the radius half stays with the
 * `color-swatch/sizes` screenshot. Two swatches sit side by side, both with
 * onLayout: the default (circle, md) for the 32-point control and a square lg
 * one for the 36-point case.
 *
 * It sits next to harness/nsh.json on purpose. NSH takes the entry's own
 * directory as the app root, so an entry under harness/tests/... would find no
 * nsh.json and lose the `@heroui/react` alias and the theme.
 *
 * Mobile layer (adapt-sheets/color-swatch.md §4 M-001…M-003), selected by
 * `host.params.case`:
 *
 *   matrix   The 5×2 size×shape grid, each swatch reporting its box through
 *            `onLayout` -> `layout` as `swatch-<shape>-<size>`, plus a
 *            transparent pair: `swatch-nocolor` (no `color`, the md default)
 *            and `swatch-empty` (`color=""`, lg square) — the geometry half
 *            of M-001/M-002.
 *   named    Three swatches pinning the accessible-name synthesis: `colorName`
 *            alone ("Brand blue"), `colorName` + `aria-label` ("Midnight,
 *            extra"), and `aria-label` appended to the generated color name.
 *   press    A bare swatch (`swatch-plain`, no handlers — M-003's "no press
 *            path" half) next to one wired `onPress` -> `events` probe
 *            (`swatch-press`).
 *
 * `host.params.scope` picks the `EnvironmentScope` wrapper ("" = host
 * default, "touch" = `input="touch"`), same convention as
 * `chip.fixtures.tsx`. No `case` keeps the original two-swatch layout T-003
 * measures.
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

type Scope = "" | "touch";

function Scoped(props: { children?: JSX.Element }) {
  const scope = String(host.params.scope ?? "") as Scope;

  return scope === "touch" ? (
    <EnvironmentScope input="touch">{props.children}</EnvironmentScope>
  ) : (
    <>{props.children}</>
  );
}

const events = probe("events");

const SHAPES = ["circle", "square"] as const;
const SIZES = ["xs", "sm", "md", "lg", "xl"] as const;

/* -------------------------------------------------------------------------------------------------
 * matrix case (M-001, M-002): the full size × shape grid plus the transparent pair
 * -----------------------------------------------------------------------------------------------*/

function MatrixCase() {
  return (
    <View class="flex-col gap-4">
      {SHAPES.map((shape) => (
        <View class="flex-row items-center gap-4">
          {SIZES.map((size) => {
            const name = `swatch-${shape}-${size}`;
            return (
              <ColorSwatch
                testID={name}
                color="#0485F7"
                onLayout={layoutProbe(name)}
                shape={shape}
                size={size}
              />
            );
          })}
        </View>
      ))}
      <View class="flex-row items-center gap-4">
        <ColorSwatch
          testID="swatch-nocolor"
          onLayout={layoutProbe("swatch-nocolor")}
        />
        <ColorSwatch
          testID="swatch-empty"
          color=""
          onLayout={layoutProbe("swatch-empty")}
          shape="square"
          size="lg"
        />
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * named case (M-001, M-002): the accessible-name synthesis, unchanged in both environments
 * -----------------------------------------------------------------------------------------------*/

function NamedCase() {
  return (
    <View class="flex-row items-center gap-4">
      <ColorSwatch
        testID="swatch-name-only"
        color="#0485F7"
        colorName="Brand blue"
      />
      <ColorSwatch
        testID="swatch-name-extra"
        aria-label="extra"
        color="#0485F7"
        colorName="Midnight"
      />
      <ColorSwatch
        testID="swatch-label-only"
        aria-label="night swatch"
        color="#0485F7"
      />
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * press case (M-003): passthrough onPress vs. a bare swatch with no press path
 * -----------------------------------------------------------------------------------------------*/

function PressCase() {
  return (
    <View class="flex-row items-center gap-4">
      <ColorSwatch testID="swatch-plain" color="#0485F7" />
      <ColorSwatch
        testID="swatch-press"
        color="#0485F7"
        onPress={() => events("press")}
      />
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Legacy case: the two swatches T-003 measures (no `case` param)
 * -----------------------------------------------------------------------------------------------*/

function LegacyCase() {
  return (
    <View class="flex-row items-start gap-4">
      <ColorSwatch color="#0485F7" onLayout={layoutProbe("default")} />
      <ColorSwatch
        color="#0485F7"
        onLayout={layoutProbe("lg-square")}
        shape="square"
        size="lg"
      />
    </View>
  );
}

const cases: Record<string, Component> = {
  matrix: MatrixCase,
  named: NamedCase,
  press: PressCase,
};

function Fixture() {
  const name = String(host.params.case ?? "");
  const Case = name === "" ? LegacyCase : cases[name];

  if (Case === undefined) {
    return (
      <Stage>
        <Text>{`unknown case: ${name}`}</Text>
      </Stage>
    );
  }

  return (
    <Stage>
      <Scoped>
        <Case />
      </Scoped>
    </Stage>
  );
}

mount(Fixture);
