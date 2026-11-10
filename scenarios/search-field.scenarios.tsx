import { Description, FieldError, Label, SearchField } from "@heroui/react";
import { signal } from "nsh";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";
import type { Component } from "./types";

/*
 * Shared SearchField scenarios, written with HeroUI's API only (SOP 3.3).
 *
 * Sources:
 *   search-field/basic          the `renderSearch` fixture of
 *                               heroui/.../search-field.test.tsx:16 (T-001 … T-004,
 *                               T-007, T-009)
 *   search-field/typing         the same fixture with onChange / onClear probes (T-004)
 *   search-field/clear          defaultValue "hero" with the clear probes (T-005)
 *   search-field/disabled       `isDisabled` (T-007)
 *   search-field/invalid        `isInvalid` + Description + FieldError (T-008)
 *   search-field/secondary      `variant="secondary"` (the T-002 / T-003 look, screenshots)
 *   search-field/controlled     a controlled value the fixture records but never writes back
 *   search-field/escape         defaultValue "hero" with onClear / onChange probes
 *   search-field/readonly       `isReadOnly` with a non-empty value
 *   search-field/submit         `onSubmit` probe
 *   search-field/empty.split    the T-006 empty state, read from the Root render prop
 *   search-field/focus.split    the T-009 focus wiring, read from the Group / Input render props
 *   search-field/unmount.split  the Input unmounting while it holds focus (round 3 X-002)
 *
 * Split scenarios (SOP 3.3.3): the render props take booleans upstream and
 * accessors here (D17), so `empty.split` and `focus.split` are written for this
 * side and call the accessors inside their probe functions.
 *
 * What is not here: `data-slot`, the BEM block / modifier and `data-empty` are
 * D18 differences, so no scenario reproduces them (port sheet T-002 / T-003 /
 * T-006). The clear button's hidden-when-empty half (R-004) is paint
 * (`opacity-0 pointer-events-none`), which `nsh/test` cannot read; T-006 reads
 * the `isEmpty` render prop it is derived from.
 */

/* The accessor objects the probe functions read (D17; the shapes are port sheet §1.2 / 1.3 / 1.4). */
type RootValues = {
  isEmpty: () => boolean;
  isDisabled: () => boolean;
  isInvalid: () => boolean;
  isReadOnly: () => boolean;
  isRequired: () => boolean;
};

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

function Basic() {
  return (
    <Stage>
      <SearchField name="search">
        <Label>Search</Label>
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input placeholder="Search..." />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>
    </Stage>
  );
}

function Typing() {
  return (
    <Stage>
      <SearchField name="search" onChange={probe("onChange")} onClear={probe("onClear")}>
        <Label>Search</Label>
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input placeholder="Search..." />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>
    </Stage>
  );
}

function Clear() {
  return (
    <Stage>
      <SearchField
        name="search"
        defaultValue="hero"
        onChange={probe("onChange")}
        onClear={probe("onClear")}
      >
        <Label>Search</Label>
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input placeholder="Search..." />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>
    </Stage>
  );
}

/*
 * The empty-state case. Upstream renders `defaultValue="hero"` and presses the
 * clear button, then reads the root's `data-empty`; this side records the Root
 * render props instead (port sheet T-006).
 */
