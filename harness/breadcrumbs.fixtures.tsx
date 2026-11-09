import { host, mount, Text, View } from "nsh";
import { Breadcrumbs } from "@heroui/react";
import { probe } from "@scenario/probe";

/*
 * NSH-only Breadcrumbs fixture (port sheet 4b), not a shared scenario.
 *
 * Both cases serve paint-only regressions that neither a shared scenario nor a
 * `spanStyle` / `enabled` query can reach: `nsh test` reads no computed style,
 * and opacity is a view layer over its content, so only a `--target web`
 * screenshot shows it. HeroUI's own API has no way to draw a full-opacity
 * reference of the same paint next to the component, which is what the
 * comparisons below need; that is why this entry exists.
 *
 * `paint` (X-001) rows, top to bottom, each with the same label raster:
 *   current-default    Breadcrumbs, its last (current) item painting "Laptop"
 *   current-disabled   the same under isDisabled
 *   link-full          Text painted at `text-link`, opacity 1 (reference)
 *   link-half          the same behind `opacity-50` (what the bug paints)
 *   muted-disabled     Breadcrumbs isDisabled, its non-current item "Home"
 *   muted-full         Text at `text-muted`, opacity 1 (reference)
 *   muted-half         the same behind `opacity-50` (the correct 0.5)
 * A `separator=" "` keeps the chevron out of every band, and the empty first or
 * last label keeps the other item out, so each band holds exactly one paint.
 *
 * `separator-rtl` (X-002) stacks one default (chevron) separator between two
 * empty labels, once in an ltr row and once in an rtl one, so the glyph is the
 * only ink in each band and its shape can be measured.
 *
 * It sits next to harness/nsh.json on purpose: NSH takes the entry's own
 * directory as the app root, so an entry under harness/tests/... would find no
 * nsh.json and lose the `@heroui/react` alias and the theme.
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
      y: event.bounds.origin.y,
      height: event.bounds.size.height,
    });
}

/** The label is repeated M's: a full-coverage stem, so a screenshot can read the paint. */
function PaintCase() {
  return (
    <View class="flex-1 flex-col items-start gap-4 bg-background p-6">
      <View class="flex-col" onLayout={layoutProbe("current-default")}>
        <Breadcrumbs separator=" ">
          <Breadcrumbs.Item testID="item-empty"> </Breadcrumbs.Item>
          <Breadcrumbs.Item testID="current-default">MMMM</Breadcrumbs.Item>
        </Breadcrumbs>
      </View>
      <View class="flex-col" onLayout={layoutProbe("current-disabled")}>
        <Breadcrumbs isDisabled separator=" ">
          <Breadcrumbs.Item testID="item-empty-disabled"> </Breadcrumbs.Item>
          <Breadcrumbs.Item testID="current-disabled">MMMM</Breadcrumbs.Item>
        </Breadcrumbs>
      </View>
      <View class="flex-col" onLayout={layoutProbe("link-full")}>
        <Text class="text-sm leading-5 font-medium text-link">MMMM</Text>
      </View>
      <View class="flex-col" onLayout={layoutProbe("link-half")}>
        <View class="opacity-50">
          <Text class="text-sm leading-5 font-medium text-link">MMMM</Text>
        </View>
      </View>
      <View class="flex-col" onLayout={layoutProbe("muted-disabled")}>
        <Breadcrumbs isDisabled separator=" ">
          <Breadcrumbs.Item testID="muted-disabled">HHHH</Breadcrumbs.Item>
          <Breadcrumbs.Item testID="item-empty-muted"> </Breadcrumbs.Item>
        </Breadcrumbs>
      </View>
      <View class="flex-col" onLayout={layoutProbe("muted-full")}>
        <Text class="text-sm leading-5 font-medium text-muted">HHHH</Text>
      </View>
      <View class="flex-col" onLayout={layoutProbe("muted-half")}>
        <View class="opacity-50">
          <Text class="text-sm leading-5 font-medium text-muted">HHHH</Text>
        </View>
      </View>
    </View>
  );
}

function SeparatorRtlCase() {
  return (
    <View class="flex-1 flex-col items-start gap-10 bg-background p-6">
      <View class="flex-col" onLayout={layoutProbe("ltr")} style={{ direction: "ltr" }}>
        <Breadcrumbs>
          <Breadcrumbs.Item> </Breadcrumbs.Item>
          <Breadcrumbs.Item> </Breadcrumbs.Item>
        </Breadcrumbs>
      </View>
      <View class="flex-col" onLayout={layoutProbe("rtl")} style={{ direction: "rtl" }}>
        <Breadcrumbs>
          <Breadcrumbs.Item> </Breadcrumbs.Item>
          <Breadcrumbs.Item> </Breadcrumbs.Item>
        </Breadcrumbs>
      </View>
    </View>
  );
}

function Fixture() {
  const name = String(host.params.case ?? "paint");

  if (name === "separator-rtl") return <SeparatorRtlCase />;

  return <PaintCase />;
}

mount(Fixture);
