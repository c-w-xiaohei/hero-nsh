import { effect, host, mount, platform, reduceMotion, Text, View } from "nsh";
import type { JSX } from "nsh";
import {
  EnvironmentScope,
  Pagination,
  PressableFeedbackContext,
} from "@heroui/react";
import type { PressableFeedbackContextValue } from "@heroui/react";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";

/*
 * NSH-only fixture for the Pagination mobile adaptation unit
 * (adapt-sheets/pagination.md §2 A-001…A-007, §4 M-001…M-011).
 *
 * `host.params.case` picks the tree:
 *
 *   press     (default) Previous + Link 1 (isActive) + Link 2 + Next, every
 *             pressable wired to the `events` sequence probe
 *             (down/up/change/press/click) and carrying a `SeamProbe` child —
 *             the carrier for M-001/M-002/M-003/M-005/M-006. `layout` reports
 *             each part's bounds for M-007's dual-environment comparison.
 *   sm        one `size="sm"` Link (visible side 32 < 44) → non-empty
 *             `hitSlop` under touch (M-002's small-target half).
 *   disabled  a `isDisabled` Previous and a `isPending` Link: the gate folds
 *             both into `enabled()` false, so the seam stays at rest and no
 *             press callbacks fire (M-005).
 *   overflow  Summary + 9 page links + two Ellipsis + Previous/Next: at a
 *             360 px viewport the `sm:flex-row` breakpoint stays off and the
 *             content row must sit below the summary; `layout` reports every
 *             box so M-008 can check order and non-overlap.
 *   sizes     one root per size with a single link each, `layout`-probed —
 *             M-009's `size-9`/`size-8`/`size-10` desktop-parity read.
 *
 * `host.params.scope` picks the environment ("" = host default, "touch" =
 * `EnvironmentScope input="touch"`), the same convention as
 * `pressable.fixtures.tsx` / `disclosure.fixtures.tsx`.
 *
 * Probe channels (`app.storage()`, PROBE_KEY):
 *
 *   events       `[name, phase]` for phase down/up/changeT/changeF/press/click
 *                — the press-chain order M-006 asserts under both
 *                environments.
 *   seam-sample  `{name, seamPressed, scale, hitSlop, enabled}` recorded after
 *                each `press` event — under pointer every channel rests (the
 *                negative half of M-001/M-003); under touch the values land
 *                after the seam unwound.
 *   seam-edge    `{name, seam}` per `feedback.isPressed` edge — silent under
 *                pointer, true→false roundtrip under touch (M-002).
 *   seam-hold    `{name, midHold, seamPressed, scale, hitSlop, enabled}`
 *                sampled +300 ms and +1100 ms after each `isPressed` edge —
 *                the mid-hold scale read and the settled return for M-003.
 *   seam-env     `{name, enabled, hitSlop}` on mount/layout change — the
 *                mount-time gate and computed slop (M-001/M-002/M-005).
 *   layout       `{name, x, y, width, height}` per part `onLayout` — M-007's
 *                bounds parity and M-008's ordering/non-overlap read.
 *   onPress/onClick  the caller-side callbacks on Link 2 (M-001).
 *   ellipsis     fires if an Ellipsis ever reports a press (M-011).
 */

type Scope = "" | "touch" | "pointer";

type LayoutEvent = {
  bounds: {
    origin: { x: number; y: number };
    size: { width: number; height: number };
  };
};

function Scoped(props: { children?: JSX.Element }) {
  const scope = String(host.params.scope ?? "") as Scope;

  return scope === "touch" || scope === "pointer" ? (
    <EnvironmentScope input={scope}>{props.children}</EnvironmentScope>
  ) : (
    <>{props.children}</>
  );
}

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

/** The live `PressableFeedbackContext` of each wired part, by fixture name. */
const seamContexts = new Map<string, PressableFeedbackContextValue>();

/* Reads the seam channels while a press is still held and after it settles:
 * the +300 ms sample lands inside `app.longPress`'s ~500 ms hold with the
 * 300 ms scale timing complete (M-003's mid-press read); the +1100 ms sample
 * lands after release plus the return animation — the settled read. Only a
 * real `isPressed` edge schedules them, so the pointer environment records
 * nothing here. */
