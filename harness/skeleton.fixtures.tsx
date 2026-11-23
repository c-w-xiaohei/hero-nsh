import { effect, host, mount, platform, Text, View } from "nsh";
import type { Component, JSX } from "nsh";
import { createInput, EnvironmentScope, Skeleton, SkeletonGroup, SkeletonGroupContext } from "@heroui/react";
import type { SkeletonRootAnimation } from "@heroui/react";
import { probe } from "@scenario/probe";

/*
 * NSH-only fixture for the e-parts Skeleton / SkeletonGroup mechanism unit
 * (sheet A-016: this fixture; adapt-sheets/e-parts.md §2 A-010…A-012, §4 M-019…M-026).
 *
 * `host.params.case` picks the shape:
 *
 *   single   One `Skeleton` (or `Skeleton.Root`) with `Text` content,
 *            `testID="skel"` and a fixed 120×20 box — the shimmer overlay
 *            (`testID="skeleton-shimmer"`) is the observable half of the
 *            resolved `animationType`/`animation`/`isLoading` gate; the
 *            `anim-probe` reports `{shimmer: count}` on demand. Params:
 *            `loading` ("0" → isLoading false; absent → upstream default),
 *            `variant`/`atype` (animationType), `anim` ("off" →
 *            animation="disabled", "shimmer-off" → {shimmer:"disabled"},
 *            "shimmer-fast" → {shimmer:{duration:500}}).
 *   flip     Two sibling skeletons under `If`/`Else` on a `flip` signal —
 *            the remount path stands in for a reactive `isLoading` prop
 *            (NSH props evaluate once at mount; the placeholder/children
 *            swap is still the component's own gate). Params: `flip`="0|1".
 *   group    A `SkeletonGroup` with three `SkeletonGroup.Item`s, a
 *            `GroupCtxProbe` that reports the context's verbatim members
 *            (`isLoading`/`animationType`/`variant`/`animation`), and plain
 *            content under `isSkeletonOnly` gating. Params: `loading`
 *            ("0" → false), `only`="1" (isSkeletonOnly), `variant`, `anim`
 *            (group `animation`), `itemloading` ("1" → the second item
 *            overrides with isLoading), `itemvariant` (the second item's
 *            animationType override).
 *
 * `host.params.scope` picks the `input` override ("" = host default,
 * "touch" = `input="touch"`), same convention as `pressable.fixtures.tsx`;
 * `host.params.density` feeds `EnvironmentScope.density` ("compact" /
 * "default", absent = host-derived), the `ScopedMobile` convention of
 * `kbd.fixtures.tsx` — the adapt unit adds it for M-006's density-invariant
 * bounds compare (adapt-sheets/skeleton.md A-010). It sits next to
 * harness/nsh.json on purpose: NSH takes the entry's own directory as the
 * app root, so an entry under harness/tests/... finds no nsh.json and loses
 * the `@heroui/react` alias and the theme.
 */

type LayoutEvent = {
  bounds: {
    origin: { x: number; y: number };
    size: { width: number; height: number };
  };
};

/**
 * A full bounds box per skeleton root (`layout` probe): M-001 pins the
 * caller-supplied 120×20 box and M-005/M-006 diff the set across
 * environments (`kbd.fixtures.tsx` convention).
 */
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

type Scope = "" | "touch" | "pointer";

