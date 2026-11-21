import { host, mount, View } from "nsh";
import type { Component, JSX } from "nsh";
import { Chip, EnvironmentScope } from "@heroui/react";
import type { ChipVariants } from "@heroui/react";
import { probe } from "@scenario/probe";

/*
 * NSH-only fixture for the chip adapt unit (adapt-sheets/chip.md §2
 * A-001…A-004, §4 M-001…M-004). Every sheet 落点 is 保留: the chip itself
 * changes nothing — `onPress` and friends already reach the root `View`
 * through `viewProps(rest)`, and `focusable` stays off — so this fixture is
 * the observable half of "提供 onPress 时可交互；静态用法保持展示".
 *
 * `host.params.case` picks the shape:
 *
 *   static   A bare `<Chip>` with no press handlers: `texts` carries the
 *            label and a press on `id:chip-static` can never land in a
 *            probe, because nothing in the fixture listens (M-001's no-op
 *            half and M-004's "still renders / still not pressable" half).
 *   grid     All twelve size×variant combinations, each reporting its box
 *            through the `layout` probe — the geometry baseline of M-001 and
 *            the "size does not move under injected touch" half of M-004.
 *   press    One `<Chip>` wired with `onPressDown`/`onPressUp`/`onPress` ->
 *            the `events` probe (order matters for M-002) and an `onLayout`
 *            -> `layout` report. `host.params.hitslop` (a number of points,
 *            e.g. "16") is passed through as `hitSlop`, and a separate
 *            `slop-target` view sits half inside the widened hit area for
 *            the out-of-bounds-press experiment of M-003.
 *
 * `host.params.scope` picks the `EnvironmentScope` wrapper ("" = host
 * default, "touch" = `input="touch"`), same convention as
 * `pressable.fixtures.tsx` / `skeleton.fixtures.tsx`. It sits next to
 * harness/nsh.json on purpose: NSH takes the entry's own directory as the
 * app root, so an entry under harness/tests/... finds no nsh.json and loses
 * the `@heroui/react` alias and the theme.
 */

type Scope = "" | "touch";

function Scoped(props: { children?: JSX.Element }) {
  const scope = String(host.params.scope ?? "") as Scope;

  return scope === "touch" ? (
    <EnvironmentScope input="touch">{props.children}</EnvironmentScope>
  ) : (
    <>{props.children}</>
  );
}

function Frame(props: { children?: JSX.Element }) {
  return (
    <View class="flex-1 items-start gap-3 bg-background p-6">
      {props.children}
    </View>
  );
}

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

const events = probe("events");

/* -------------------------------------------------------------------------------------------------
 * static case (M-001, M-004)
 * -----------------------------------------------------------------------------------------------*/

function StaticCase() {
  return <Chip testID="chip-static">Static chip</Chip>;
}

/* -------------------------------------------------------------------------------------------------
 * grid case (M-001, M-004): every size × variant cell, each with a layout
 * report, so both environments' geometry can be diffed cell by cell
 * -----------------------------------------------------------------------------------------------*/

const SIZES = ["sm", "md", "lg"] as const;
const VARIANTS = ["primary", "secondary", "soft", "tertiary"] as const;

function GridCase() {
  return (
    <View class="gap-2">
      {SIZES.map((size) => (
        <View class="flex-row items-center gap-2">
          {VARIANTS.map((variant) => {
            const name = `${size}-${variant}`;
            return (
              <Chip
                testID={`chip-${name}`}
                size={size as ChipVariants["size"]}
                variant={variant as ChipVariants["variant"]}
                color="accent"
                onLayout={layoutProbe(`chip-${name}`)}
              >
                {name}
              </Chip>
            );
          })}
        </View>
      ))}
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * press case (M-002, M-003)
 * -----------------------------------------------------------------------------------------------*/

function PressCase() {
  const slop = Number.parseInt(String(host.params.hitslop ?? "0"), 10);

  return (
    <View class="flex-row items-center">
      <Chip
        testID="chip-press"
        color="accent"
        variant="soft"
        hitSlop={slop > 0 ? slop : undefined}
        onPressDown={() => events("pressDown")}
        onPressUp={() => events("pressUp")}
        onPress={() => events("press")}
        onLayout={layoutProbe("chip-press")}
      >
        Pressable chip
      </Chip>
      {/*
        A plain view whose box overlaps the chip's widened hit area: pressing
        `id:slop-target` lands inside `chip-press`'s `hitSlop` while outside
        its visible bounds (M-003's out-of-bounds half).
      */}
      <View testID="slop-target" class="w-2 h-2 bg-danger" />
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Cases table
 * -----------------------------------------------------------------------------------------------*/

const cases: Record<string, Component> = {
  static: StaticCase,
  grid: GridCase,
  press: PressCase,
};

function Fixture() {
  const name = String(host.params.case ?? "static");
  const Case = cases[name] ?? StaticCase;

  return (
    <Frame>
      <Scoped>
        <Case />
      </Scoped>
    </Frame>
  );
}

mount(Fixture);
