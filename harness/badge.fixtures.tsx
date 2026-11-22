import { host, mount, Text, View } from "nsh";
import type { JSX } from "nsh";
import { Badge, EnvironmentScope } from "@heroui/react";
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
 * The last two entries (X-001) measure a label holding an 8pt icon beside the
 * text "New" against the same label holding only that text. HeroUI's label is a
 * <span>, so its children run inline on one line; an NSH default column would
 * stack the icon above the text and grow the label's height by the icon.
 *
 * `host.params.case === "mobile"` swaps the whole board for the mobile
 * assertion case (adapt sheet §4): the same bounds/text measurements under
 * `EnvironmentScope`, whose input/density come from `host.params`. Badge is
 * action A, pure display — the case exists to prove geometry, placement and
 * event pass-through are identical on both environments, not to add any
 * mobile-only branch.
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

type Case =
  | "implicit-root"
  | "explicit-root"
  | "explicit-label"
  | "no-padding-root"
  | "no-padding-label"
  | "mixed-label"
  | "text-only-label";

function layoutProbe(name: Case) {
  return (event: LayoutEvent) =>
    probe("layout")({
      name,
      width: event.bounds.size.width,
      height: event.bounds.size.height,
    });
}

/* -------------------------------------------------------------------------------------------------
 * Mobile-environment case (adapt-sheets/badge.md §4 M-001…M-005)
 * -----------------------------------------------------------------------------------------------*/

/** A full bounds box; `layoutProbe` above keeps only size, placement needs origin. */
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
 * `host.params.input` / `host.params.density` feed `EnvironmentScope`; an
 * absent param keeps the host-derived value, so opening this fixture without
 * them is the desktop-parity baseline the mobile assertions compare against
 * (same convention as breadcrumbs.fixtures.tsx's ScopedMobile).
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

/**
 * The rows the mobile assertions drive, top to bottom:
 *
 *   md-badge     a string-child Badge in an Anchor holding a sized sibling.
 *                The anchor keeps its own box, so the badge's absolute
 *                origin reports the placement translate (top-right: the
 *                origin sits right of the anchor's right edge minus the
 *                badge's own quarter). A bare `Text` control in the same
 *                `text-xs` face gives the label's text-width reference:
 *                label width minus it is the px-0.5 padding, the same
 *                measurement the implicit-wrap assertion needs.
 *   sizes        sm / lg badges, for the size axis' minimum boxes.
 *   paint        a secondary+accent badge whose Text the spanStyle color
 *                read keys on.
 *   press        an md Badge carrying the caller's `onPress` probe: under
 *                any environment the badge is pure display, so pressing it
 *                may only record the pass-through call.
 */
function MobileCase() {
  return (
    <View class="flex-col items-start gap-10 p-6">
      <Badge.Anchor onLayout={boxProbe("anchor")}>
        <View class="size-20 rounded-3xl bg-default" />
        <Badge onLayout={boxProbe("root")}>
          <Badge.Label onLayout={boxProbe("label")}>5</Badge.Label>
        </Badge>
      </Badge.Anchor>
      <Badge.Anchor>
        <View class="size-8 rounded-xl bg-default" />
        <Badge size="sm" onLayout={boxProbe("root-sm")}>
          1
        </Badge>
      </Badge.Anchor>
      <Badge.Anchor>
        <View class="size-8 rounded-xl bg-default" />
        <Badge size="lg" onLayout={boxProbe("root-lg")}>
          99
        </Badge>
      </Badge.Anchor>
      <Badge variant="secondary" color="accent">
        <Badge.Label>
          <Text>Paint</Text>
        </Badge.Label>
      </Badge>
      <Badge onPress={probe("onPress")} onLayout={boxProbe("press-root")}>
        9
      </Badge>
      <Text class="text-xs leading-[1.34] font-medium" onLayout={boxProbe("text-ref")}>
        5
      </Text>
    </View>
  );
}

function Fixture() {
  if (String(host.params.case ?? "") === "mobile") {
    return (
      <ScopedMobile>
        <MobileCase />
      </ScopedMobile>
    );
  }

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
      <Badge.Anchor>
        <Badge>
          <Badge.Label onLayout={layoutProbe("mixed-label")}>
            <View class="size-2 rounded-full bg-accent" />
            <Text>New</Text>
          </Badge.Label>
        </Badge>
      </Badge.Anchor>
      <Badge.Anchor>
        <Badge>
          <Badge.Label onLayout={layoutProbe("text-only-label")}>
            <Text>New</Text>
          </Badge.Label>
        </Badge>
      </Badge.Anchor>
    </View>
  );
}

mount(Fixture);
