import { host, mount, Text, View } from "nsh";
import type { JSX } from "nsh";
import { Breadcrumbs, EnvironmentScope } from "@heroui/react";
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
      <View class="flex-col" onLayout={layoutProbe("ltr-custom")} style={{ direction: "ltr" }}>
        <Breadcrumbs separator={<Text>L</Text>}>
          <Breadcrumbs.Item> </Breadcrumbs.Item>
          <Breadcrumbs.Item> </Breadcrumbs.Item>
        </Breadcrumbs>
      </View>
      <View class="flex-col" onLayout={layoutProbe("rtl-custom")} style={{ direction: "rtl" }}>
        <Breadcrumbs separator={<Text>L</Text>}>
          <Breadcrumbs.Item> </Breadcrumbs.Item>
          <Breadcrumbs.Item> </Breadcrumbs.Item>
        </Breadcrumbs>
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Mobile-environment cases (adapt-sheets/breadcrumbs.md §4 M-001…M-006)
 * -----------------------------------------------------------------------------------------------*/

/** A full bounds box; the paint cases' `layoutProbe` keeps only y/height. */
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
 * The row the mobile assertions drive: two links (Home, Products) carrying
 * the caller's `onPress` probe and a current last item (Laptop). The custom
 * separator is a View that fills its slot wrapper — the density axis sizes
 * the wrapper (`size-3`/`size-2.5`), so the child's box reports the
 * separator's. Root `onAction` and item `onPress` share the probe channel,
 * so storage order is the press-chain order M-003 asserts. An item's
 * `onLayout` lands on its outer View (link + separator); the label Text's
 * own `onLayout` reports the text box inside the link for M-006.
 */
function MobileCase(props: { disabled?: boolean }) {
  return (
    <View class="p-6">
      <Breadcrumbs
        isDisabled={props.disabled}
        onAction={probe("onAction")}
        onLayout={boxProbe("root")}
        separator={
          <View class="h-full w-full" onLayout={boxProbe("separator")} />
        }
      >
        <Breadcrumbs.Item
          id="home"
          href="#home"
          testID="item-home"
          onPress={probe("onPress")}
          onLayout={boxProbe("item-home")}
        >
          <Text onLayout={boxProbe("link-home")}>Home</Text>
        </Breadcrumbs.Item>
        <Breadcrumbs.Item
          id="products"
          href="#products"
          testID="item-products"
          onPress={probe("onPress")}
          onLayout={boxProbe("item-products")}
        >
          <Text onLayout={boxProbe("link-products")}>Products</Text>
        </Breadcrumbs.Item>
        <Breadcrumbs.Item
          id="current"
          testID="item-current"
          onLayout={boxProbe("item-current")}
        >
          <Text onLayout={boxProbe("link-current")}>Laptop</Text>
        </Breadcrumbs.Item>
      </Breadcrumbs>
    </View>
  );
}

/**
 * `host.params.input` / `host.params.density` feed `EnvironmentScope`; an
 * absent param keeps the host-derived value, so a case opened without them
 * is the desktop-parity baseline.
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

function Fixture() {
  const name = String(host.params.case ?? "paint");

  if (name === "separator-rtl") return <SeparatorRtlCase />;

  if (name === "links" || name === "disabled") {
    return (
      <ScopedMobile>
        <MobileCase disabled={name === "disabled"} />
      </ScopedMobile>
    );
  }

  return <PaintCase />;
}

mount(Fixture);
