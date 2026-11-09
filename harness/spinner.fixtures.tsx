import { host, mount, Text, View } from "nsh";
import { Spinner } from "@heroui/react";
import { probe } from "@scenario/probe";

/*
 * NSH-only Spinner fixture (port sheet 4b), not a shared scenario.
 *
 * `layout` renders the `lg` size next to the default `md` size and records each
 * root View's onLayout box, so the test can read the size variant's observable
 * effect: 32×32 points for `lg`, 24×24 for `md`. The upstream case asserts the
 * BEM modifier class names instead, which D18 drops.
 *
 * It sits next to harness/nsh.json on purpose: NSH takes the entry's own
 * directory as the app root, so a fixture under harness/tests/... would find no
 * nsh.json and lose the `@heroui/react` alias and the theme.
 */

type LayoutEvent = {
  bounds: {
    origin: { x: number; y: number };
    size: { width: number; height: number };
  };
};

function layoutProbe(name: "lg" | "md") {
  return (event: LayoutEvent) =>
    probe("layout")({
      name,
      width: event.bounds.size.width,
      height: event.bounds.size.height,
    });
}

function Fixture() {
  const name = String(host.params.case ?? "layout");

  if (name !== "layout") return <Text>{`unknown case: ${name}`}</Text>;

  return (
    <View class="flex-row items-start gap-4 p-4">
      <Spinner size="lg" testID="spinner-lg" onLayout={layoutProbe("lg")} />
      <Spinner testID="spinner-md" onLayout={layoutProbe("md")} />
    </View>
  );
}

mount(Fixture);
