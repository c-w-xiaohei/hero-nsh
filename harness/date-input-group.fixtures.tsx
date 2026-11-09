import { host, mount } from "nsh";
import { DateInputGroup } from "@heroui/react";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";

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
 *
 * The port sheet's `range-slots` and `trigger-focus` cases need a fake field
 * provider and a fake trigger that call the unit's internal context
 * (`registerRangeSeparator`, `registerTriggerFocus`). The context is an
 * internal module defined by the implementation, and the two consumers that
 * own those registrations (DateRangePicker, DatePicker) are later units: a
 * fake provider here would restate an unexported shape this fixture cannot
 * read from the port sheet. Those two cases wait for their consumer units and
 * for the b10 fixtures; the parts they exercise (R-012, R-006) are still
 * covered by the rule list and by nsh check.
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

function Fixture() {
  const name = String(host.params.case ?? "default");

  if (name === "variants") return <VariantsCase />;
  if (name === "disabled") return <DisabledCase />;
  if (name === "invalid") return <InvalidCase />;
  if (name === "prefix-suffix") return <PrefixSuffixCase />;

  return <DefaultCase />;
}

mount(Fixture);
