import { host, mount, platform, signal, Text, View } from "nsh";
import type { Component, JSX, ScrollRef } from "nsh";
import {
  Button,
  createDensity,
  createInput,
  createScrollShadow,
  EnvironmentScope,
  ScrollShadow,
} from "@heroui/react";
import type { ScrollShadowVisibility } from "@heroui/react";
import { probe } from "@scenario/probe";

/*
 * NSH-only ScrollShadow fixture, not a shared scenario. Two entry points share
 * this file:
 *
 * X-005 (no `case` param, or `case === "mask"`): `nsh/test` cannot read a
 * view's `maskImage` (only character styles), and the one thing X-005 has to
 * prove is the mask the root carries on its very first paint, before any
 * layout event has delivered a size. So this entry drives the same state
 * machine the component drives — `createScrollShadow` is the port's public
 * primitive (src/primitives/index.ts, re-exported by the package) — with no
 * host handlers attached, and prints its mask accessor into a Text. At mount
 * the geometry snapshot is still `{0,0}`, which is exactly the
 * pre-measurement frame the component paints. Two instances: `auto`
 * (detection on, the default) and `controlled` (`visibility="both"`, which
 * upstream still draws while detection is off). Both are accepted by the
 * finding: `maskImage` must be absent or percentage-based until a viewport
 * extent arrives, because a point-based gradient at length 0 masks the whole
 * root out.
 *
 * A-005 (adapt sheet scroll-shadow.md §2): `host.params.case` mounts the
 * component itself so the mobile assertions can watch the real scroll path:
 *
 *   default     A vertical ScrollShadow (160pt viewport, 480pt content) with
 *               its caller hooks probed: root `onLayout` bounds into `layout`,
 *               `onVisibilityChange` into `visibility` (as `{state, render}` —
 *               the render count is what makes a stale mount-time prop read
 *               visible to M-002, mirroring T-014's `state:<value>@<count>`
 *               readout), the forwarded `onScroll` into `scroll`. "Scroll to
 *               middle" / "Scroll to end" / "Re-render" buttons drive the
 *               `ScrollRef` and the prop-freshness check.
 *   horizontal  The same box turned sideways (256pt viewport, 12 × 96pt
 *               cells): resting state is `right` under the default ltr
 *               direction probe.
 *   fits        Content shorter than the viewport: resting state is `none`.
 *   controlled  `visibility="both"`: the detection callback must never fire
 *               (M-002's controlled half), while `onScroll` still reaches the
 *               caller.
 *
 * `host.params.input` / `host.params.density` feed `EnvironmentScope`; an
 * absent param keeps the host-derived value, so a case opened without them is
 * the desktop-parity baseline (same convention as
 * `breadcrumbs.fixtures.tsx`). `host.params.input`/`density` are the only
 * axes the sheet's assertions inject; `width` stays host-derived.
 *
 * A-003 note (仲裁): every case mounts the component's own `Scroll` host
 * unchanged — no extra scroll layer, no responder of its own — so the
 * existing scroll path stays exactly as arbitrable by the sheet-handoff
 * unit's D seam as it is on desktop.
 *
 * It sits next to harness/nsh.json on purpose: NSH takes the entry's own
 * directory as the app root, so a fixture under harness/tests/... would find
 * no nsh.json and lose the `@heroui/react` alias and the theme.
 */

/* -------------------------------------------------------------------------------------------------
 * X-005: the primitive's mount-time mask, printed for the read-only assertion
 * -----------------------------------------------------------------------------------------------*/

function MaskProbe(props: { name: string; visibility: "auto" | "both" }) {
  const shadow = createScrollShadow({
    orientation: () => "vertical",
    offset: () => 0,
    size: () => 40,
    visibility: () => props.visibility,
    isEnabled: () => true,
  });

  // Read once, in the body: the readout is the mount value, not a later one.
  const mask = shadow.maskImage() ?? "none";

  return <Text>{`mask:${props.name}:${mask}`}</Text>;
}

