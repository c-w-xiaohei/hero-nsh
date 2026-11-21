import { effect, host, mount, Text, View } from "nsh";
import type { Component, JSX, PressEvent } from "nsh";
import {
  Button,
  EnvironmentScope,
  Form,
  PressableFeedbackContext,
} from "@heroui/react";
import type { PressableFeedbackContextValue } from "@heroui/react";
import { probe } from "@scenario/probe";

/*
 * NSH-only fixture for the button adapt unit
 * (adapt-sheets/button.md A-009: this fixture; §4 M-001…M-012).
 *
 * `host.params.case` picks the shape:
 *
 *   basic   One `Button` (testID `btn`) with a `ButtonCtxProbe` inside and a
 *           `ctx-sample` sibling. Params: `size` (sm/md/lg), `icon` ("1" =
 *           isIconOnly), `variant`, `preset` (feedbackVariant; "auto" is the
 *           default), `anim` (animation tier: true/disabled/false/
 *           disable-all/object/state-off/state-all/scale-off), `animatedstyle`
 *           ("off" = isAnimatedStyleActive={false}), `pending`="1",
 *           `disabled`="1". Probes: `events` (down/up/press sequences),
 *           `press-change` (onPressChange, its own probe so `events` keeps
 *           the down/up/press order clean), `ctx-pressed` / `ctx-state` /
 *           `ctx-env` / `ctx-origin` /
 *           `ctx-channels` (the seam channels — the only observable surface
 *           of hitSlop and the AnimatedValues, sheet §6), `layout` (root
 *           bounds — the A-001 touch-size half).
 *   form    `<Form onSubmit>` + `Button type="submit"` (testID `submit`),
 *           the `form.submit` probe (M-009).
 *
 * `host.params.scope` picks the `EnvironmentScope` wrapper ("" = host
 * default, "touch" = `input="touch"`), same convention as
 * `pressable.fixtures.tsx` / `list-group.fixtures.tsx`.
 *
 * It sits directly in harness/: the entry's own directory is the app root —
 * a file under harness/tests/... would lose the `@heroui/react` alias and
 * the theme.
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
          preset === ""
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
 * Cases table
 * -----------------------------------------------------------------------------------------------*/

const cases: Record<string, Component> = {
  basic: BasicCase,
  form: FormCase,
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
