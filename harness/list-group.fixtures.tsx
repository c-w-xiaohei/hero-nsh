import { effect, host, mount, Text, View } from "nsh";
import type { Component, JSX, PressEvent } from "nsh";
import {
  EnvironmentScope,
  ListGroup,
  ListGroupItemContext,
  SurfaceContext,
} from "@heroui/react";
import type { ListGroupItemContextValue } from "@heroui/react";
import { probe } from "@scenario/probe";

/*
 * NSH-only fixture for the e-parts ListGroup mechanism unit
 * (adapt-sheets/e-parts.md §2 A-006…A-009, §4 M-012…M-018).
 *
 * `host.params.case` picks the shape:
 *
 *   item   One `ListGroup` + one `ListGroup.Item` (pressable row) holding
 *          title/description texts and `ItemCtxProbe`. Probes: `events`
 *          ({down,up,press}), `press` (the onPress calls, bare), `layout`
 *          (item bounds — M-016's min-height half), `ctx-pressed` /
 *          `ctx-state` / `ctx-env` / `ctx-channels` (the seam channels — the
 *          ONLY observable surface of `hitSlop`/AnimatedValue feedback,
 *          sheet §5), `surface` (the Surface's resolved variant — M-016's
 *          pass-through half). `ctx-sample` is a plain sibling button for
 *          the same reason as the pressable fixture: a press under the
 *          closed gate never raises the seam's `isPressed` edge, so
 *          `ctx-state` never samples.
 *   parts  One item with every slot mounted — Prefix/Content/Title/
 *          Description — plus two suffix items: one with the default
 *          chevron (testID `icon-chevron-right`, layout reported through
 *          `iconProps.onLayout`) and one with custom `ItemSuffix` children
 *          (M-014/M-015).
 *
 * `host.params.scope` picks the `EnvironmentScope` wrapper ("" = host
 * default, "touch" = `input="touch"`), same convention as
 * `pressable.fixtures.tsx`. Other params: `variant` (Surface variant),
 * `disabled`="1", `box`="tiny" (24×24 item for a non-empty hitSlop),
 * `short`="1" (one-line content → item height under 44 pt), `iconsize`
 * (iconProps.size of the default chevron).
 *
 * It sits next to harness/nsh.json on purpose: NSH takes the entry's own
 * directory as the app root, so an entry under harness/tests/... finds no
 * nsh.json and loses the `@heroui/react` alias and the theme.
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

/* The mounted item's context value, kept for `ctx-sample`. */
let itemCtx: ListGroupItemContextValue | null = null;

/**
 * Reads `ListGroupItemContext` inside the item and reports the seam's state —
 * the same probe shape the pressable fixture runs: `ctx-pressed` on every
 * `isPressed` edge, delayed `ctx-state` samples that land mid-hold under
 * `longPress`, and a mount-time `ctx-env` read of the gate.
 */
