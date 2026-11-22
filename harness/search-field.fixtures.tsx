import { host, mount } from "nsh";
import type { JSX } from "nsh";
import { EnvironmentScope, Label, SearchField } from "@heroui/react";
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
 *
 * `host.params.scope` picks the environment: "" keeps the host default
 * (pointer on headless/web — the desktop-parity half), "touch" wraps the
 * case in `EnvironmentScope input="touch"` (same convention as
 * `link.fixtures.tsx` / `close-button.fixtures.tsx`).
 */

type Scope = "" | "touch";

type GroupValues = {
  isHovered: () => boolean;
  isFocusWithin: () => boolean;
  isFocusVisible: () => boolean;
  isDisabled: () => boolean;
  isInvalid: () => boolean;
};

type InputValues = {
  isHovered: () => boolean;
  isFocused: () => boolean;
  isFocusVisible: () => boolean;
  isDisabled: () => boolean;
  isInvalid: () => boolean;
};

function Scoped(props: { children?: JSX.Element }) {
  const scope = String(host.params.scope ?? "") as Scope;

  return scope === "touch" ? (
    <EnvironmentScope input="touch">{props.children}</EnvironmentScope>
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
        <SearchField.Input testID="sf-input" placeholder="Search..." />
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

    return <BasicCase />;
  };

  return <Scoped>{body()}</Scoped>;
}

mount(Fixture);
