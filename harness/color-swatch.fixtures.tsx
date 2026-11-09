import { mount, View } from "nsh";
import { ColorSwatch } from "@heroui/react";
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
 */

type LayoutEvent = {
  bounds: {
    origin: { x: number; y: number };
    size: { width: number; height: number };
  };
};

function layoutProbe(name: "default" | "lg-square") {
  return (event: LayoutEvent) =>
    probe("layout")({
      name,
      x: event.bounds.origin.x,
      y: event.bounds.origin.y,
      width: event.bounds.size.width,
      height: event.bounds.size.height,
    });
}

function Fixture() {
  return (
    <Stage>
      <View class="flex-row items-start gap-4">
        <ColorSwatch color="#0485F7" onLayout={layoutProbe("default")} />
        <ColorSwatch
          color="#0485F7"
          onLayout={layoutProbe("lg-square")}
          shape="square"
          size="lg"
        />
      </View>
    </Stage>
  );
}

mount(Fixture);
