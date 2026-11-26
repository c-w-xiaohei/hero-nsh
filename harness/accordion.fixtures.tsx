import { effect, host, mount, Text, View } from "nsh";
import type { JSX } from "nsh";
import {
  Accordion,
  EnvironmentScope,
  PressableFeedback,
  PressableFeedbackContext,
} from "@heroui/react";
import type { PressableFeedbackContextValue } from "@heroui/react";
import { probe } from "@scenario/probe";

/*
 * NSH-only fixture for the Accordion unit (port sheet 4b).
 *
 * A shared scenario cannot carry the probes or the external state the cases
 * need, so every case below is selected with `host.params.case`:
 *
 *   default                 the HeroUI unit fixture: three FAQ items, the third
 *                           disabled; single expansion, group and item
 *                           expansion probes, focus probes (T-003, T-004,
 *                           T-005, T-006, T-007, T-008)
 *   multiple                the same with allowsMultipleExpanded (T-006)
 *   kobalte-plain           the Kobalte fixture: three items one / two / three,
 *                           nothing expanded, plus a focus station after the
 *                           accordion (T-022, T-023, T-025)
 *   kobalte-default         the same with defaultExpandedKeys={["one"]}
 *                           (T-016, T-017, T-026, T-027)
 *   kobalte-multiple        the same with allowsMultipleExpanded (T-028, T-031)
 *   kobalte-multiple-default
 *                           multiple, defaultExpandedKeys={["one"]} (T-029, T-030)
 *   kobalte-controlled      expandedKeys={["one"]} held from outside: the root
 *                           renders what the prop says and the press only
 *                           reports (T-018)
 *   panel-tooltip           one open item whose panel carries a host tooltip,
 *                           for the panel prop forwarding case (X-001)
 *   mobile                  one item wired for the seam assertions (M-001 …
 *                           M-010): `events` sequence probe, `expandedChange` /
 *                           `itemExpanded`, `layout` trigger-bounds probe,
 *                           `CtxProbe` reading `PressableFeedbackContext`, plus
 *                           a `ctx-sample` sibling button for on-demand channel
 *                           reads. host.params: `compact`="1" (a w-10 row, so
 *                           the flex-1 trigger measures under the 44 pt floor
 *                           on its width → non-empty hitSlop; `min-h-11`
 *                           already lifts the height to the target),
 *                           `disabled`/`pending`="1", `overlay`="highlight"
 *                           (compose `<PressableFeedback.Highlight/>` into
 *                           the trigger).
 *
 * `host.params.scope` picks the environment wrapper — "" = the host default,
 * "touch" = `EnvironmentScope input="touch"` — the same convention
 * `disclosure.fixtures.tsx` / `control-field.fixtures.tsx` use; every case
 * mounts inside it so both environment halves run the same scenario.
 *
 * The expansion callbacks are recorded because `nsh/test` cannot read aria
 * attributes: the group probe flattens the `Set` into an array (`JSON.stringify`
 * would turn a `Set` into `{}`), the item probe records the boolean. The focus
 * probes stand in for `document.activeElement`, which has no query. The `after`
 * station of `kobalte-plain` gives Tab somewhere to go once focus leaves the
 * last trigger, so the "focus is no longer on an item" step of T-022 is
 * observable instead of being an absent event.
 *
 * Everything here uses HeroUI's API; the extra stations are plain pressable
 * views, not part of the component.
 */

/* -------------------------------------------------------------------------------------------------
 * HeroUI unit fixture
 * -----------------------------------------------------------------------------------------------*/

function HeroItems() {
  return (
    <>
      <Accordion.Item id="faq-1" onExpandedChange={(isExpanded) => probe("itemExpanded")(isExpanded)}>
        <Accordion.Heading>
          <Accordion.Trigger onFocus={() => probe("focus")("faq-1")}>
            How do I place an order?
            <Accordion.Indicator />
          </Accordion.Trigger>
        </Accordion.Heading>
        <Accordion.Panel>
          <Accordion.Body>Browse our products and proceed to checkout.</Accordion.Body>
        </Accordion.Panel>
      </Accordion.Item>
      <Accordion.Item id="faq-2" onExpandedChange={(isExpanded) => probe("itemExpanded")(isExpanded)}>
        <Accordion.Heading>
          <Accordion.Trigger onFocus={() => probe("focus")("faq-2")}>
            Can I modify my order?
            <Accordion.Indicator />
          </Accordion.Trigger>
        </Accordion.Heading>
        <Accordion.Panel>
          <Accordion.Body>Yes, before it ships.</Accordion.Body>
        </Accordion.Panel>
      </Accordion.Item>
      <Accordion.Item
        id="faq-3"
        isDisabled
        onExpandedChange={(isExpanded) => probe("itemExpanded")(isExpanded)}
      >
        <Accordion.Heading>
          <Accordion.Trigger onFocus={() => probe("focus")("faq-3")}>
            Disabled question
            <Accordion.Indicator />
          </Accordion.Trigger>
        </Accordion.Heading>
        <Accordion.Panel>
          <Accordion.Body>Never shown.</Accordion.Body>
        </Accordion.Panel>
      </Accordion.Item>
    </>
  );
}

