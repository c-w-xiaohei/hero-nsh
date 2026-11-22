import { effect, host, mount, Text, View } from "nsh";
import type { JSX } from "nsh";
import {
  Calendar,
  EnvironmentScope,
} from "@heroui/react";
import type { PressableFeedbackContextValue } from "@heroui/react";
import { PressableFeedbackContext } from "@heroui/react";
import { parseDate } from "@internationalized/date";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";

/*
 * NSH-only CalendarYearPicker mobile fixture (adapt sheet §2 A-008). The year
 * picker has no root of its own — the mobile case mounts a full Calendar
 * (min 2020-01-01, max 2030-12-31, 2026-08-15 selected, the scenario's
 * numbers) so `YearPickerContext` and the open state come from the real
 * owner.
 *
 * host.params.case:
 *   mobile   the seam assertions (M-001 … M-010): `events` sequence probe on
 *            the trigger, `onYearPickerOpenChange` probe on the root,
 *            `layout` bounds probes on trigger + the 2027 cell, a `CtxProbe`
 *            inside the trigger and a `CellCtxProbe` inside the 2027 cell
 *            each reading `PressableFeedbackContext`, plus a `ctx-sample`
 *            sibling button for on-demand channel reads. host.params:
 *            `compact`="1" (24×24 trigger → non-empty hitSlop),
 *            `disabled`="1" (`isDisabled` on the trigger).
 *
 * host.params.scope picks the environment wrapper — "" = the host default,
 * "touch" = `EnvironmentScope input="touch"` — the same convention
 * disclosure.fixtures.tsx / control-field.fixtures.tsx use; the mobile case
 * mounts inside it so both environment halves run the same scenario. Under
 * `open({platform:"ios"})` with no scope the host itself derives
 * input=touch (M-009).
 */

/* Wraps every case: the default environment ("") is the desktop-parity half,
 * `input="touch"` the injected mobile half. */
function Scoped(props: { children?: JSX.Element }) {
  const scope = String(host.params.scope ?? "");

  return scope === "touch" ? (
    <EnvironmentScope input="touch">{props.children}</EnvironmentScope>
  ) : (
    <>{props.children}</>
  );
}

const MIN_VALUE = parseDate("2020-01-01");
const MAX_VALUE = parseDate("2030-12-31");
const DEFAULT_VALUE = parseDate("2026-08-15");

/* The live `PressableFeedbackContext` the sibling `ctx-sample` button reads;
 * a sibling because pressing the probe must not perturb the press under
 * test. `trigger` + `cell` channels are sampled together — a press on the
 * 2027 cell is the cell seam's edge; the trigger seam stays idle. */
const liveCtxs: { trigger: PressableFeedbackContextValue | null; cell: PressableFeedbackContextValue | null } = {
  trigger: null,
  cell: null,
};

/* Reads the seam context inside a pressable part. `ctx-pressed` / probe
 * prefix carries the gated `isPressed` edge (silent under pointer — that
 * silence IS the negative assertion); `ctx-state` samples every channel on
 * each edge, at +600 ms and +1500 ms so a held press reports its settled
 * end values; `ctx-env` reports the mount-time gate and computed hitSlop
 * (disclosure/control-field convention). */
function CtxProbe(props: { slot: "trigger" | "cell" }) {
  const ctx = PressableFeedbackContext();
  const prefix = props.slot === "cell" ? "cell-ctx" : "ctx";
  const reportPressed = probe(`${prefix}-pressed`);
  const reportState = probe(`${prefix}-state`);
  const reportEnv = probe(`${prefix}-env`);

  effect(() => {
    liveCtxs[props.slot] = ctx;
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

  return <Text>{ctx.isPressed() ? `${prefix}-pressed` : `${prefix}-idle`}</Text>;
}

/* On-demand channel read for the negative half: a pointer press never raises
 * the seam's `isPressed` edge, so `ctx-state` alone cannot prove the channels
 * stayed at rest — `ctx-sample` samples them after the press instead. */
function sampleChannels() {
  const reportChannels = probe("ctx-channels");
  const c = liveCtxs.trigger;
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

  return (
    <Stage>
      <Calendar
        aria-label="Event date"
        defaultValue={DEFAULT_VALUE}
        maxValue={MAX_VALUE}
        minValue={MIN_VALUE}
        onYearPickerOpenChange={(open) => probe("onYearPickerOpenChange")(open)}
      >
        <Calendar.Header>
          <Calendar.YearPickerTrigger
            testID="trigger"
            isDisabled={disabled}
            style={compact ? { width: 24, height: 24 } : undefined}
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
            <Calendar.YearPickerTriggerHeading />
            <Calendar.YearPickerTriggerIndicator />
            <CtxProbe slot="trigger" />
          </Calendar.YearPickerTrigger>
          <Calendar.NavButton slot="previous" />
          <Calendar.NavButton slot="next" />
        </Calendar.Header>
        <Calendar.Grid>
          <Calendar.GridHeader>
            {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
          </Calendar.GridHeader>
          <Calendar.GridBody>{(date) => <Calendar.Cell date={date} />}</Calendar.GridBody>
        </Calendar.Grid>
        <Calendar.YearPickerGrid>
          <Calendar.YearPickerGridBody>
            {({ year }) => (
              <Calendar.YearPickerCell
                year={year}
                onPressDown={() => {
                  if (year === 2027) probe("cell-press")("down");
                }}
                onPress={() => {
                  if (year === 2027) probe("cell-press")("press");
                }}
                onLayout={(e) => {
                  if (year === 2027) {
                    probe("layout")({
                      name: "cell-2027",
                      width: e.bounds.size.width,
                      height: e.bounds.size.height,
                    });
                  }
                }}
              >
                {year === 2027 ? <CtxProbe slot="cell" /> : undefined}
              </Calendar.YearPickerCell>
            )}
          </Calendar.YearPickerGridBody>
        </Calendar.YearPickerGrid>
      </Calendar>
      <View testID="ctx-sample" role="button" class="p-2" onPress={sampleChannels}>
        <Text>ctx-sample</Text>
      </View>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Entry
 * -----------------------------------------------------------------------------------------------*/

function Fixture() {
  const name = String(host.params.case ?? "mobile");

  if (name === "mobile") return <MobileCase />;

  return <Text>{`unknown case: ${name}`}</Text>;
}

function Root() {
  return (
    <Scoped>
      <Fixture />
    </Scoped>
  );
}

mount(Root);
