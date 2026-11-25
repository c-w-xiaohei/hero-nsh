import { host, mount, Scroll, View } from "nsh";
import type { JSX } from "nsh";
import {
  Description,
  EnvironmentScope,
  FieldError,
  Label,
  SearchField,
} from "@heroui/react";
import type { SearchFieldInputProps } from "@heroui/react";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";

/*
 * NSH-only SearchField fixture for the mobile adaptation unit
 * (adapt-sheets/search-field.md §2 A-001…A-011, §4 M-001…M-010).
 *
 * It sits next to harness/nsh.json on purpose: NSH takes the entry's own
 * directory as the app root, so an entry under harness/tests/... finds no
 * nsh.json and loses the `@heroui/react` alias and the theme.
 *
 * `host.params.case` picks the shape:
 *
 *   basic         full compound (Label + Group + SearchIcon + Input +
 *                 ClearButton) with onChange / onClear / onSubmit /
 *                 onFocus / onBlur probes — the press-to-focus and
 *                 press-to-type chain (M-005) and the desktop-parity half
 *   layout        the basic field, Group and Input `onLayout` reporting
 *                 `event.bounds` through the `group-layout` / `input-layout`
 *                 probes (M-001's 36 vs ≥44 pt)
 *   hover         Group and Input className functions record their render
 *                 props under `group-props` / `input-props`, and the four
 *                 hover callbacks report under `hover` (M-002's touch
 *                 suppression and pointer parity)
 *   submit        `onSubmit` / `onBlur` probes; `host.params.enterKeyHint`,
 *                 `returnKeyType`, `type`, `inputMode`, `keyboardType`,
 *                 `autoComplete` select the keyboard channel under test
 *                 (M-003, M-004)
 *   clear         `defaultValue="hero"` plus focus probes: press the clear
 *                 button → clear, focus handed back, typing continues on the
 *                 same input (M-006); Escape with a non-empty value (M-007)
 *   empty-escape  no value: Escape must not fire `onClear` (M-007's other
 *                 half)
 *   readonly      `isReadOnly` with a non-empty value (clear button
 *                 `enabled === false`, M-006)
 *   disabled      `isDisabled` (same assertion, plus `ERR_NSH_TEST_DISABLED`
 *                 on type, M-009)
 *   empty         `defaultValue="hero"` with the Root render props recorded
 *                 under `root-props` — the `isEmpty` flip behind T-006
 *                 (M-009's baseline half)
 *   controlled    `value="hero"` with no write-back: typing reports
 *                 `onChange` but the displayed value stays (M-009)
 *   invalid       `isInvalid isRequired value="ab"` + Description +
 *                 FieldError — the T-008 render (M-009)
 *   kbd           the keyboard-parameter matrix as separate labeled fields,
 *                 one `kbd-*` testID and `kbd-<slug>` onChange probe per
 *                 variant — M-004's dual-env × 8-variant matrix in two opens
 *                 instead of sixteen (the web host drops steps when a test
 *                 holds more live apps than its budget)
 *
 * `host.params.scope` picks the environment: "" keeps the host default
 * (pointer on headless/web — the desktop-parity half), "touch" wraps the
 * case in `EnvironmentScope input="touch"` (same convention as
 * `link.fixtures.tsx` / `close-button.fixtures.tsx`). The test-only params
 * `testInput` ("pointer"/"touch") inject an outer EnvironmentScope input.
 */

type Scope = "" | "touch";

type GroupValues = {
  isHovered: () => boolean;
  isFocusWithin: () => boolean;
  isFocusVisible: () => boolean;
  isDisabled: () => boolean;
  isInvalid: () => boolean;
};


/** Test-only literal-typing prop: the mobile tests pass `testAutoCapitalize`
 * ("none") so a literal typed text cannot meet the host keyboard's
 * sentence-capitalization (iOS synthesizes real key events). Absent the
 * param the prop is undefined and the input keeps its default. */
function textParam(name: string): string | undefined {
  const value = host.params[name];
  return typeof value === "string" ? value : undefined;
}

type InputValues = {
  isHovered: () => boolean;
  isFocused: () => boolean;
  isFocusVisible: () => boolean;
  isDisabled: () => boolean;
  isInvalid: () => boolean;
};

// A-011: the NSH-only fixture this unit's mobile assertions mount —
// `host.params.scope="touch"` injects `EnvironmentScope input="touch"` so the
// same case bodies run under the default (pointer) and the injected (touch)
// environment (close-button / date-input-group / number-field convention).
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
/** The stock field: Label + Group + icon + input + clear button. */
function FieldParts(props: { children?: JSX.Element }) {
  return (
    <>
      <Label>Search</Label>
      <SearchField.Group testID="sf-group">
        <SearchField.SearchIcon />
        <SearchField.Input
          autoCapitalize={textParam("testAutoCapitalize")} testID="sf-input" placeholder="Search..." />
        <SearchField.ClearButton />
        {props.children}
      </SearchField.Group>
    </>
  );
}

