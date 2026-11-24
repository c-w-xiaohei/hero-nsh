import { effect, host, mount, signal, Text, View } from "nsh";
import type { Component, JSX, PressEvent } from "nsh";
import {
  Button,
  createOverlayTrigger,
  EnvironmentScope,
  Form,
  HoverTriggerContext,
  OverlayTriggerContext,
  PressableFeedbackContext,
} from "@heroui/react";
import type {
  OverlayTriggerContextValue,
  HoverTriggerContextValue,
  PressableFeedbackContextValue,
} from "@heroui/react";
import { probe } from "@scenario/probe";

/*
 * NSH-only fixture for the button adapt unit
 * (adapt-sheets/button.md A-009: this fixture; §4 M-001…M-012).
 *
 * `host.params.case` picks the shape:
 *
 *   basic     One `Button` (testID `btn`) with a `ButtonCtxProbe` inside and a
 *             `ctx-sample` sibling. Params: `size` (sm/md/lg), `icon` ("1" =
 *             isIconOnly), `variant`, `preset` (feedbackVariant; "auto" is the
 *             default), `anim` (animation tier: true/disabled/false/
 *             disable-all/object/state-off/state-all/scale-off/scale-cfg),
 *             `animatedstyle` ("off" = isAnimatedStyleActive={false}),
 *             `pending`="1", `disabled`="1". Probes: `events` (down/up/press
 *             sequences), `press-change` (onPressChange, its own probe so
 *             `events` keeps the down/up/press order clean), `ctx-pressed` /
 *             `ctx-state` / `ctx-env` / `ctx-origin` / `ctx-channels` (the
 *             seam channels — the only observable surface of hitSlop and the
 *             AnimatedValues, sheet §6), `layout` (root bounds — the A-001
 *             touch-size half).
 *   form      `<Form onSubmit>` + `Button type="submit"` (testID `submit`),
 *             the `form.submit` probe (M-009).
 *   overlay   `createOverlayTrigger` + `OverlayTriggerContext.Provider`
 *             wrapping a `Button` (testID `trigger`): `host.params.channel`
 *             "custom" supplies `triggerPress`/`triggerLongPress`, "toggle"
 *             supplies neither. Probes: `events` (the user callback order) and
 *             `overlay` (the context calls the button made).
 *   hover     `HoverTriggerContext.Provider` wrapping a `Button` (testID
 *             `trigger`): hover/press/focus calls reported into `events`.
 *   matrix    Every `feedbackVariant` × `animation` mount in one case so M-006
 *             can assert "all values mount" in a single open.
 *
 * `host.params.scope` picks the `EnvironmentScope` wrapper ("" = host
 * default, "touch" = `input="touch"`), same convention as
 * `pressable.fixtures.tsx` / `list-group.fixtures.tsx`. The test-only
 * `host.params.testInput` ("pointer"/"touch") injects an outer
 * `EnvironmentScope` input — absent params keep the host-derived
 * environment.
 *
 * It sits directly in harness/: the entry's own directory is the app root —
 * a file under harness/tests/... would lose the `@heroui/react` alias and
 * the theme.
 */

type Scope = "" | "touch";