function Scoped(props: { children?: JSX.Element }) {
  const scope = String(host.params.scope ?? "") as Scope;
  const density = String(host.params.density ?? "");

  return (
    <EnvironmentScope
      input={scope === "touch" || scope === "pointer" ? scope : undefined}
      density={density === "compact" || density === "default" ? density : undefined}
    >
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

function Btn(props: { id: string; onPress: () => void }) {
  return (
    <View testID={props.id} role="button" onPress={props.onPress} class="p-2">
      <Text>{props.id}</Text>
    </View>
  );
}

/** `anim` param → the root `animation` prop. */
function animParam(): SkeletonRootAnimation | undefined {
  switch (String(host.params.anim ?? "")) {
    case "off":
      return "disabled";
    case "shimmer-off":
      return { shimmer: "disabled" };
    case "shimmer-fast":
      return { shimmer: { duration: 500 } };
    default:
      return undefined;
  }
}

type AnimationType = "shimmer" | "pulse" | "none";

function typeParam(name: string): AnimationType | undefined {
  const value = String(host.params[name] ?? "");
  return value === "shimmer" || value === "pulse" || value === "none"
    ? value
    : undefined;
}

/* -------------------------------------------------------------------------------------------------
 * single case (M-019, M-021, M-022)
 * -----------------------------------------------------------------------------------------------*/

function SingleCase() {
  const loading = String(host.params.loading ?? "") === "0" ? false : undefined;

  return (
    <Skeleton
      testID="skel"
      isLoading={loading}
      variant={typeParam("variant")}
      animationType={typeParam("atype")}
      animation={animParam()}
      onLayout={layoutProbe("skel")}
      className="rounded-md"
      style={{ width: 120, height: 20 }}
    >
      <Text>Loaded content</Text>
    </Skeleton>
  );
}

/* -------------------------------------------------------------------------------------------------
 * flip case (M-020): remount stands in for a reactive isLoading prop
 * -----------------------------------------------------------------------------------------------*/

function FlipCase() {
  const flip = String(host.params.flip ?? "0") === "1";

  return (
    <>
      <If when={!flip}>
        <Skeleton
          testID="skel"
          onLayout={layoutProbe("skel")}
          className="rounded-md"
          style={{ width: 120, height: 20 }}
        >
          <Text>Loaded content</Text>
        </Skeleton>
      </If>
      <If when={flip}>
        <Skeleton
          testID="skel"
          isLoading={false}
          className="rounded-md"
          style={{ width: 120, height: 20 }}
        >
          <Text>Loaded content</Text>
        </Skeleton>
      </If>
    </>
  );
}

/* -------------------------------------------------------------------------------------------------
 * group case (M-023, M-024, M-025)
 * -----------------------------------------------------------------------------------------------*/

/** Reports the verbatim context members — the group's contract surface. */
function GroupCtxProbe() {
  const group = SkeletonGroupContext();
  const reportGroup = probe("group");

  effect(() => {
    const animation = group?.animation();
    reportGroup({
      isLoading: group?.isLoading() ?? null,
      animationType: group?.animationType() ?? null,
      variant: group?.variant() ?? null,
      animation:
        animation === undefined || animation === null
          ? null
          : JSON.parse(JSON.stringify(animation)),
    });
  });

  return null;
}

function GroupCase() {
  const loading = String(host.params.loading ?? "") === "0" ? false : undefined;
  const only = String(host.params.only ?? "") === "1";
  const itemLoading = String(host.params.itemloading ?? "") === "1";

  return (
    <SkeletonGroup
      testID="skel-group"
      isLoading={loading}
      isSkeletonOnly={only}
      variant={typeParam("variant")}
      animation={animParam()}
      className="flex flex-col gap-2"
    >
      <GroupCtxProbe />
      <SkeletonGroup.Item
        testID="skel-item-1"
        onLayout={layoutProbe("skel-item-1")}
        className="rounded-md"
        style={{ width: 120, height: 20 }}
      >
        <Text>First content</Text>
      </SkeletonGroup.Item>
      <SkeletonGroup.Item
        testID="skel-item-2"
        isLoading={itemLoading ? true : undefined}
        variant={typeParam("itemvariant")}
        onLayout={layoutProbe("skel-item-2")}
        className="rounded-md"
        style={{ width: 120, height: 20 }}
      >
        <Text>Second content</Text>
      </SkeletonGroup.Item>
      <SkeletonGroup.Item
        testID="skel-item-3"
        onLayout={layoutProbe("skel-item-3")}
        className="rounded-md"
        style={{ width: 120, height: 20 }}
      >
        <Text>Third content</Text>
      </SkeletonGroup.Item>
    </SkeletonGroup>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Cases table
 * -----------------------------------------------------------------------------------------------*/

const cases: Record<string, Component> = {
  single: SingleCase,
  flip: FlipCase,
  group: GroupCase,
};

function Fixture() {
  const name = String(host.params.case ?? "single");
  const Case = cases[name] ?? SingleCase;

  // The host's own platform report plus the resolved default-environment
  // `input`: M-007's desktop-pin assertion reads them — under the
  // `platform:"windows"` pin `desktop`/`idiom` are desktop and `input`
  // resolves `pointer` on both targets (headless reports os "windows", the
  // web target always reports os "web" in the desktop idiom), while the
  // unpinned headless engine would report the phone host.
  probe("env")({
    os: platform.os,
    desktop: platform.desktop,
    idiom: platform.idiom,
    input: createInput()(),
  });

  return (
    <Frame>
      <Scoped>
        <Case />
      </Scoped>
    </Frame>
  );
}

mount(Fixture);
