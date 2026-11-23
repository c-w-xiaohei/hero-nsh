import type { JSX } from "nsh";
import { Input } from "nsh/base";
import { cleanup, host, mount, signal, Text, View } from "nsh";
import {
  DateInputGroup,
  type DateInputGroupInputKeyboardType,
  EnvironmentScope,
} from "@heroui/react";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";
import {
  DateInputGroupAffixContext,
  DateInputGroupContext,
  DateInputGroupFieldContext,
  DateInputGroupKeyboardContext,
} from "../src/components/date-input-group/date-input-group-context";
import { dateInputGroupVariants } from "../src/components/date-input-group/date-input-group.styles";
import { createDateFieldState } from "../src/components/date-input-group/create-date-field-state";

/*
 * NSH-only DateInputGroup fixture (port sheet 4b.3), not a shared scenario.
 *
 * HeroUI 3.2.7's package entry does not export DateInputGroup: the six parts
 * reach users only as `DateField.Group / Input / InputContainer / Segment /
 * Prefix / Suffix`, and DateField / TimeField are later units (b10). A shared
 * scenario would have to name one of the two APIs and would fail to compile on
 * the other side, so this unit ships no shared scene and no screenshot of its
 * own; this fixture mounts the parts through our public entry instead.
 *
 * It sits next to harness/nsh.json on purpose. NSH takes the entry's own
 * directory as the app root, so an entry under harness/tests/... finds no
 * nsh.json and loses the `@heroui/react` alias and the theme.
 *
 * host.params.case picks the shape:
 *   default        Root > InputContainer > Input > Segment, the parts at their
 *                  HeroUI nesting; the Root className and the Segment className
 *                  functions record the render props
 *   variants       primary, secondary and fullWidth groups together
 *   disabled       a Root with isDisabled, its render props recorded
 *   invalid        a Root with isInvalid, its render props recorded
 *   prefix-suffix  Prefix "#", Suffix "%", both as raw strings
 *   affix-interactive
 *                  the default case under `DateInputGroupAffixContext(true)` —
 *                  the picker's contract — with Prefix/Suffix around a
 *                  pressable probe, an onLayout bounds probe per affix, and a
 *                  press counter inside the prefix (A-011, M-002)
 *   affix-static    the same affix probes with no affix context — the
 *                  `pointer-events-none` half of M-002
 *   edit-gate       a provided field state (onChange probe) under
 *                  `host.params.gate` = "disabled" | "readonly" (M-011, the
 *                  readonly half of M-008) and `host.params.granularity` =
 *                  "minute" for the dayPeriod channel (M-014)
 *   keyboard-type  the default case with `Input`'s `keyboardType` prop set to
 *                  `host.params.kt` ("auto" when absent); a probe records the
 *                  value the context hands each segment (A-007, M-007/M-009)
 *   slots-probe    no scene: records the `dateInputGroupVariants` slot strings
 *                  for the four input×interactive combinations (`slots` probe),
 *                  the table-level half of the M-001 bounds assertions
 *   range-slots    `slot="start"` / `slot="end"` Inputs around a fake range
 *                  separator (R-012). Each Input is wide enough that its middle
 *                  is padding, so a press there is the group's "press on the
 *                  padding" path, not a press on a segment. The fake separator
 *                  calls `registerRangeSeparator` and renders the registration.
 *   trigger-focus  a provided field state with an onChange probe, a fake
 *                  trigger that calls `registerTriggerFocus` (R-006) and a view
 *                  outside the group, so a Return key, a trigger focus and the
 *                  commit on leaving the group are all observable.
 *
 * host.params.scope picks the environment wrapper (A-011): "touch" wraps the
 * case in `EnvironmentScope(input="touch")` — the injected half of the mobile
 * assertions; anything else mounts the case on the host-derived default
 * (the pointer half on a desktop-pinned open). The test-only params
 * `testInput` ("pointer"/"touch") inject an outer EnvironmentScope input.
 *
 * The mobile layer's extra probes (adapt sheet §4): the default case records
 * the Root's `onLayout` bounds (`root-bounds`), the Root's and each Segment's
 * `onHoverStart`/`onHoverChange`/`onHoverEnd` (`hover-events`), the Input's
 * `className` render props (`input-props`) and each Segment's `onLayout`
 * bounds through a plain wrapper View (`segment-bounds` — Segment takes no
 * `onLayout` prop, and the wrapper shrink-wraps it, so its bounds are the
 * segment's).
 *
 * The two last cases import the unit's internal context by relative path, as
 * `harness/field-error.fixtures.tsx:4` does: it is an internal module, not a
 * public export, and a fixture is the one place that may hold it. The consumers
 * that own those registrations (DateRangePicker's RangeSeparator, DatePicker's
 * Trigger) are later units, so the fixture stands in for them without
 * importing them (`_common.md` "Real hosts"; port sheet 4b.3).
 */