function sampleHold(name: string, midHold: boolean) {
  const ctx = seamContexts.get(name);
  if (!ctx) {
    return;
  }
  const report = probe("seam-hold");
  void ctx.scale.getValue().then((scale) => {
    report({
      name,
      midHold,
      seamPressed: ctx.isPressed(),
      scale,
      hitSlop: ctx.hitSlop() ?? null,
      enabled: ctx.enabled(),
    });
  });
}

/* Sits inside a pressable part (the seam provider wraps its children), reads
 * `PressableFeedbackContext` and reports the gate/slop on mount plus every
 * `isPressed` edge. Under pointer the edge channel stays silent — that
 * silence is the negative assertion. */
function SeamProbe(props: { name: string }) {
  const ctx = PressableFeedbackContext();
  const reportEdge = probe("seam-edge");
  const reportEnv = probe("seam-env");

  effect(() => {
    seamContexts.set(props.name, ctx);
  });

  effect(() => {
    reportEnv({
      name: props.name,
      enabled: ctx.enabled(),
      hitSlop: ctx.hitSlop() ?? null,
    });
  });

  effect(() => {
    const seam = ctx.isPressed();
    reportEdge({ name: props.name, seam });
    if (seam) {
      setTimeout(() => sampleHold(props.name, true), 300);
      setTimeout(() => sampleHold(props.name, false), 1100);
    }
  });

  return null;
}

/* Reads the seam channels after the press chain finished: under pointer the
 * press fires but `isPressed`/`scale`/`hitSlop` rest (M-001, M-003); under
 * touch the sample lands post-release (M-002). Called from the `press` event
 * so storage order is press → seam-sample. */
function sampleSeam(name: string) {
  const ctx = seamContexts.get(name);
  if (!ctx) {
    return;
  }
  const report = probe("seam-sample");
  void ctx.scale.getValue().then((scale) => {
    report({
      name,
      seamPressed: ctx.isPressed(),
      scale,
      hitSlop: ctx.hitSlop() ?? null,
      enabled: ctx.enabled(),
    });
  });
}

/** The `events` sequence probes one part needs (M-006), plus the caller-side
 * press/click channels and the post-press seam sample. */
function partHandlers(name: string) {
  const events = probe("events");

  return {
    onPressDown: () => events(name, "down"),
    onPressUp: () => events(name, "up"),
    onPressChange: (pressed: boolean) => events(name, pressed ? "changeT" : "changeF"),
    onPress: () => {
      events(name, "press");
      probe("onPress")(name);
      sampleSeam(name);
    },
    onClick: () => {
      events(name, "click");
      probe("onClick")(name);
    },
    onLayout: layoutProbe(name),
  };
}

/** A page link with the full probe wiring and a seam-probe child. */
function LinkCase(props: { name: string; label: string; isActive?: boolean }) {
  return (
    <Pagination.Item>
      <Pagination.Link
        testID={props.name}
        isActive={props.isActive}
        aria-label={props.name}
        {...partHandlers(props.name)}
      >
        {props.label}
        <SeamProbe name={props.name} />
      </Pagination.Link>
    </Pagination.Item>
  );
}

function PressCase() {
  return (
    <Pagination aria-label="Pagination under test">
      <Pagination.Content>
        <Pagination.Item>
          <Pagination.Previous testID="prev" aria-label="prev" {...partHandlers("prev")}>
            <Text>Previous</Text>
            <SeamProbe name="prev" />
          </Pagination.Previous>
        </Pagination.Item>
        <LinkCase name="link-1" label="1" isActive />
        <LinkCase name="link-2" label="2" />
        <Pagination.Item>
          <Pagination.Ellipsis testID="ellipsis" onClick={() => probe("ellipsis")("click")} />
        </Pagination.Item>
        <Pagination.Item>
          <Pagination.Next testID="next" aria-label="next" {...partHandlers("next")}>
            <Text>Next</Text>
            <SeamProbe name="next" />
          </Pagination.Next>
        </Pagination.Item>
      </Pagination.Content>
    </Pagination>
  );
}

function SmCase() {
  return (
    <Pagination aria-label="Small pagination" size="sm">
      <Pagination.Content>
        <LinkCase name="link-sm" label="1" />
      </Pagination.Content>
    </Pagination>
  );
}

