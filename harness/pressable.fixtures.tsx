import { effect, host, mount, Text, View } from "nsh";
import type { Component, JSX, PressEvent } from "nsh";
import {
  createInput,
  createPressFeedback,
  EnvironmentScope,
  PressableFeedback,
  PressableFeedbackContext,
} from "@heroui/react";
import type {
  PressableFeedbackRootAnimation,
  PressableFeedbackScaleAnimation,
} from "@heroui/react";
import { probe } from "@scenario/probe";

/*
 * NSH-only fixture for the pressable-feedback mechanism unit
 * (adapt-sheets/pressable-feedback.md §2 A-008, §4 M-001…M-017).
 *
 * `host.params.case` picks the shape:
 *
 *   factory    FactoryInner owns a `createPressFeedback` gated on
 *              `input() === "touch"` — the exact expression a B-tier
 *              component passes. Buttons inject synthetic pressDown/pressUp
 *              and layout bounds, and `sample`/`hold` report the channels
 *              (`pressed`/`scale` via `AnimatedValue.getValue()`, `isPressed`,
 *              `hitSlop`, `pressOrigin`, `bounds`) into `app.storage()`.
 *              `scale-probe`/`highlight-probe`/`slop-target` bind the returned
 *              channels to real view props so `viewStyle`/`hitSlop` see them.
 *   component  ComponentInner mounts `PressableFeedback` (root default
 *              `enabled = input()==="touch"`) with Highlight + Ripple + Scale
 *              parts and a `ContextProbe` child that reports the context's
 *              canonical state (`ctx-pressed`/`ctx-state`/`ctx-origin`).
 *              `events` records the root's own onPressDown/onPressUp/onPress.
 *   consume    ConsumeInner wires the factory into a plain pressable `View`
 *              exactly like a B-tier adapt unit would: `hitSlop` accessor to
 *              the view prop, `pressDown`/`pressUp` chained into the view's
 *              handlers, `layout` off `onLayout`.
 *
 * `host.params.scope` picks the `EnvironmentScope` wrapper ("" = host
 * default, "touch" = `input="touch"`), same convention as
 * `environment.fixtures.tsx`.
 *
 * `host.params.fanim` selects the factory's scale `animation`
 * (`PressableFeedbackScaleAnimation`): "" | "ignore-scale" | "disabled" |
 * "false" | "state-off". `host.params.anim` selects the root's
 * `PressableFeedbackRootAnimation`: "" | "true" | "disabled" | "false" |
 * "disable-all" | "object" | "state-off" | "state-all" | "ignore-scale".
 * `host.params.disabled`="1" sets `isDisabled`; `host.params.enabled`="off"
 * sets `enabled={false}`; `host.params.box`="tiny" shrinks the component root
 * to 24×24 so its computed hitSlop is non-zero.
 *
 * It sits next to harness/nsh.json on purpose: NSH takes the entry's own
 * directory as the app root, so an entry under harness/tests/... finds no
 * nsh.json and loses the `@heroui/react` alias and the theme.
 */

/* -------------------------------------------------------------------------------------------------
 * Shared bits
 * -----------------------------------------------------------------------------------------------*/

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
    <View class="flex-1 items-start gap-4 bg-background p-6">
      {props.children}
    </View>
  );
}

/** A press payload with a known position — the ripple's only origin source. */
function pressEvent(x = 10, y = 20): PressEvent {
  return {
    position: { x, y },
    pagePosition: { x: x + 40, y: y + 40 },
    modifiers: { control: false, alt: false, shift: false, platform: false },
    clickCount: 1,
  };
}