function Segments() {
  return (
    <DateInputGroup.Input>
      {(segment) => <DateInputGroup.Segment segment={segment} />}
    </DateInputGroup.Input>
  );
}

type RootValues = {
  isHovered: () => boolean;
  isFocusWithin: () => boolean;
  isFocusVisible: () => boolean;
  isDisabled: () => boolean;
  isInvalid: () => boolean;
};

function RootClassProbe(name: string) {
  const record = probe(name);

  return (values: RootValues) => {
    record({
      isHovered: values.isHovered(),
      isFocusWithin: values.isFocusWithin(),
      isFocusVisible: values.isFocusVisible(),
      isDisabled: values.isDisabled(),
      isInvalid: values.isInvalid(),
    });

    return "";
  };
}

/*
 * The mobile layer's hover/bounds probes (adapt sheet M-001/M-003): the Root
 * reports its `onLayout` bounds and its hover callbacks, the Input reports
 * its render props, and each Segment reports its hover callbacks and — through
 * a shrink-wrapping View, since Segment takes no `onLayout` — its bounds. The
 * probes record into Storage only; the rendered tree is unchanged.
 */
function DefaultCase() {
  const rootClass = RootClassProbe("root-props");
  const inputProps = probe("input-props");
  const segmentProps = probe("segment-props");
  const segments = probe("segments");
  const rootBounds = probe("root-bounds");
  const segmentBounds = probe("segment-bounds");
  const hoverEvents = probe("hover-events");

  const hoverProps = (source: string, type: string) => ({
    onHoverStart: () => hoverEvents({ source, type, kind: "start" }),
    onHoverChange: (isHovering: boolean) =>
      hoverEvents({ source, type, kind: "change", isHovering }),
    onHoverEnd: () => hoverEvents({ source, type, kind: "end" }),
  });

  return (
    <Stage>
      <DateInputGroup
        aria-label="date"
        className={rootClass}
        onLayout={(event) => rootBounds(event.bounds)}
        {...hoverProps("root", "")}
      >
        <DateInputGroup.InputContainer>
          <DateInputGroup.Input
            className={(values) => {
              inputProps({
                isHovered: values.isHovered(),
                isFocusWithin: values.isFocusWithin(),
                isFocusVisible: values.isFocusVisible(),
                isDisabled: values.isDisabled(),
                isInvalid: values.isInvalid(),
              });

              return "";
            }}
          >
            {(segment) => (
              <View
                onLayout={(event) =>
                  segmentBounds({ type: segment.type, bounds: event.bounds })
                }
              >
                <DateInputGroup.Segment
                  segment={segment}
                  {...hoverProps("segment", segment.type)}
                  className={(values) => {
                    segmentProps({
                      type: segment.type,
                      isFocused: values.isFocused(),
                      isHovered: values.isHovered(),
                      isReadOnly: values.isReadOnly(),
                      isInvalid: values.isInvalid(),
                      isDisabled: values.isDisabled(),
                    });
                    segments({
                      type: segment.type,
                      text: segment.text,
                      isPlaceholder: segment.isPlaceholder,
                      isEditable: segment.isEditable,
                    });

                    return "";
                  }}
                />
              </View>
            )}
          </DateInputGroup.Input>
        </DateInputGroup.InputContainer>
      </DateInputGroup>
    </Stage>
  );
}