function ItemCtxProbe(props: { quiet?: boolean }) {
  const ctx = ListGroupItemContext();
  const reportPressed = probe("ctx-pressed");
  const reportState = probe("ctx-state");
  const reportEnv = probe("ctx-env");

  effect(() => {
    itemCtx = ctx;
  });

  effect(() => {
    reportEnv({
      enabled: ctx.enabled(),
      hitSlop: ctx.hitSlop() ?? null,
      bounds: ctx.bounds(),
    });
  });

  const sample = () => {
    void ctx.pressed.getValue().then((pressed) => {
      void ctx.scale.getValue().then((scale) => {
        reportState({
          pressed,
          scale,
          isPressed: ctx.isPressed(),
          hitSlop: ctx.hitSlop() ?? null,
          origin: ctx.pressOrigin(),
          bounds: ctx.bounds(),
          enabled: ctx.enabled(),
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

  // `quiet` renders nothing: the tiny box must not measure this text.
  return props.quiet === true ? null : (
    <Text>{ctx.isPressed() ? "item-pressed" : "item-idle"}</Text>
  );
}

/** Reports the resolved Surface variant the root forwards (M-016). */
function SurfaceProbe() {
  const surface = SurfaceContext();
  const reportSurface = probe("surface");

  effect(() => {
    reportSurface({ variant: surface?.variant?.() ?? null });
  });

  return null;
}

/* -------------------------------------------------------------------------------------------------
 * item case (M-012, M-013, M-016, M-017)
 * -----------------------------------------------------------------------------------------------*/

function ItemCase() {
  const reportEvent = probe("events");
  const reportPress = probe("press");
  const reportLayout = probe("layout");
  const reportChannels = probe("ctx-channels");

  const variant = String(host.params.variant ?? "");
  const disabled = String(host.params.disabled ?? "") === "1";
  const tiny = String(host.params.box ?? "") === "tiny";
  const short = String(host.params.short ?? "") === "1";

  const onEvent =
    (kind: string) =>
    (e: PressEvent): void => {
      reportEvent({ kind, x: e.position.x, y: e.position.y });
    };

  const sampleChannels = () => {
    const c = itemCtx;
    if (c === null) {
      return;
    }
    void c.pressed.getValue().then((pressed) => {
      void c.scale.getValue().then((scale) => {
        reportChannels({
          pressed,
          scale,
          isPressed: c.isPressed(),
          origin: c.pressOrigin(),
          hitSlop: c.hitSlop() ?? null,
          enabled: c.enabled(),
        });
      });
    });
  };

  return (
    <>
      <ListGroup
        testID="lg-root"
        variant={variant === "" ? undefined : (variant as "default" | "secondary" | "tertiary" | "transparent")}
        className="w-72"
      >
        <SurfaceProbe />
        <ListGroup.Item
          testID="lg-item"
          isDisabled={disabled}
          style={tiny ? { width: 24, height: 24 } : undefined}
          // 2500 ms: the probe samples the channels 600 ms into the hold.
          delayLongPress={2500}
          onPress={() => {
            reportPress("press");
            reportEvent({ kind: "press" });
          }}
          onPressDown={onEvent("down")}
          onPressUp={onEvent("up")}
          onLayout={(e) =>
            reportLayout({
              name: "item",
              width: e.bounds.size.width,
              height: e.bounds.size.height,
            })
          }
        >
          {tiny ? undefined : (
            <ListGroup.ItemContent>
              <ListGroup.ItemTitle>Wi-Fi</ListGroup.ItemTitle>
              {short ? undefined : (
                <ListGroup.ItemDescription>Connected</ListGroup.ItemDescription>
              )}
            </ListGroup.ItemContent>
          )}
          <ItemCtxProbe quiet={tiny} />
        </ListGroup.Item>
      </ListGroup>
      <Btn id="ctx-sample" onPress={sampleChannels} />
    </>
  );
}

/* -------------------------------------------------------------------------------------------------
 * parts case (M-014, M-015)
 * -----------------------------------------------------------------------------------------------*/

function PartsCase() {
  const reportLayout = probe("layout");
  const iconSize = Number(host.params.iconsize ?? "16");

  return (
    <ListGroup className="w-72">
      <ListGroup.Item>
        <ListGroup.ItemPrefix>
          <Text testID="prefix-dot">●</Text>
        </ListGroup.ItemPrefix>
        <ListGroup.ItemContent>
          <ListGroup.ItemTitle>Wi-Fi</ListGroup.ItemTitle>
          <ListGroup.ItemDescription>Connected to Office</ListGroup.ItemDescription>
        </ListGroup.ItemContent>
        <ListGroup.ItemSuffix
          testID="suffix-default"
          iconProps={{
            size: iconSize,
            color: "#123456",
            onLayout: (e) =>
              reportLayout({
                name: "chevron",
                width: e.bounds.size.width,
                height: e.bounds.size.height,
              }),
          }}
        />
      </ListGroup.Item>
      <ListGroup.Item>
        <ListGroup.ItemContent>
          <ListGroup.ItemTitle>Bluetooth</ListGroup.ItemTitle>
        </ListGroup.ItemContent>
        <ListGroup.ItemSuffix testID="suffix-custom">
          <Text>GO</Text>
        </ListGroup.ItemSuffix>
      </ListGroup.Item>
    </ListGroup>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Cases table
 * -----------------------------------------------------------------------------------------------*/

const cases: Record<string, Component> = {
  item: ItemCase,
  parts: PartsCase,
};

function Fixture() {
  const name = String(host.params.case ?? "item");
  const Case = cases[name] ?? ItemCase;

  return (
    <Frame>
      <Scoped>
        <Case />
      </Scoped>
    </Frame>
  );
}

mount(Fixture);
