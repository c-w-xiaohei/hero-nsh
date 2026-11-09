import { mount, View } from "nsh";
import { Badge } from "@heroui/react";
import { probe } from "@scenario/probe";

/*
 * NSH-only Badge fixture (port sheet 4b, T-005), not a shared scenario.
 *
 * The upstream case asserts that the implicit label sub-part exists, which is
 * how the `px-0.5` padding on `Badge.Label` reaches string children. NSH cannot
 * query data-slot or computed padding, so this fixture measures the same
 * geometry through onLayout: one badge with an implicit label, one with an
 * explicit Badge.Label and one with an explicit px-0 Badge.Label that acts as
 * the no-padding control. The text is "Hello There" rather than "5" so
 * `min-w-7` cannot mask the four points of horizontal padding.
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

type Case = "implicit-root" | "explicit-root" | "explicit-label" | "no-padding-root" | "no-padding-label";

function layoutProbe(name: Case) {
  return (event: LayoutEvent) =>
    probe("layout")({
      name,
      width: event.bounds.size.width,
      height: event.bounds.size.height,
    });
}

function Fixture() {
  return (
    <View class="flex-row items-start gap-8 p-6">
      <Badge.Anchor>
        <Badge onLayout={layoutProbe("implicit-root")}>Hello There</Badge>
      </Badge.Anchor>
      <Badge.Anchor>
        <Badge onLayout={layoutProbe("explicit-root")}>
          <Badge.Label onLayout={layoutProbe("explicit-label")}>Hello There</Badge.Label>
        </Badge>
      </Badge.Anchor>
      <Badge.Anchor>
        <Badge onLayout={layoutProbe("no-padding-root")}>
          <Badge.Label className="px-0" onLayout={layoutProbe("no-padding-label")}>
            Hello There
          </Badge.Label>
        </Badge>
      </Badge.Anchor>
    </View>
  );
}

mount(Fixture);