function BasicCase() {
  return (
    <Stage>
      <SearchField
        name="search"
        onBlur={probe("onBlur")}
        onChange={probe("onChange")}
        onClear={probe("onClear")}
        onFocus={probe("onFocus")}
        onSubmit={probe("onSubmit")}
      >
        <FieldParts />
      </SearchField>
    </Stage>
  );
}

function LayoutCase() {
  return (
    <Stage>
      <SearchField name="search">
        <Label>Search</Label>
        <SearchField.Group
          testID="sf-group"
          onLayout={(event) => probe("group-layout")(event.bounds)}
        >
          <SearchField.SearchIcon />
          <SearchField.Input
          autoCapitalize={textParam("testAutoCapitalize")}
            testID="sf-input"
            placeholder="Search..."
            onLayout={(event) => probe("input-layout")(event.bounds)}
          />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>
    </Stage>
  );
}

function HoverCase() {
  const groupProps = probe("group-props");
  const inputProps = probe("input-props");
  const hover = probe("hover");

  return (
    <Stage>
      <SearchField name="search">
        <Label>Search</Label>
        <SearchField.Group
          testID="sf-group"
          onHoverChange={(isHovered) => hover(["group", "change", isHovered])}
          onHoverEnd={() => hover(["group", "end"])}
          onHoverStart={() => hover(["group", "start"])}
          className={(values: GroupValues) => {
            groupProps({
              isHovered: values.isHovered(),
              isFocusWithin: values.isFocusWithin(),
              isFocusVisible: values.isFocusVisible(),
              isDisabled: values.isDisabled(),
              isInvalid: values.isInvalid(),
            });

            return "";
          }}
        >
          <SearchField.SearchIcon />
          <SearchField.Input
          autoCapitalize={textParam("testAutoCapitalize")}
            testID="sf-input"
            placeholder="Search..."
            onHoverChange={(isHovered) => hover(["input", "change", isHovered])}
            onHoverEnd={() => hover(["input", "end"])}
            onHoverStart={() => hover(["input", "start"])}
            className={(values: InputValues) => {
              inputProps({
                isHovered: values.isHovered(),
                isFocused: values.isFocused(),
                isFocusVisible: values.isFocusVisible(),
                isDisabled: values.isDisabled(),
                isInvalid: values.isInvalid(),
              });

              return "";
            }}
          />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>
    </Stage>
  );
}

function SubmitCase() {
  return (
    <Stage>
      <SearchField name="search" onBlur={probe("onBlur")} onSubmit={probe("onSubmit")}>
        <Label>Search</Label>
        <SearchField.Group testID="sf-group">
          <SearchField.SearchIcon />
          <SearchField.Input
          autoCapitalize={textParam("testAutoCapitalize")}
            testID="sf-input"
            placeholder="Search..."
            autoComplete={host.params.autoComplete as string | undefined}
            enterKeyHint={host.params.enterKeyHint as never}
            inputMode={host.params.inputMode as never}
            keyboardType={host.params.keyboardType as never}
            returnKeyType={host.params.returnKeyType as never}
            type={host.params.type as never}
            onChange={probe("onChange")}
          />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>
    </Stage>
  );
}

function ClearCase() {
  return (
    <Stage>
      <SearchField
        name="search"
        defaultValue="hero"
        onBlur={probe("onBlur")}
        onChange={probe("onChange")}
        onClear={probe("onClear")}
        onFocus={probe("onFocus")}
      >
        <FieldParts />
      </SearchField>
    </Stage>
  );
}

function EmptyEscapeCase() {
  return (
    <Stage>
      <SearchField name="search" onChange={probe("onChange")} onClear={probe("onClear")}>
        <FieldParts />
      </SearchField>
    </Stage>
  );
}

function ReadonlyCase() {
  return (
    <Stage>
      <SearchField isReadOnly name="search" defaultValue="hero" onClear={probe("onClear")}>
        <FieldParts />
      </SearchField>
    </Stage>
  );
}

function DisabledCase() {
  return (
    <Stage>
      <SearchField isDisabled name="search" defaultValue="hero" onClear={probe("onClear")}>
        <FieldParts />
      </SearchField>
    </Stage>
  );
}

/*
 * The M-009 baseline cases, mirroring the desktop suite's `empty.split` /
 * `controlled` / `invalid` scenarios: the Root render props record the
 * `isEmpty` flip T-006 reads upstream from `data-empty` (D18), the controlled
 * value never writes itself back, and the invalid field renders its
 * FieldError while hiding the Description.
 */