function VariantsCase() {
  return (
    <Stage>
      <DateInputGroup aria-label="primary" variant="primary">
        <Segments />
      </DateInputGroup>
      <DateInputGroup aria-label="secondary" variant="secondary">
        <Segments />
      </DateInputGroup>
      <DateInputGroup aria-label="full-width" fullWidth>
        <Segments />
      </DateInputGroup>
    </Stage>
  );
}

function DisabledCase() {
  return (
    <Stage>
      <DateInputGroup
        aria-label="disabled-date"
        isDisabled
        className={RootClassProbe("root-props")}
      >
        <Segments />
      </DateInputGroup>
    </Stage>
  );
}

function InvalidCase() {
  return (
    <Stage>
      <DateInputGroup
        aria-label="invalid-date"
        isInvalid
        className={RootClassProbe("root-props")}
      >
        <Segments />
      </DateInputGroup>
    </Stage>
  );
}

function PrefixSuffixCase() {
  return (
    <Stage>
      <DateInputGroup aria-label="date">
        <DateInputGroup.Prefix>#</DateInputGroup.Prefix>
        <Segments />
        <DateInputGroup.Suffix>%</DateInputGroup.Suffix>
      </DateInputGroup>
    </Stage>
  );
}

/*
 * A-011: the affix half under a picker's contract. `DateInputGroupAffixContext`
 * is imported by relative path like the group context above — an internal
 * module a picker root provides (date-picker-root.tsx:598), never a public
 * export; the fixture stands in for that provider, as the port sheet's fake
 * separator and trigger already do. The affixes wrap a pressable probe, and
 * each affix reports its own `onLayout` bounds, so the `interactive` axis's
 * touch sizing and the press-through are both observable (`M-001` / `M-002`).
 */
function AffixCase(props: { interactive: boolean }) {
  const presses = probe("affix-presses");
  const prefixBounds = probe("prefix-bounds");
  const suffixBounds = probe("suffix-bounds");
  const segmentProps = probe("segment-props");

  return (
    <Stage>
      <DateInputGroupAffixContext.Provider value={() => props.interactive}>
        <DateInputGroup aria-label="affix-date" className={RootClassProbe("root-props")}>
          <DateInputGroup.InputContainer>
            <DateInputGroup.Prefix
              testID="affix-prefix"
              onLayout={(event) => prefixBounds(event.bounds)}
            >
              <View
                testID="affix-prefix-button"
                role="button"
                onPress={() => presses("prefix")}
              >
                <Text>prefix</Text>
              </View>
            </DateInputGroup.Prefix>
            <DateInputGroup.Input>
              {(segment) => (
                <DateInputGroup.Segment
                  segment={segment}
                  className={(values) => {
                    segmentProps({
                      type: segment.type,
                      isFocused: values.isFocused(),
                      isHovered: values.isHovered(),
                      isReadOnly: values.isReadOnly(),
                      isInvalid: values.isInvalid(),
                      isDisabled: values.isDisabled(),
                    });

                    return "";
                  }}
                />
              )}
            </DateInputGroup.Input>
            <DateInputGroup.Suffix
              testID="affix-suffix"
              onLayout={(event) => suffixBounds(event.bounds)}
            >
              <View
                testID="affix-suffix-button"
                role="button"
                onPress={() => presses("suffix")}
              >
                <Text>suffix</Text>
              </View>
            </DateInputGroup.Suffix>
          </DateInputGroup.InputContainer>
        </DateInputGroup>
      </DateInputGroupAffixContext.Provider>
    </Stage>
  );
}

/*
 * A-011: reads the `DateInputGroupKeyboardContext` the Input provides and
 * records it, so the `keyboardType` prop's path to the segments is observable
 * where the host's keyboard itself is not (sheet §6). It sits inside the
 * Input's provider tree — placed as a segment child would put it under the
 * same context, and a bare sibling reads it just as well.
 */
