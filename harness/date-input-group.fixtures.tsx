import type { JSX } from "nsh";
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
 *   keyboard-type  the default case with `Input`'s `keyboardType` prop set to
 *                  `host.params.kt` ("auto" when absent); a probe records the
 *                  value the context hands each segment (A-007, M-007/M-009)
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
 * (the pointer half on a desktop-pinned open).
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

function DefaultCase() {
  const rootClass = RootClassProbe("root-props");
  const segmentProps = probe("segment-props");
  const segments = probe("segments");

  return (
    <Stage>
      <DateInputGroup aria-label="date" className={rootClass}>
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
function AffixInteractiveCase() {
  const presses = probe("affix-presses");
  const prefixBounds = probe("prefix-bounds");
  const suffixBounds = probe("suffix-bounds");
  const segmentProps = probe("segment-props");

  return (
    <Stage>
      <DateInputGroupAffixContext.Provider value={() => true}>
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
        <View testID="outside" role="button" focusable class="h-9 items-center px-2">
          <Text>outside</Text>
        </View>
      </View>
    </Stage>
  );
}

/* A-011: the environment wrapper the mobile assertions drive — the same
 * `Scoped` shape switch's fixture uses (harness/switch.fixtures.tsx:73). */
function Scoped(props: { children?: JSX.Element }) {
  return String(host.params.scope ?? "") === "touch" ? (
    <EnvironmentScope input="touch">{props.children}</EnvironmentScope>
  ) : (
    <>{props.children}</>
  );
}

function Fixture() {
  const name = String(host.params.case ?? "default");

  if (name === "variants") return <Scoped><VariantsCase /></Scoped>;
  if (name === "disabled") return <Scoped><DisabledCase /></Scoped>;
  if (name === "invalid") return <Scoped><InvalidCase /></Scoped>;
  if (name === "prefix-suffix") return <Scoped><PrefixSuffixCase /></Scoped>;
  if (name === "affix-interactive") return <Scoped><AffixInteractiveCase /></Scoped>;
  if (name === "keyboard-type") return <Scoped><KeyboardTypeCase /></Scoped>;
  if (name === "range-slots") return <Scoped><RangeSlotsCase /></Scoped>;
  if (name === "trigger-focus") return <Scoped><TriggerFocusCase /></Scoped>;

  return <Scoped><DefaultCase /></Scoped>;
}

mount(Fixture);