function HeroFaq(props: { multiple?: boolean }) {
  return (
    <View class="w-96">
      <Accordion
        allowsMultipleExpanded={props.multiple}
        onExpandedChange={(keys) => probe("expandedChange")(Array.from(keys))}
      >
        <HeroItems />
      </Accordion>
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Panel tooltip fixture
 * -----------------------------------------------------------------------------------------------*/

function HeroPanelTooltip() {
  return (
    <View class="w-96">
      <Accordion defaultExpandedKeys={["faq-1"]}>
        <Accordion.Item id="faq-1">
          <Accordion.Heading>
            <Accordion.Trigger>
              How do I place an order?
              <Accordion.Indicator />
            </Accordion.Trigger>
          </Accordion.Heading>
          <Accordion.Panel testID="panel-one" tooltip="Panel hint">
            <Accordion.Body>Browse our products and proceed to checkout.</Accordion.Body>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Kobalte fixtures
 * -----------------------------------------------------------------------------------------------*/

function KobalteItems() {
  return (
    <>
      {["one", "two", "three"].map((value) => (
        <Accordion.Item
          id={value}
          onExpandedChange={(isExpanded) => probe("itemExpanded")(isExpanded)}
        >
          <Accordion.Heading>
            <Accordion.Trigger onFocus={() => probe("focus")(value)}>
              {`Trigger ${value}`}
              <Accordion.Indicator />
            </Accordion.Trigger>
          </Accordion.Heading>
          <Accordion.Panel>
            <Accordion.Body>{`Content ${value}`}</Accordion.Body>
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </>
  );
}

function KobalteAccordion(props: {
  multiple?: boolean;
  defaultExpandedKeys?: string[];
  expandedKeys?: string[];
  after?: boolean;
}) {
  return (
    <View class="w-80">
      <Accordion
        allowsMultipleExpanded={props.multiple}
        defaultExpandedKeys={props.defaultExpandedKeys}
        expandedKeys={props.expandedKeys}
        onExpandedChange={(keys) => probe("expandedChange")(Array.from(keys))}
      >
        <KobalteItems />
      </Accordion>
      {props.after ? (
        <View
          role="button"
          testID="after"
          onPress={() => undefined}
          onFocus={() => probe("focus")("after")}
        >
          <Text>After</Text>
        </View>
      ) : null}
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Scoped wrapper — every case mounts inside it
 * -----------------------------------------------------------------------------------------------*/

/* The default environment ("") is the desktop-parity half, `input="touch"`
 * the injected mobile half (sheet A-008). */
function Scoped(props: { children?: JSX.Element }) {
  const scope = String(host.params.scope ?? "");

  return scope === "touch" ? (
    <EnvironmentScope input="touch">{props.children}</EnvironmentScope>
  ) : (
    <>{props.children}</>
  );
}

/* -------------------------------------------------------------------------------------------------
 * mobile case — the press-feedback seam assertions (sheet §4 M-001…M-010)
 * -----------------------------------------------------------------------------------------------*/

/* The live `PressableFeedbackContext` the sibling `ctx-sample` button reads;
 * a sibling because pressing the probe must not perturb the trigger's press. */
let triggerCtx: PressableFeedbackContextValue | null = null;

/* Reads the seam context inside the trigger. `ctx-pressed` carries the gated
 * `isPressed` edge (silent under pointer — that silence IS the negative
 * assertion); `ctx-state` samples every channel on each edge, at +600 ms and
 * +1500 ms so a held press reports its settled end values; `ctx-env` reports
 * the mount-time gate and computed hitSlop (control-field's convention). */
function CtxProbe() {
  const ctx = PressableFeedbackContext();
  const reportPressed = probe("ctx-pressed");
  const reportState = probe("ctx-state");
  const reportEnv = probe("ctx-env");

  effect(() => {
    triggerCtx = ctx;
  });

  effect(() => {
    reportEnv({
      enabled: ctx.enabled(),
      hitSlop: ctx.hitSlop() ?? null,
    });
  });

  const sample = () => {
    void ctx.pressed.getValue().then((pressed) => {
      void ctx.scale.getValue().then((scale) => {
        reportState({
          seamPressed: ctx.isPressed(),
          pressed,
          scale,
          origin: ctx.pressOrigin(),
          hitSlop: ctx.hitSlop() ?? null,
          bounds: ctx.bounds(),
          enabled: ctx.enabled(),
          allDisabled: ctx.isAllAnimationsDisabled(),
        });
      });
    });
  };

  effect(() => {
    const seam = ctx.isPressed();
    reportPressed({ seam });
    setTimeout(sample, 600);
    setTimeout(sample, 1500);
  });

  return <Text>{ctx.isPressed() ? "seam-pressed" : "seam-idle"}</Text>;
}

/* On-demand channel read for the negative half: a pointer press never raises
 * the seam's `isPressed` edge, so `ctx-state` alone cannot prove the channels
 * stayed at rest — `ctx-sample` samples them after the press instead. */
function sampleChannels() {
  const reportChannels = probe("ctx-channels");
  const c = triggerCtx;
  if (c === null) {
    return;
  }
  void c.pressed.getValue().then((pressed) => {
    void c.scale.getValue().then((scale) => {
      reportChannels({
        seamPressed: c.isPressed(),
        pressed,
        scale,
        origin: c.pressOrigin(),
        hitSlop: c.hitSlop() ?? null,
        enabled: c.enabled(),
      });
    });
  });
}

function MobileCase() {
  const compact = String(host.params.compact ?? "") === "1";
  const disabled = String(host.params.disabled ?? "") === "1";
  const pending = String(host.params.pending ?? "") === "1";
  const overlay = String(host.params.overlay ?? "");

  // The trigger's `flex-1` always fills the row and `min-h-11` lifts the
  // height to the 44 pt target under touch, so the only under-target state a
  // caller can produce is a row narrower than 44 pt — `compact` is that row.
  return (
    <View class={compact ? "w-10" : "w-96"}>
      <Accordion
        testID="accordion"
        onExpandedChange={(keys) => probe("expandedChange")(Array.from(keys))}
      >
        <Accordion.Item
          id="faq-1"
          onExpandedChange={(isExpanded) => probe("itemExpanded")(isExpanded)}
        >
          <Accordion.Heading>
            <Accordion.Trigger
              testID="trigger"
              isDisabled={disabled}
              isPending={pending}
              onPressDown={() => probe("events")("down")}
              onPressUp={() => probe("events")("up")}
              onPress={() => probe("events")("press")}
              onLayout={(e) =>
                probe("layout")({
                  name: "trigger",
                  width: e.bounds.size.width,
                  height: e.bounds.size.height,
                })
              }
            >
              How do I place an order?
              <Accordion.Indicator />
              {overlay === "highlight" ? (
                <PressableFeedback.Highlight testID="overlay" />
              ) : null}
              <CtxProbe />
            </Accordion.Trigger>
          </Accordion.Heading>
          <Accordion.Panel>
            <Accordion.Body>Browse our products and proceed to checkout.</Accordion.Body>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
      <View testID="ctx-sample" role="button" class="p-2" onPress={sampleChannels}>
        <Text>ctx-sample</Text>
      </View>
    </View>
  );
}

function Fixture() {
  const name = String(host.params.case ?? "default");

  if (name === "multiple") {
    return <HeroFaq multiple />;
  }

  if (name === "kobalte-default") {
    return <KobalteAccordion defaultExpandedKeys={["one"]} />;
  }

  if (name === "kobalte-multiple") {
    return <KobalteAccordion multiple />;
  }

  if (name === "kobalte-multiple-default") {
    return <KobalteAccordion multiple defaultExpandedKeys={["one"]} />;
  }

  if (name === "kobalte-controlled") {
    return <KobalteAccordion expandedKeys={["one"]} />;
  }

  if (name === "kobalte-plain") {
    return <KobalteAccordion after />;
  }

  if (name === "panel-tooltip") {
    return <HeroPanelTooltip />;
  }

  if (name === "mobile") {
    return <MobileCase />;
  }

  return <HeroFaq />;
}

function Root() {
  return (
    <Scoped>
      <Fixture />
    </Scoped>
  );
}

mount(Root);