function KeyboardTypeProbe() {
  const record = probe("keyboard-type");
  const type = DateInputGroupKeyboardContext();

  record(type());

  return <></>;
}

function KeyboardTypeCase() {
  const kt = host.params.kt;

  return (
    <Stage>
      <DateInputGroup aria-label="date">
        <DateInputGroup.InputContainer>
          <DateInputGroup.Input
            keyboardType={
              typeof kt === "string" && kt !== ""
                ? (kt as DateInputGroupInputKeyboardType)
                : undefined
            }
          >
            {(segment) => (
              <DateInputGroup.Segment segment={segment}>
                {() => <KeyboardTypeProbe />}
              </DateInputGroup.Segment>
            )}
          </DateInputGroup.Input>
        </DateInputGroup.InputContainer>
      </DateInputGroup>
    </Stage>
  );
}

/*
 * Diagnostic for the mobile assertions (adapt sheet M-001): records the slot
 * strings `dateInputGroupVariants` resolves for each axis combination, so a
 * bounds assertion that fails can be traced to the table without reading a
 * class off the screen (`nsh/test` cannot). `host.params.axes` =
 * "touch-interactive" | "touch-static" | "pointer-interactive" |
 * "pointer-static" picks the combination; the default records all four.
 */
function SlotsProbeCase() {
  const record = probe("slots");
  const pick = String(host.params.axes ?? "");
  const combos: [string, "pointer" | "touch", boolean][] =
    pick === ""
      ? [
          ["touch-interactive", "touch", true],
          ["touch-static", "touch", false],
          ["pointer-interactive", "pointer", true],
          ["pointer-static", "pointer", false],
        ]
      : [
          [
            pick,
            pick.startsWith("touch") ? "touch" : "pointer",
            pick.endsWith("interactive"),
          ],
        ];

  for (const [name, input, interactive] of combos) {
    const slots = dateInputGroupVariants({
      variant: "primary",
      fullWidth: false,
      input,
      interactive,
    });

    record({
      name,
      base: slots.base(),
      prefix: slots.prefix(),
      suffix: slots.suffix(),
      segment: slots.segment(),
    });
  }

  return <></>;
}

/*
 * An Input whose className render prop and whose segments record their state
 * under `name`, so two Inputs in one group keep separate logs. `width` widens
 * the row past its segments: the middle of the bounds is then the Input's own
 * padding, which is the press `range-slots` needs.
 */
function ProbeInput(props: { name: string; slot?: string; testID?: string; width?: number }) {
  const inputProps = probe("input-props");
  const segmentProps = probe(`${props.name}-segment-props`);
  const segments = probe(`${props.name}-segments`);

  return (
    <DateInputGroup.Input
      slot={props.slot}
      testID={props.testID}
      style={props.width ? { width: props.width } : undefined}
      className={(values) => {
        inputProps({
          slot: props.slot ?? "",
          isHovered: values.isHovered(),
          isFocusWithin: values.isFocusWithin(),
          isFocusVisible: values.isFocusVisible(),
          isDisabled: values.isDisabled(),
          isInvalid: values.isInvalid(),
        });

        return "";
      }}
    >
      {(segment) => (
        <DateInputGroup.Segment
          segment={segment}
          className={(values) => {
            segmentProps({
              type: segment.type,
              isFocused: values.isFocused(),
              isHovered: values.isHovered(),
              isReadOnly: values.isReadOnly(),
              isInvalid: values.isInvalid(),
              isDisabled: values.isDisabled(),
            });
            segments({
              type: segment.type,
              text: segment.text,
              isPlaceholder: segment.isPlaceholder,
              isEditable: segment.isEditable,
            });

            return "";
          }}
        />
      )}
    </DateInputGroup.Input>
  );
}

/*
 * Stands in for DateRangePicker.RangeSeparator: it reports itself to the group,
 * which is the only input of R-012's `flex-none pe-0` / `ps-0` branch. The text
 * makes the registration observable without reading a class.
 */