function EmptyCase() {
  const record = probe("root-props");

  return (
    <Stage>
      <SearchField
        name="search"
        defaultValue="hero"
        onChange={probe("onChange")}
        onClear={probe("onClear")}
        className={(values: {
          isEmpty: () => boolean;
          isDisabled: () => boolean;
          isInvalid: () => boolean;
          isReadOnly: () => boolean;
          isRequired: () => boolean;
        }) => {
          record({
            isEmpty: values.isEmpty(),
            isDisabled: values.isDisabled(),
            isInvalid: values.isInvalid(),
            isReadOnly: values.isReadOnly(),
            isRequired: values.isRequired(),
          });

          return "";
        }}
      >
        <FieldParts />
      </SearchField>
    </Stage>
  );
}

function ControlledCase() {
  return (
    <Stage>
      <SearchField name="search" value="hero" onChange={probe("onChange")}>
        <FieldParts />
      </SearchField>
    </Stage>
  );
}

function InvalidCase() {
  return (
    <Stage>
      <SearchField name="search" isInvalid isRequired value="ab">
        <Label>Search</Label>
        <SearchField.Group testID="sf-group">
          <SearchField.SearchIcon />
          <SearchField.Input
          autoCapitalize={textParam("testAutoCapitalize")} testID="sf-input" placeholder="Search..." />
          <SearchField.ClearButton />
        </SearchField.Group>
        <Description>Search by title or author</Description>
        <FieldError>Enter at least 3 characters</FieldError>
      </SearchField>
    </Stage>
  );
}

/*
 * The M-004 keyboard matrix, one mount per environment instead of one per
 * parameter set: each variant is its own labeled field so `app.type` can
 * address it by `id:kbd-*`, and its Root `onChange` records under
 * `kbd-<slug>` so the callback chain is attributable per variant. This is
 * the input-group `kbd` case's pattern — the web host loses its step
 * channel when a single test holds a dozen live apps.
 */
type KbdInputProps = Pick<
  SearchFieldInputProps,
  "enterKeyHint" | "returnKeyType" | "type" | "inputMode" | "autoComplete"
>;

const KBD_VARIANTS: { slug: string; label: string; input: KbdInputProps }[] = [
  { slug: "hint-search", label: "Kbd hint search", input: { enterKeyHint: "search" } },
  { slug: "hint-go", label: "Kbd hint go", input: { enterKeyHint: "go" } },
  { slug: "hint-done", label: "Kbd hint done", input: { enterKeyHint: "done" } },
  { slug: "return-search", label: "Kbd return search", input: { returnKeyType: "search" } },
  { slug: "type-search", label: "Kbd type search", input: { type: "search" } },
  { slug: "type-email", label: "Kbd type email", input: { type: "email" } },
  { slug: "mode-numeric", label: "Kbd mode numeric", input: { inputMode: "numeric" } },
  { slug: "autofill-off", label: "Kbd autofill off", input: { autoComplete: "off" } },
];

function KbdCase() {
  // A phone-sized viewport clips the eight fields and nsh/test only reports
  // what is on screen — the `Scroll` keeps them queryable (slider precedent).
  return (
    <Stage>
      <Scroll class="h-[600px] w-[400px]">
        <View class="items-start gap-4">
          {KBD_VARIANTS.map((variant) => (
            <SearchField
              name={`kbd-${variant.slug}`}
              onChange={probe(`kbd-${variant.slug}`)}
            >
              <Label>{variant.label}</Label>
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input
              autoCapitalize={textParam("testAutoCapitalize")}
                  {...variant.input}
                  testID={`kbd-${variant.slug}`}
                  placeholder={variant.label}
                />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>
          ))}
        </View>
      </Scroll>
    </Stage>
  );
}

function Fixture() {
  const name = String(host.params.case ?? "basic");
  const body = () => {
    if (name === "layout") return <LayoutCase />;
    if (name === "hover") return <HoverCase />;
    if (name === "submit") return <SubmitCase />;
    if (name === "clear") return <ClearCase />;
    if (name === "empty-escape") return <EmptyEscapeCase />;
    if (name === "readonly") return <ReadonlyCase />;
    if (name === "disabled") return <DisabledCase />;
    if (name === "empty") return <EmptyCase />;
    if (name === "controlled") return <ControlledCase />;
    if (name === "invalid") return <InvalidCase />;
    if (name === "kbd") return <KbdCase />;

    return <BasicCase />;
  };

  return <Scoped>{body()}</Scoped>;
}

mount(Fixture);