function DisabledCase() {
  return (
    <Pagination aria-label="Disabled pagination">
      <Pagination.Content>
        <Pagination.Item>
          <Pagination.Previous
            testID="prev-disabled"
            aria-label="prev-disabled"
            isDisabled
            {...partHandlers("prev-disabled")}
          >
            <Text>Previous</Text>
            <SeamProbe name="prev-disabled" />
          </Pagination.Previous>
        </Pagination.Item>
        <Pagination.Item>
          <Pagination.Link
            testID="link-pending"
            aria-label="link-pending"
            isPending
            {...partHandlers("link-pending")}
          >
            2
            <SeamProbe name="link-pending" />
          </Pagination.Link>
        </Pagination.Item>
      </Pagination.Content>
    </Pagination>
  );
}

/** Summary + a full-width page window + both Ellipsis parts: at a 360 px
 * viewport the row must stay vertical — the component never truncates
 * horizontally, the caller's window does (A-005). */
function OverflowCase() {
  const pages = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <Pagination aria-label="Overflow pagination">
      <Pagination.Summary onLayout={layoutProbe("summary")}>
        Page 4 of 9
      </Pagination.Summary>
      <Pagination.Content onLayout={layoutProbe("content")}>
        <Pagination.Item onLayout={layoutProbe("item-prev")}>
          <Pagination.Previous testID="prev" aria-label="prev" {...partHandlers("prev")}>
            <Text>Previous</Text>
          </Pagination.Previous>
        </Pagination.Item>
        <Pagination.Item onLayout={layoutProbe("item-ellipsis-start")}>
          <Pagination.Ellipsis testID="ellipsis-start" onLayout={layoutProbe("ellipsis-start")} />
        </Pagination.Item>
        {pages.map((page) => (
          <Pagination.Item onLayout={layoutProbe(`item-page-${page}`)}>
            <Pagination.Link
              testID={`page-${page}`}
              aria-label={`page-${page}`}
              isActive={page === 4}
              {...partHandlers(`page-${page}`)}
            >
              {page}
            </Pagination.Link>
          </Pagination.Item>
        ))}
        <Pagination.Item onLayout={layoutProbe("item-ellipsis-end")}>
          <Pagination.Ellipsis testID="ellipsis-end" onLayout={layoutProbe("ellipsis-end")} />
        </Pagination.Item>
        <Pagination.Item onLayout={layoutProbe("item-next")}>
          <Pagination.Next testID="next" aria-label="next" {...partHandlers("next")}>
            <Text>Next</Text>
          </Pagination.Next>
        </Pagination.Item>
      </Pagination.Content>
    </Pagination>
  );
}

function SizesCase() {
  return (
    <View class="flex-col items-start gap-4">
      <Pagination aria-label="sm pagination" size="sm">
        <Pagination.Content>
          <Pagination.Item>
            <Pagination.Link testID="size-sm" onLayout={layoutProbe("size-sm")}>1</Pagination.Link>
          </Pagination.Item>
        </Pagination.Content>
      </Pagination>
      <Pagination aria-label="md pagination">
        <Pagination.Content>
          <Pagination.Item>
            <Pagination.Link testID="size-md" onLayout={layoutProbe("size-md")}>11</Pagination.Link>
          </Pagination.Item>
        </Pagination.Content>
      </Pagination>
      <Pagination aria-label="lg pagination" size="lg">
        <Pagination.Content>
          <Pagination.Item>
            <Pagination.Link testID="size-lg" onLayout={layoutProbe("size-lg")}>21</Pagination.Link>
          </Pagination.Item>
        </Pagination.Content>
      </Pagination>
    </View>
  );
}

function Fixture() {
  const name = String(host.params.case ?? "press");

  // The host's own report (the button/pressable `env` convention):
  // `reduceMotion` tells tests whether the scale channel can move at
  // all — Android CI runs with `animator_duration_scale 0.0`, which the
  // host reports as reduce-motion and `createPressFeedback` honors by
  // pinning `scale` at 1 (press-feedback.ts:197). M-003's held-scale arm
  // asserts the right end value per host instead of assuming motion
  // everywhere — the same pattern button M-004 introduced (0a56376).
  probe("env")({ os: platform.os, reduceMotion: reduceMotion() });

  return (
    <Stage>
      <Scoped>
        {name === "sm" ? (
          <SmCase />
        ) : name === "disabled" ? (
          <DisabledCase />
        ) : name === "overflow" ? (
          <OverflowCase />
        ) : name === "sizes" ? (
          <SizesCase />
        ) : (
          <PressCase />
        )}
      </Scoped>
    </Stage>
  );
}

mount(Fixture);