function FakeRangeSeparator() {
  const group = DateInputGroupContext();

  cleanup(group.registerRangeSeparator());

  return (
    <View testID="separator" class="items-center px-1">
      <Text>{group.hasRangeSeparator() ? "separator-registered" : "separator-missing"}</Text>
    </View>
  );
}

function RangeSlotsCase() {
  return (
    <Stage>
      <DateInputGroup aria-label="range" className={RootClassProbe("root-props")}>
        <DateInputGroup.InputContainer>
          <ProbeInput name="start" slot="start" testID="start-input" width={360} />
          <FakeRangeSeparator />
          <ProbeInput name="end" slot="end" testID="end-input" width={360} />
        </DateInputGroup.InputContainer>
      </DateInputGroup>
    </Stage>
  );
}

/*
 * Stands in for DatePicker.Trigger: it reports its focus to the group, whose
 * ring R-006 suppresses while one holds it. The record carries the group's own
 * `triggerFocused` / `isFocusWithin` reads, the two accessors the Trigger units
 * consume, because `nsh/test` cannot read the painted class.
 */
function FakeTrigger() {
  const group = DateInputGroupContext();
  const focused = signal(false);
  const record = probe("trigger");
  const report = (isFocused: boolean) =>
    record({
      focused: isFocused,
      triggerFocused: group.triggerFocused(),
      isFocusWithin: group.isFocusWithin(),
    });

  cleanup(group.registerTriggerFocus(() => focused()));

  return (
    <View
      testID="trigger"
      role="button"
      focusable
      class="h-9 items-center px-2"
      onFocus={() => {
        focused.set(true);
        report(true);
      }}
      onBlur={() => {
        focused.set(false);
        report(false);
      }}
    >
      <Text>open calendar</Text>
    </View>
  );
}

function TriggerFocusCase() {
  const segmentProps = probe("segment-props");
  const segments = probe("segments");
  const changes = probe("field-change");
  const field = createDateFieldState({
    onChange: (value) => changes(value ? `${value.year}-${value.month}-${value.day}` : "null"),
  });

  return (
    <Stage>
      <View class="flex-col gap-2">
        <DateInputGroupFieldContext.Provider value={field}>
          <DateInputGroup aria-label="trigger-date" className={RootClassProbe("root-props")}>
            <DateInputGroup.InputContainer>
              <DateInputGroup.Input>
                {(segment) => (
                  <DateInputGroup.Segment
                    segment={segment}
                    className={(values) => {
                      segmentProps({
                        type: segment.type,
                        isFocused: values.isFocused(),
                        isHovered: values.isHovered(),
                        isReadOnly: values.isReadOnly(),
                        isInvalid: values.isInvalid(),
                        isDisabled: values.isDisabled(),
                      });
                      segments({
                        type: segment.type,
                        text: segment.text,
                        isPlaceholder: segment.isPlaceholder,
                        isEditable: segment.isEditable,
                      });

                      return "";
                    }}
                  />
                )}
              </DateInputGroup.Input>
              <DateInputGroup.Suffix>
                <FakeTrigger />
              </DateInputGroup.Suffix>
            </DateInputGroup.InputContainer>
          </DateInputGroup>
        </DateInputGroupFieldContext.Provider>
        <View
          testID="outside"
          role="button"
          focusable
          class="h-9 items-center px-2"
          onPress={() => {}}
        >
          <Text>outside</Text>
        </View>
        {/* A real input outside the group: a press focuses it on every
            target (views only on some), so the group's commit boundary is
            reachable the same way headless and web (adapt sheet M-010). */}
        <Input testID="outside-input" class="h-9" />
      </View>
    </Stage>
  );
}

