import { effect, host, mount, Text, View } from "nsh";
import type { Component, JSX } from "nsh";
import { EnvironmentScope, Separator } from "@heroui/react";
import { SeparatorContext } from "../src/components/separator/context";
import { createInput } from "../src/primitives/environment";
import { probe } from "@scenario/probe";

/*
 * NSH-only fixture for the separator adapt unit (sheet A-006:
 * adapt-sheets/separator.md §2; the shared scenarios at
 * scenarios/separator.scenarios.tsx carry no `EnvironmentScope` channel, so
 * the injected-environment assertions live here).
 *
 * `host.params.case` picks the tree:
 *
 *   default     One `<Separator>` inside a fixed `w-[300px]` column, `testID`
 *               and an `onLayout` bounds probe — the `h-px w-full` hairline.
 *   vertical    A `h-5 w-[300px] flex-row` line with text on both sides and a
 *               `orientation="vertical"` divider — `w-px` × `self-stretch` /
 *               `min-h-2` geometry.
 *   variants    All three `variant` colors side by side in one column.
 *   decorative  Three dividers: `isDecorative` horizontal, `isDecorative`
 *               vertical, and `aria-hidden` — each `testID`-addressable to
 *               show the accessibility switch never removes the view.
 *   context     A `SeparatorContext.Provider` feeding `orientation` and
 *               `partClass` (menu/toolbar's descendant-selector channel):
 *               one divider inherits the context axis, one overrides it with
 *               its own `orientation` prop.
 *   all         Every case tree at once, for the environment-equality rows
 *               (M-004/M-005): two opens instead of ten keep the web runner
 *               from starving. `separator` is the one testID/probe name two
 *               trees share (default and vertical), so it reports count 2.
 *
 * `host.params.input` / `host.params.density` feed `EnvironmentScope`; an
 * absent param keeps the host-derived value, so a case opened without them
 * is the desktop-parity baseline. The `env` probe reports the resolved
 * `createInput()` once per mount (M-007's pin check). It sits next to
 * harness/nsh.json on purpose: NSH takes the entry's own directory as the
 * app root, so an entry under harness/tests/... would find no nsh.json and
 * lose the `@heroui/react` alias and the theme.
 */

type LayoutEvent = {
  bounds: {
    origin: { x: number; y: number };
    size: { width: number; height: number };
  };
};

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

/** Reports the resolved input once — the M-007 environment pin evidence. */
function EnvProbe() {
  const input = createInput();

  effect(() => {
    probe("env")({ input: input() });
  });

  return null;
}

/**
 * `host.params.input` / `host.params.density` feed `EnvironmentScope`; an
 * absent param keeps the host-derived value, so a case opened without them
 * is the desktop-parity baseline (same convention as
 * `breadcrumbs.fixtures.tsx`).
 */
function Scoped(props: { children?: JSX.Element }) {
  const input = String(host.params.input ?? "");
  const density = String(host.params.density ?? "");

  return (
    <EnvironmentScope
      input={input === "touch" || input === "pointer" ? input : undefined}
      density={density === "compact" || density === "default" ? density : undefined}
    >
      <EnvProbe />
      {props.children}
    </EnvironmentScope>
  );
}

function Frame(props: { children?: JSX.Element }) {
  return (
    <View class="flex-1 items-start gap-4 bg-background p-6">
      {props.children}
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * default case (M-001)
 * -----------------------------------------------------------------------------------------------*/

function DefaultCase() {
  return (
    <View class="w-[300px]">
      <Separator testID="separator" onLayout={boxProbe("separator")} />
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * vertical case (M-002)
 * -----------------------------------------------------------------------------------------------*/

function VerticalCase() {
  return (
    <View class="h-5 w-[300px] flex-row items-center gap-4">
      <Text>Blog</Text>
      <Separator orientation="vertical" testID="separator" onLayout={boxProbe("separator")} />
      <Text>Docs</Text>
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * variants case (M-001)
 * -----------------------------------------------------------------------------------------------*/

function VariantsCase() {
  return (
    <View class="w-[300px] flex-col gap-4">
      <Separator variant="default" testID="separator-default" onLayout={boxProbe("separator-default")} />
      <Separator variant="secondary" testID="separator-secondary" onLayout={boxProbe("separator-secondary")} />
      <Separator variant="tertiary" testID="separator-tertiary" onLayout={boxProbe("separator-tertiary")} />
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * decorative case (M-002)
 * -----------------------------------------------------------------------------------------------*/

function DecorativeCase() {
  return (
    <>
      <View class="w-[300px]">
        <Separator isDecorative testID="divider-horizontal" onLayout={boxProbe("divider-horizontal")} />
      </View>
      <View class="h-5 w-[300px] flex-row items-center gap-4">
        <Separator
          isDecorative
          orientation="vertical"
          testID="divider-vertical"
          onLayout={boxProbe("divider-vertical")}
        />
      </View>
      <View class="w-[300px]">
        <Separator aria-hidden testID="divider-aria" onLayout={boxProbe("divider-aria")} />
      </View>
    </>
  );
}

/* -------------------------------------------------------------------------------------------------
 * context case (M-003): the container's descendant-selector channel
 * -----------------------------------------------------------------------------------------------*/

function ContextCase() {
  return (
    <SeparatorContext.Provider
      value={{
        orientation: () => "vertical",
        partClass: (axis) =>
          axis === "vertical"
            ? "h-1/2 self-center"
            : "w-1/2 justify-center justify-self-center",
      }}
    >
      <View class="h-[40px] w-[300px] flex-row gap-4">
        <Separator testID="sep-inherit" onLayout={boxProbe("sep-inherit")} />
        <Separator
          orientation="horizontal"
          testID="sep-prop"
          onLayout={boxProbe("sep-prop")}
        />
      </View>
    </SeparatorContext.Provider>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Cases table
 * -----------------------------------------------------------------------------------------------*/

/*
 * `all` mounts every case tree at once — `separator` is the one testID/probe
 * name two trees share (default and vertical, count 2), every other name is
 * unique — so a two-environment comparison (M-004, M-005) pays one `open` per
 * side instead of one per case; web targets cap how many pages a run spawns.
 */
function AllCase() {
  return (
    <>
      <DefaultCase />
      <VerticalCase />
      <VariantsCase />
      <DecorativeCase />
      <ContextCase />
    </>
  );
}

const cases: Record<string, Component> = {
  default: DefaultCase,
  vertical: VerticalCase,
  variants: VariantsCase,
  decorative: DecorativeCase,
  context: ContextCase,
  all: AllCase,
};

function Fixture() {
  const name = String(host.params.case ?? "default");
  const Case = cases[name] ?? DefaultCase;

  return (
    <Frame>
      <Scoped>
        <Case />
      </Scoped>
    </Frame>
  );
}

mount(Fixture);