function EmptySplit() {
  const record = probe("root-props");

  return (
    <Stage>
      <SearchField
        name="search"
        defaultValue="hero"
        onChange={probe("onChange")}
        onClear={probe("onClear")}
        className={(values: RootValues) => {
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
        <Label>Search</Label>
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input placeholder="Search..." />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>
    </Stage>
  );
}

function Disabled() {
  return (
    <Stage>
      <SearchField name="search" isDisabled onChange={probe("onChange")}>
        <Label>Search</Label>
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input placeholder="Search..." />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>
    </Stage>
  );
}

function Invalid() {
  return (
    <Stage>
      <SearchField name="search" isInvalid isRequired value="ab">
        <Label>Search</Label>
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input placeholder="Search..." />
          <SearchField.ClearButton />
        </SearchField.Group>
        <Description>Search by title or author</Description>
        <FieldError>Enter at least 3 characters</FieldError>
      </SearchField>
    </Stage>
  );
}

function Secondary() {
  return (
    <Stage>
      <SearchField name="search" variant="secondary">
        <Label>Search</Label>
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input placeholder="Search..." />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>
    </Stage>
  );
}

/*
 * The T-009 case: the Input reports focus through its public callbacks, and the
 * Group / Input className functions record the render props that drive the
 * focus look. Upstream reads `data-focus-visible` instead (D18).
 */
function FocusSplit() {
  const groupRecord = probe("group-props");
  const inputRecord = probe("input-props");

  return (
    <Stage>
      <SearchField name="search">
        <Label>Search</Label>
        <SearchField.Group
          className={(values: GroupValues) => {
            groupRecord({
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
            placeholder="Search..."
            onFocus={probe("onFocus")}
            onBlur={probe("onBlur")}
            className={(values: InputValues) => {
              inputRecord({
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

/*
 * The Input leaving the tree while it holds focus (round 3 regression). The
 * first change unmounts the Input, so the field has no focused descendant any
 * more; the Group render props record what the focus look reads (D18
 * replacement), and `onClear` says whether Escape still reaches the field.
 */
function UnmountSplit() {
  const mounted = signal(true);
  const groupRecord = probe("group-props");
  const inputRecord = probe("input-props");

  return (
    <Stage>
      <SearchField
        name="search"
        onChange={(value) => {
          probe("onChange")(value);
          mounted.set(false);
        }}
        onClear={probe("onClear")}
      >
        <Label>Search</Label>
        <SearchField.Group
          className={(values: GroupValues) => {
            groupRecord({
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
          {mounted() ? (
            <SearchField.Input
              placeholder="Search..."
              className={(values: InputValues) => {
                inputRecord({
                  isHovered: values.isHovered(),
                  isFocused: values.isFocused(),
                  isFocusVisible: values.isFocusVisible(),
                  isDisabled: values.isDisabled(),
                  isInvalid: values.isInvalid(),
                });

                return "";
              }}
            />
          ) : null}
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>
    </Stage>
  );
}

/* A controlled value with no write-back: typing must not move it. */
function Controlled() {
  return (
    <Stage>
      <SearchField name="search" value="hero" onChange={probe("onChange")}>
        <Label>Search</Label>
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input placeholder="Search..." />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>
    </Stage>
  );
}

function Escape() {
  return (
    <Stage>
      <SearchField
        name="search"
        defaultValue="hero"
        onChange={probe("onChange")}
        onClear={probe("onClear")}
      >
        <Label>Search</Label>
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input placeholder="Search..." />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>
    </Stage>
  );
}

function ReadOnly() {
  return (
    <Stage>
      <SearchField name="search" isReadOnly defaultValue="hero">
        <Label>Search</Label>
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input placeholder="Search..." />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>
    </Stage>
  );
}

function Submit() {
  return (
    <Stage>
      <SearchField name="search" onChange={probe("onChange")} onSubmit={probe("onSubmit")}>
        <Label>Search</Label>
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input placeholder="Search..." />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>
    </Stage>
  );
}

export const searchFieldScenarios = {
  "search-field/basic": Basic,
  "search-field/typing": Typing,
  "search-field/clear": Clear,
  "search-field/empty.split": EmptySplit,
  "search-field/disabled": Disabled,
  "search-field/invalid": Invalid,
  "search-field/secondary": Secondary,
  "search-field/focus.split": FocusSplit,
  "search-field/unmount.split": UnmountSplit,
  "search-field/controlled": Controlled,
  "search-field/escape": Escape,
  "search-field/readonly": ReadOnly,
  "search-field/submit": Submit,
} satisfies Record<string, Component>;