/*
 * A provided field state under an edit gate (adapt sheet M-011, the readonly
 * half of M-008, the dayPeriod half of M-014): `host.params.gate` =
 * "disabled" | "readonly" feeds BOTH the field state (what the segments and
 * the editing calls actually read) and the Root props (the group's own
 * render props), and `host.params.granularity` = "minute" widens the field to
 * a time row so a `dayPeriod` segment exists. The `field-change` probe is the
 * onChange record the "no edit got through" assertions read.
 */
function EditGateCase() {
  const gate = String(host.params.gate ?? "");
  const granularity = String(host.params.granularity ?? "");
  const segmentProps = probe("segment-props");
  const segments = probe("segments");
  const changes = probe("field-change");
  const field = createDateFieldState({
    isDisabled: () => (gate === "disabled" ? true : undefined),
    isReadOnly: () => (gate === "readonly" ? true : undefined),
    granularity: () =>
      granularity === "minute" ? ("minute" as const) : undefined,
    onChange: (value) =>
      changes(value ? `${value.year}-${value.month}-${value.day}` : "null"),
  });

  return (
    <Stage>
      <DateInputGroupFieldContext.Provider value={field}>
        <DateInputGroup
          aria-label="gate-date"
          isDisabled={gate === "disabled"}
          isReadOnly={gate === "readonly"}
          className={RootClassProbe("root-props")}
        >
          <DateInputGroup.InputContainer>
            <DateInputGroup.Input>
              {(segment) => (
                <DateInputGroup.Segment
                  segment={segment}
                  className={(values) => {
                    segmentProps({
                      type: segment.type,
                      isFocused: values.isFocused(),
                      isHovered: values.isHovered(),
                      isReadOnly: values.isReadOnly(),
                      isInvalid: values.isInvalid(),
                      isDisabled: values.isDisabled(),
                    });
                    segments({
                      type: segment.type,
                      text: segment.text,
                      isPlaceholder: segment.isPlaceholder,
                      isEditable: segment.isEditable,
                    });

                    return "";
                  }}
                />
              )}
            </DateInputGroup.Input>
          </DateInputGroup.InputContainer>
        </DateInputGroup>
      </DateInputGroupFieldContext.Provider>
    </Stage>
  );
}

/* A-011: the environment wrapper the mobile assertions drive — the same
 * `Scoped` shape switch's fixture uses (harness/switch.fixtures.tsx:73). */
function Scoped(props: { children?: JSX.Element }) {
  // Test-harness environment param (only the mobile tests set it —
  // absent keeps the host-derived default): `testInput` injects an outer
  // EnvironmentScope input so the pointer baseline is host-independent
  // (inner `scope` overrides still win).
  const testInput = String(host.params.testInput ?? "");

  const body =
    String(host.params.scope ?? "") === "touch" ? (
      <EnvironmentScope input="touch">{props.children}</EnvironmentScope>
    ) : (
      <>{props.children}</>
    );

  return testInput === "pointer" || testInput === "touch" ? (
    <EnvironmentScope input={testInput}>{body}</EnvironmentScope>
  ) : (
    body
  );
}

function Fixture() {
  const name = String(host.params.case ?? "default");

  if (name === "variants") return <Scoped><VariantsCase /></Scoped>;
  if (name === "disabled") return <Scoped><DisabledCase /></Scoped>;
  if (name === "invalid") return <Scoped><InvalidCase /></Scoped>;
  if (name === "prefix-suffix") return <Scoped><PrefixSuffixCase /></Scoped>;
  if (name === "affix-interactive") return <Scoped><AffixCase interactive={true} /></Scoped>;
  if (name === "affix-static") return <Scoped><AffixCase interactive={false} /></Scoped>;
  if (name === "edit-gate") return <Scoped><EditGateCase /></Scoped>;
  if (name === "keyboard-type") return <Scoped><KeyboardTypeCase /></Scoped>;
  if (name === "slots-probe") return <SlotsProbeCase />;
  if (name === "range-slots") return <Scoped><RangeSlotsCase /></Scoped>;
  if (name === "trigger-focus") return <Scoped><TriggerFocusCase /></Scoped>;

  return <Scoped><DefaultCase /></Scoped>;
}

mount(Fixture);