function MaskCase() {
  return (
    <View class="flex-col gap-1 p-6">
      <MaskProbe name="auto" visibility="auto" />
      <MaskProbe name="controlled" visibility="both" />
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * A-005 case bodies
 * -----------------------------------------------------------------------------------------------*/

type LayoutEvent = {
  bounds: {
    origin: { x: number; y: number };
    size: { width: number; height: number };
  };
};

/** A full bounds box under the probe name, for the cross-environment compares. */
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

/** The last reported detection state as text (the `waitFor` sync channel). */
function StateReadout(props: { state: () => string; calls: () => number }) {
  return (
    <View class="flex-col">
      <Text>{`state:${props.state()}`}</Text>
      <Text>{`calls:${props.calls()}`}</Text>
    </View>
  );
}

/* 480pt of content in a 160pt viewport — the scenario's shape, kept so the
 * resting/middle/end states land on the same geometry the heroui suite
 * asserts. */
function tallRows() {
  return [
    "Row 0",
    ...Array.from({ length: 11 }, (_, index) => (
      <Text class="h-10">{`Row ${index + 1}`}</Text>
    )),
  ];
}

/* 12 × 96pt cells in a 256pt viewport. */
function wideCells() {
  return Array.from({ length: 12 }, (_, index) => (
    <Text class="w-24">{`Cell ${index}`}</Text>
  ));
}

/**
 * default: vertical overflow plus the prop-freshness channel. `report` keeps
 * the readout (`state:<v>@<render>`) and records every detection callback in
 * storage with the render count it was built with — a mount-time-stale
 * `onVisibilityChange` prop would keep reporting `render:0` after the two
 * Re-render presses (T-014's shape, realized through probes).
 */
function DefaultCase() {
  const renders = signal(0);
  const state = signal("-");
  const calls = signal(0);
  let scroller: ScrollRef | undefined;

  const report = (renderCount: number) => (visibility: ScrollShadowVisibility) => {
    state.set(`${visibility}@${renderCount}`);
    calls.update((count) => count + 1);
    probe("visibility")({ state: visibility, render: renderCount });
  };

  return (
    <View class="flex-col items-start gap-2 p-6">
      {/* The scroller mounts first so the chrome below it can never move its
          box: `Button` itself adapts under `input: "touch"` (`h-12`), and a
          sibling above the scroller would shift the bounds the
          cross-environment compare asserts. */}
      <ScrollShadow
        ref={(node) => {
          scroller = node;
        }}
        testID="scroller"
        className="h-40 w-64"
        onScroll={probe("scroll")}
        onLayout={boxProbe("root")}
        onVisibilityChange={report(renders())}
      >
        {tallRows()}
      </ScrollShadow>
      <StateReadout state={state} calls={calls} />
      <View class="flex-row gap-2">
        <Button onPress={() => renders.update((count) => count + 1)}>
          Re-render
        </Button>
        <Button onPress={() => scroller?.scrollTo({ y: 160 })}>
          Scroll to middle
        </Button>
        <Button onPress={() => scroller?.scrollTo({ y: 99999 })}>
          Scroll to end
        </Button>
      </View>
    </View>
  );
}

/** horizontal: sideways overflow; the root keeps its direction probe (A-002). */
function HorizontalCase() {
  const state = signal("-");
  const calls = signal(0);
  let scroller: ScrollRef | undefined;

  return (
    <View class="flex-col items-start gap-2 p-6">
      <ScrollShadow
        ref={(node) => {
          scroller = node;
        }}
        testID="scroller"
        className="h-24 w-64"
        orientation="horizontal"
        onScroll={probe("scroll")}
        onLayout={boxProbe("root")}
        onVisibilityChange={(visibility) => {
          state.set(visibility);
          calls.update((count) => count + 1);
          probe("visibility")({ state: visibility, render: 0 });
        }}
      >
        {wideCells()}
      </ScrollShadow>
      <StateReadout state={state} calls={calls} />
      <Button onPress={() => scroller?.scrollTo({ x: 99999 })}>
        Scroll to end
      </Button>
    </View>
  );
}

/** fits: content shorter than the viewport — the resting `none` state. */
function FitsCase() {
  const state = signal("-");
  const calls = signal(0);

  return (
    <View class="flex-col items-start gap-2 p-6">
      <StateReadout state={state} calls={calls} />
      <ScrollShadow
        testID="scroller"
        className="h-40 w-64"
        onLayout={boxProbe("root")}
        onVisibilityChange={(visibility) => {
          state.set(visibility);
          calls.update((count) => count + 1);
          probe("visibility")({ state: visibility, render: 0 });
        }}
      >
        Short content
      </ScrollShadow>
    </View>
  );
}

/**
 * controlled: `visibility="both"` pins a fixed fade — the detection callback
 * must never fire while `onScroll` still reaches the caller (M-002's
 * controlled half).
 */
function ControlledCase() {
  let scroller: ScrollRef | undefined;

  return (
    <View class="flex-col items-start gap-2 p-6">
      <ScrollShadow
        ref={(node) => {
          scroller = node;
        }}
        testID="scroller"
        className="h-40 w-64"
        visibility="both"
        onScroll={probe("scroll")}
        onLayout={boxProbe("root")}
        onVisibilityChange={(visibility) =>
          probe("visibility")({ state: visibility, render: 0 })
        }
      >
        {tallRows()}
      </ScrollShadow>
      <Button onPress={() => scroller?.scrollTo({ y: 200 })}>Scroll</Button>
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * A-005 cases table + scope
 * -----------------------------------------------------------------------------------------------*/

const cases: Record<string, Component> = {
  default: DefaultCase,
  horizontal: HorizontalCase,
  fits: FitsCase,
  controlled: ControlledCase,
};

/**
 * `host.params.input` / `host.params.density` feed `EnvironmentScope`; an
 * absent param keeps the host-derived value, so a case opened without them
 * is the desktop-parity baseline. The `scopeEnv` probe reports what the
 * scope resolves, so the mobile assertions can prove the injection itself
 * took effect inside the mounted subtree.
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
      <View class="h-0 w-0">
        {(() => {
          probe("scopeEnv")({ input: createInput()(), density: createDensity()() });
          return null;
        })()}
      </View>
    </EnvironmentScope>
  );
}

function Fixture() {
  const name = String(host.params.case ?? "");
  const Case = cases[name];

  if (!Case) return <MaskCase />;

  // The host's own platform report plus the resolved default-environment
  // `input`: the desktop-pin assertion reads them — under the
  // `platform:"windows"` pin `desktop`/`idiom` are desktop and `input`
  // resolves `pointer` on both targets, while the unpinned headless engine
  // would report the phone host.
  probe("env")({
    os: platform.os,
    desktop: platform.desktop,
    idiom: platform.idiom,
    input: createInput()(),
  });

  return (
    <View class="flex-1 items-start bg-background">
      <ScopedMobile>
        <Case />
      </ScopedMobile>
    </View>
  );
}

mount(Fixture);