function Scoped(props: { children?: JSX.Element }) {
  // Test-harness environment params (only the mobile tests set them —
  // absent keeps the host-derived default): `scope="touch"` is the inner
  // override, `testInput` ("pointer"/"touch") injects the scope so the
  // pointer baseline is host-independent (the inner `scope` still wins).
  // One provider only: `props.children` is placed inside it directly —
  // pre-building a fragment first would mount the children under this
  // component's own creation scope instead of the provider.
  const input =
    String(host.params.scope ?? "") === "touch"
      ? "touch"
      : ((v) => (v === "pointer" || v === "touch" ? v : undefined))(
          String(host.params.testInput ?? ""),
        );

  return input !== undefined ? (
    <EnvironmentScope input={input}>{props.children}</EnvironmentScope>
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

function Btn(props: { id: string; onPress: () => void }) {
  return (
    <View testID={props.id} role="button" onPress={props.onPress} class="p-2">
      <Text>{props.id}</Text>
    </View>
  );
}

/* The mounted button's context value, kept for `ctx-sample`. */
let btnCtx: PressableFeedbackContextValue | null = null;

/**
 * Reads `PressableFeedbackContext` inside the Button and reports the seam's
 * state — the same probe shape `list-group.fixtures.tsx` runs:
 * `ctx-pressed` on every `isPressed` edge, delayed `ctx-state` samples that
 * land mid-hold under `longPress`, `ctx-env`/`ctx-origin` as the reactive
 * gate and origin reports.
 */
function ButtonCtxProbe(props: { quiet?: boolean }) {
  const ctx = PressableFeedbackContext();
  const reportPressed = probe("ctx-pressed");
  const reportState = probe("ctx-state");
  const reportEnv = probe("ctx-env");
  const reportOrigin = probe("ctx-origin");

  effect(() => {
    btnCtx = ctx;
  });

  effect(() => {
    reportEnv({
      enabled: ctx.enabled(),
      hitSlop: ctx.hitSlop() ?? null,
      bounds: ctx.bounds(),
      allDisabled: ctx.isAllAnimationsDisabled(),
    });
  });

  effect(() => {
    reportOrigin(ctx.pressOrigin());
  });

  const sample = () => {
    void ctx.pressed.getValue().then((pressed) => {
      void ctx.scale.getValue().then((scale) => {
        void ctx.highlightOpacity.getValue().then((highlight) => {
          void ctx.rippleProgress.getValue().then((ripple) => {
            reportState({
              pressed,
              scale,
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
    });
  };

  effect(() => {
    const pressed = ctx.isPressed();
    reportPressed(pressed);
    setTimeout(sample, 600);
    setTimeout(sample, 1500);
  });

  return props.quiet === true ? null : (
    <Text>{ctx.isPressed() ? "btn-pressed" : "btn-idle"}</Text>
  );
}

/* -------------------------------------------------------------------------------------------------
 * basic case (M-001 … M-008, M-010)
 * -----------------------------------------------------------------------------------------------*/

function BasicCase() {
  const reportEvent = probe("events");
  const reportChange = probe("press-change");
  const reportLayout = probe("layout");
  const reportChannels = probe("ctx-channels");

  const size = String(host.params.size ?? "");
  const icon = String(host.params.icon ?? "") === "1";
  const variant = String(host.params.variant ?? "");
  const preset = String(host.params.preset ?? "");
  const useRipple = signal(false);
  const anim = String(host.params.anim ?? "");
  const pending = String(host.params.pending ?? "") === "1";
  const disabled = String(host.params.disabled ?? "") === "1";
  const animatedStyle = String(host.params.animatedstyle ?? "") === "off";

  const animation = (() => {
    switch (anim) {
      case "":
        return undefined;
      case "true":
        return true;
      case "false":
        return false;
      case "disabled":
        return "disabled" as const;
      case "disable-all":
        return "disable-all" as const;
      case "object":
        return { scale: { value: 0.9 } };
      case "state-off":
        return { state: "disabled" as const };
      case "state-all":
        return { state: "disable-all" as const };
      case "scale-off":
        return { scale: false };
      case "scale-cfg":
        return { scale: { value: 0.9, ignoreScaleCoefficient: true } };
      default:
        return undefined;
    }
  })();

  const onEvent =
    (kind: string) =>
    (e: PressEvent): void => {
      reportEvent({ kind, x: e.position.x, y: e.position.y });
    };

  const sampleChannels = () => {
    const c = btnCtx;
    if (c === null) {
      return;
    }
    void c.pressed.getValue().then((pressed) => {
      void c.scale.getValue().then((scale) => {
        void c.highlightOpacity.getValue().then((highlight) => {
          void c.rippleProgress.getValue().then((ripple) => {
            reportChannels({
              pressed,
              scale,
              highlight,
              ripple,
              isPressed: c.isPressed(),
              origin: c.pressOrigin(),
              enabled: c.enabled(),
              allDisabled: c.isAllAnimationsDisabled(),
            });
          });
        });
      });
    });
  };

  return (
    <>
      <Button
        testID="btn"
        size={size === "" ? undefined : (size as "sm" | "md" | "lg")}
        isIconOnly={icon}
        variant={
          variant === ""
            ? undefined
            : (variant as
                | "primary"
                | "secondary"
                | "tertiary"
                | "ghost"
                | "outline"
                | "danger"
                | "danger-soft")
        }
        feedbackVariant={
          useRipple() ? "scale-ripple" : preset === ""
            ? undefined
            : (preset as
                | "auto"
                | "scale-highlight"
                | "scale-ripple"
                | "scale"
                | "none")
        }
        animation={animation}
        isAnimatedStyleActive={animatedStyle ? false : undefined}
        isPending={pending}
        isDisabled={disabled}
        // 2500 ms: ButtonCtxProbe samples the channels 600 ms into the hold;
        // web runs several times slower than headless, so the hold must stay
        // comfortably wider than the sample delay plus timer drift.
        delayLongPress={2500}
        onPress={() => reportEvent({ kind: "press" })}
        onPressDown={onEvent("down")}
        onPressUp={onEvent("up")}
        onPressChange={(isPressed) => reportChange(isPressed)}
        onLayout={(e) =>
          reportLayout({
            width: e.bounds.size.width,
            height: e.bounds.size.height,
          })
        }
      >
        <ButtonCtxProbe quiet={icon} />
        {icon ? <Text>i</Text> : <Text>Save</Text>}
      </Button>
      <Btn id="ctx-sample" onPress={sampleChannels} />
      {host.params.switchPreset === "1" ? (
        <Btn id="switch-preset" onPress={() => useRipple.set(true)} />
      ) : null}
    </>
  );
}

/* -------------------------------------------------------------------------------------------------
 * form case (M-009)
 * -----------------------------------------------------------------------------------------------*/

function FormCase() {
  const submitted = probe("form.submit");
  const reportEvent = probe("events");

  return (
    <Form onSubmit={(event) => submitted(event)}>
      <Button
        testID="submit"
        type="submit"
        onPress={() => reportEvent({ kind: "press" })}
      >
        <Text>Save</Text>
      </Button>
    </Form>
  );
}

/* -------------------------------------------------------------------------------------------------
 * overlay case (M-009): `OverlayTriggerContext` — a `Button` written inside
 * an overlay root becomes its trigger. `channel="custom"` supplies the
 * `triggerPress`/`triggerLongPress` pair (Dropdown's `longPress` mode), while
 * `channel="toggle"` supplies neither, so a press must call `toggle()`.
 * -----------------------------------------------------------------------------------------------*/

function OverlayCase() {
  const reportEvent = probe("events");
  const reportOverlay = probe("overlay");
  const channel = String(host.params.channel ?? "custom");

  const trigger = createOverlayTrigger();

  const value: OverlayTriggerContextValue = {
    ...trigger.context,
    ...(channel === "custom"
      ? {
          triggerPress: (source: "keyboard" | "pointer") => {
            reportOverlay({ kind: "triggerPress", source });
          },
          triggerLongPress: () => {
            reportOverlay({ kind: "triggerLongPress" });
          },
        }
      : {}),
  };

  return (
    <OverlayTriggerContext.Provider value={value}>
      <Button
        testID="trigger"
        onPress={() => reportEvent({ kind: "press" })}
        onLongPress={() => reportEvent({ kind: "longPress" })}
      >
        <Text>Trigger</Text>
      </Button>
    </OverlayTriggerContext.Provider>
  );
}

/* -------------------------------------------------------------------------------------------------
 * hover case (M-009): `HoverTriggerContext` — a `Button` inside a tooltip
 * root consumes hover/press/focus calls. Every call lands in `events` so the
 * test can assert the order a press and a hover produce.
 * -----------------------------------------------------------------------------------------------*/

function HoverCase() {
  const reportEvent = probe("events");

  const hover: HoverTriggerContextValue = {
    hoverStart: () => reportEvent({ kind: "hoverStart" }),
    hoverEnd: () => reportEvent({ kind: "hoverEnd" }),
    focusStart: () => reportEvent({ kind: "focusStart" }),
    focusEnd: () => reportEvent({ kind: "focusEnd" }),
    pressStart: () => reportEvent({ kind: "pressStart" }),
    press: () => reportEvent({ kind: "press" }),
    registerTrigger: () => () => undefined,
  };

  return (
    <HoverTriggerContext.Provider value={hover}>
      <Button
        testID="trigger"
        onPress={() => reportEvent({ kind: "userPress" })}
        onPressDown={() => reportEvent({ kind: "down" })}
        onPressUp={() => reportEvent({ kind: "up" })}
        onMouseEnter={() => reportEvent({ kind: "enter" })}
        onMouseLeave={() => reportEvent({ kind: "leave" })}
        onFocus={() => reportEvent({ kind: "focus" })}
        onBlur={() => reportEvent({ kind: "blur" })}
      >
        <Text>Trigger</Text>
      </Button>
    </HoverTriggerContext.Provider>
  );
}

/* -------------------------------------------------------------------------------------------------
 * matrix case (M-006): every `feedbackVariant` × `animation` combination
 * mounts in one app so the "all values mount" half of the assertion needs
 * only one open. Each cell carries a `ButtonCtxProbe` so the touch press
 * channels can be sampled per preset.
 * -----------------------------------------------------------------------------------------------*/

const MATRIX_PRESETS = [
  "auto",
  "scale-highlight",
  "scale-ripple",
  "scale",
  "none",
] as const;

const MATRIX_ANIMS = [
  "",
  "true",
  "disabled",
  "disable-all",
  "object",
  "state-off",
  "state-all",
] as const;

function matrixAnimation(anim: string) {
  switch (anim) {
    case "true":
      return true;
    case "disabled":
      return "disabled" as const;
    case "disable-all":
      return "disable-all" as const;
    case "object":
      return { scale: { value: 0.9 } };
    case "state-off":
      return { state: "disabled" as const };
    case "state-all":
      return { state: "disable-all" as const };
    default:
      return undefined;
  }
}

function MatrixCase() {
  return (
    <>
      {MATRIX_PRESETS.map((preset) =>
        MATRIX_ANIMS.map((anim) => (
          <Button
            testID={`m-${preset}-${anim || "def"}`}
            feedbackVariant={preset}
            animation={matrixAnimation(anim)}
          >
            <ButtonCtxProbe quiet />
            <Text>{`${preset}/${anim || "def"}`}</Text>
          </Button>
        )),
      )}
    </>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Cases table
 * -----------------------------------------------------------------------------------------------*/

const cases: Record<string, Component> = {
  basic: BasicCase,
  form: FormCase,
  overlay: OverlayCase,
  hover: HoverCase,
  matrix: MatrixCase,
};

function Fixture() {
  const name = String(host.params.case ?? "basic");
  const Case = cases[name] ?? BasicCase;

  return (
    <Frame>
      <Scoped>
        <Case />
      </Scoped>
    </Frame>
  );
}

mount(Fixture);