function Btn(props: { id: string; onPress: () => void }) {
  return (
    <View testID={props.id} role="button" onPress={props.onPress} class="p-2">
      <Text>{props.id}</Text>
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Factory case (M-001…M-004, M-009, M-015, M-016)
 * -----------------------------------------------------------------------------------------------*/

function factoryAnimation(): PressableFeedbackScaleAnimation | undefined {
  switch (String(host.params.fanim ?? "")) {
    case "ignore-scale":
      return { ignoreScaleCoefficient: true };
    case "disabled":
      return "disabled";
    case "false":
      return false;
    case "state-off":
      return { state: "disabled" };
    default:
      return undefined;
  }
}

function FactoryInner() {
  const input = createInput();
  const reportChange = probe("change");
  const reportSample = probe("sample");
  const reportOrigin = probe("origin");

  const fb = createPressFeedback({
    enabled: () => input() === "touch",
    animation: factoryAnimation(),
    onPressChange: (pressed) => reportChange(pressed),
  });

  const sample = () => {
    void Promise.all([fb.pressed.getValue(), fb.scale.getValue()]).then(
      ([pressed, scale]) => {
        reportSample({
          pressed,
          scale,
          isPressed: fb.isPressed(),
          hitSlop: fb.hitSlop() ?? null,
          origin: fb.pressOrigin(),
          bounds: fb.bounds(),
        });
      },
    );
  };

  const down = () => {
    fb.pressDown(pressEvent());
    reportOrigin(fb.pressOrigin());
  };

  const up = () => {
    fb.pressUp(pressEvent());
    reportOrigin(fb.pressOrigin());
  };

  // `hold` presses down and samples 600 ms later — past the 300 ms channel
  // timing — so the test reads the settled pressed-end values while the
  // canonical press is still held (the test presses `up` when it is done).
  const hold = () => {
    down();
    setTimeout(sample, 600);
  };

  const layout =
    (width: number, height: number) => () =>
      fb.layout({
        bounds: { origin: { x: 0, y: 0 }, size: { width, height } },
      });

  return (
    <View class="flex-col gap-2">
      <Text>{`isPressed=${fb.isPressed() ? "true" : "false"}`}</Text>
      <Text>{`hitSlop=${JSON.stringify(fb.hitSlop() ?? null)}`}</Text>
      <Btn id="down" onPress={down} />
      <Btn id="up" onPress={up} />
      <Btn id="hold" onPress={hold} />
      <Btn id="sample" onPress={sample} />
      <Btn id="layout-small" onPress={layout(24, 24)} />
      <Btn id="layout-mid" onPress={layout(150, 80)} />
      <Btn id="layout-wide" onPress={layout(320, 80)} />
      <Btn id="layout-huge" onPress={layout(600, 80)} />
      <View
        testID="scale-probe"
        style={{ width: 8, height: 8, opacity: fb.scale }}
      />
      <View
        testID="highlight-probe"
        style={{ width: 8, height: 8, opacity: fb.highlightOpacity }}
      />
      <View testID="slop-target" hitSlop={fb.hitSlop()} style={{ width: 4, height: 4 }} />
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Component case (M-005…M-008, M-010, M-011, M-012, M-013, M-014, M-017)
 * -----------------------------------------------------------------------------------------------*/

function rootAnimation(): PressableFeedbackRootAnimation | undefined {
  switch (String(host.params.anim ?? "")) {
    case "true":
      return true;
    case "disabled":
      return "disabled";
    case "false":
      return false;
    case "disable-all":
      return "disable-all";
    case "object":
      return { scale: { value: 0.97 } };
    case "state-off":
      return { state: "disabled" };
    case "state-all":
      return { state: "disable-all" };
    case "ignore-scale":
      return { scale: { ignoreScaleCoefficient: true } };
    default:
      return undefined;
  }
}

/**
 * Reads the context the root provides and reports its canonical state. The
 * `isPressed` effect fires on both edges of a press, so `ctx-pressed` records
 * the down→up roundtrip even though the test only regains control after the
 * press ended; the 600 ms delayed `ctx-state` lands mid-hold under
 * `longPress`/`dragAndHold` and reads the settled `pressed` channel plus the
 * computed `hitSlop`, `pressOrigin`, `bounds`, `enabled` and cascade flag.
 */
function ContextProbe() {
  const ctx = PressableFeedbackContext();
  const reportPressed = probe("ctx-pressed");
  const reportState = probe("ctx-state");
  const reportOrigin = probe("ctx-origin");
  const reportEnv = probe("ctx-env");

  // Mount-time and layout-time environment of the seam: `enabled` (the
  // effective gate), the cascade flag, the computed `hitSlop` and `bounds`.
  // These are the assertions `viewStyle` cannot make — it does not resolve
  // `AnimatedValue`-bound `opacity`, so the parts' animated channels are
  // only observable through the canonical `pressed`/`isPressed` state.
  effect(() => {
    reportEnv({
      enabled: ctx.enabled(),
      allDisabled: ctx.isAllAnimationsDisabled(),
      hitSlop: ctx.hitSlop() ?? null,
      bounds: ctx.bounds(),
    });
  });

  effect(() => {
    const pressed = ctx.isPressed();
    reportPressed(pressed);

    // The delayed sample lands mid-hold under `longPress`/`dragAndHold` and
    // after a finished press: it reads the canonical `pressed` channel plus
    // the part channels the root owns (`highlightOpacity`, `rippleProgress`)
    // — `viewStyle` reports 1 on any `AnimatedValue` binding, so
    // `getValue()` is the only way a test sees them.
    setTimeout(() => {
      void ctx.pressed.getValue().then((value) => {
        void ctx.highlightOpacity.getValue().then((highlight) => {
          void ctx.rippleProgress.getValue().then((ripple) => {
            reportState({
              pressed: value,
              highlight,
              ripple,
              isPressed: ctx.isPressed(),
              hitSlop: ctx.hitSlop() ?? null,
              origin: ctx.pressOrigin(),
              bounds: ctx.bounds(),
              enabled: ctx.enabled(),
              allDisabled: ctx.isAllAnimationsDisabled(),
            });
          });
        });
      });
    }, 600);
  });

  effect(() => {
    reportOrigin(ctx.pressOrigin());
  });

  return <Text>{ctx.isPressed() ? "pressed" : "idle"}</Text>;
}

function ComponentInner() {
  const reportEvent = probe("events");
  const disabled = String(host.params.disabled ?? "") === "1";
  const enabledOff = String(host.params.enabled ?? "") === "off";
  const tiny = String(host.params.box ?? "") === "tiny";

  const onEvent =
    (kind: string) =>
    (e: PressEvent): void => {
      reportEvent({ kind, x: e.position.x, y: e.position.y });
    };

  return (
    <PressableFeedback
      testID="root"
      style={{ width: tiny ? 24 : 120, height: tiny ? 24 : 64 }}
      isDisabled={disabled}
      enabled={enabledOff ? false : undefined}
      animation={rootAnimation()}
      // 2500 ms: the ContextProbe samples the channels 600 ms into the hold.
      // Web runs several times slower than headless, so the hold must stay
      // comfortably wider than the sample delay plus timer drift.
      delayLongPress={2500}
      onPressDown={onEvent("down")}
      onPressUp={onEvent("up")}
      onPress={() => reportEvent({ kind: "press" })}
      class="items-center justify-center"
    >
      <PressableFeedback.Highlight testID="highlight" />
      <PressableFeedback.Ripple testID="ripple" />
      <PressableFeedback.Scale
        testID="scale-part"
        class="flex-1 items-center justify-center"
      >
        <Text>pressable</Text>
      </PressableFeedback.Scale>
      <ContextProbe />
    </PressableFeedback>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Consume case — the B-tier wiring shape (M-001 desktop half, M-016)
 * -----------------------------------------------------------------------------------------------*/

function ConsumeInner() {
  const input = createInput();
  const reportChange = probe("change");
  const reportPress = probe("consume-press");

  const fb = createPressFeedback({
    enabled: () => input() === "touch",
    onPressChange: (pressed) => reportChange(pressed),
  });

  return (
    <View
      testID="consume-root"
      role="button"
      class="items-center justify-center p-2"
      style={{ width: 120, height: 48 }}
      hitSlop={fb.hitSlop()}
      onLayout={(e) => fb.layout(e)}
      onPressDown={(e) => fb.pressDown(e)}
      onPressUp={(e) => fb.pressUp(e)}
      onPress={() => reportPress("press")}
    >
      <View style={{ width: 8, height: 8, opacity: fb.scale }} />
      <Text>consume</Text>
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Cases table
 * -----------------------------------------------------------------------------------------------*/

const cases: Record<string, Component> = {
  factory: FactoryInner,
  component: ComponentInner,
  consume: ConsumeInner,
};

function Fixture() {
  const name = String(host.params.case ?? "factory");
  const Case = cases[name] ?? FactoryInner;

  return (
    <Frame>
      <Scoped>
        <Case />
      </Scoped>
    </Frame>
  );
}

mount(Fixture);
