import type { Accessor, JSX, StyleProp, ViewStyle } from "nsh";
import { computed, signal, split, View } from "nsh";

import { createDateFieldState, type DateFieldState } from "./create-date-field-state";
import {
  DateInputGroupContext,
  DateInputGroupFieldContext,
} from "./date-input-group-context";
import { createLiveSegment, type DateSegment } from "./date-field-utils";

/* -------------------------------------------------------------------------------------------------
 * Render props
 * -----------------------------------------------------------------------------------------------*/

/**
 * What `DateInputGroup.Input`'s render props receive (HeroUI's
 * `DateInputRenderProps`). The first three follow the Input's own subtree —
 * affix hover and a trigger's focus inside the Suffix stay out — and the last
 * two come from the field state (port sheet §1.4).
 */
export interface DateInputGroupInputRenderProps {
  isHovered: Accessor<boolean>;
  isFocusWithin: Accessor<boolean>;
  isFocusVisible: Accessor<boolean>;
  isDisabled: Accessor<boolean>;
  isInvalid: Accessor<boolean>;
}

/** The props of `DateInputGroup.Input`, HeroUI's `DateInputGroupInputProps`. */
export interface DateInputGroupInputProps {
  /** Renders one segment; called once per segment of the field. */
  children: (segment: DateSegment) => JSX.Element;

  /** Appended after the slot classes; the function form gets the same accessors. */
  className?: string | ((values: DateInputGroupInputRenderProps) => string | undefined);

  /** The Input's style; the function form gets the same accessors. */
  style?: StyleProp<ViewStyle> | ((values: DateInputGroupInputRenderProps) => StyleProp<ViewStyle>);

  /**
   * The field's key: `start` / `end` in a range picker. NSH has no Provider
   * slots; the Input passes it to the field state, and it identifies this side
   * for R-012's inner padding.
   */
  slot?: string;

  /** An identifier for UI tests. */
  testID?: string;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** The name other elements refer to. */
  nativeID?: string;

  /** The group role; `group` by default, as React Aria's `DateInput` renders an inner `Group`. */
  role?: "group" | "region" | "presentation";

  /** Accepted, no effect: NSH cannot replace a host element. */
  render?: unknown;

  /** No `ref` upstream either: `DateInputGroupInputProps` does not declare one. */
  ref?: undefined;

  /** Any other DOM / global attribute HeroUI accepts; no effect here (D18). */
  [key: string]: unknown;
}

/* -------------------------------------------------------------------------------------------------
 * Input
 * -----------------------------------------------------------------------------------------------*/

/**
 * DateInputGroup.Input / DateInputGroupInput: the row of segments.
 *
 * It reads the field state its owner provides and creates one when rendered on
 * its own (React Aria's standalone `DateInput`), then calls the `children`
 * render function once per segment. Its hover and focus-within are its own:
 * the stylesheet's second `Group` around the segments only sees this subtree,
 * so an affix hover or a trigger's focus inside the Suffix does not light it
 * (port sheet §2).
 *
 * Built on the core `View`, not on nsh/base `Input` or `TimeField`: those fix a
 * single text box or a fixed four-segment clock, and cannot host React Aria's
 * independently focusable spinbutton segments (criteria B3 / B4, port sheet §3).
 */
export function DateInputGroupInput(props: DateInputGroupInputProps): JSX.Element {
  const [local] = split(props, [
    "children",
    "className",
    "style",
    "slot",
    "testID",
    "id",
    "nativeID",
    "role",
    "render",
    "ref",
  ] as const);

  const group = DateInputGroupContext();
  const inheritedField = DateInputGroupFieldContext();

  // A standalone Input owns its field state, as React Aria's `DateInput` does
  // when no DateField provides one; a provided state wins.
  const field: DateFieldState = inheritedField ?? createDateFieldState();

  // The one read of `props.children`: the function is stored, and each segment
  // calls it once inside the field provider at the placement.
  const renderSegment = computed(() => local.children);

  const isDisabled = () => field.isDisabled(local.slot);
  const isInvalid = () => field.isInvalid(local.slot);

  // The Input's own `isFocusWithin` is the field's focused segment for this
  // slot (port sheet §2); segments live here and a Suffix trigger does not.
  const isFocusWithin = () => field.focusedSegment(local.slot) != null;

  const hovered = signal(false);

  const isHovered = () => hovered() && !isDisabled();
  const isFocusVisible = () => isFocusWithin() && group.isKeyboard();

  const renderProps: DateInputGroupInputRenderProps = {
    isHovered,
    isFocusWithin,
    isFocusVisible,
    isDisabled,
    isInvalid,
  };

  const resolvedClassName = () => {
    const value = local.className;

    return typeof value === "function" ? value(renderProps) : value;
  };

  const resolvedStyle = () => {
    const value = local.style;

    return typeof value === "function" ? value(renderProps) : value;
  };

  // --- Classes (R-009 … R-012, R-032) ---------------------------------------
  const classes = computed(() => {
    const parts = [group.slots().input()];

    // R-010: `.date-input-group:has([data-slot=date-input-group-prefix]) .input`
    // → `rounded-s-none ps-2`; the Prefix registers itself with the group.
    if (group.hasPrefix()) {
      parts.push("rounded-s-none ps-2");
    }

    // R-011: the same for the Suffix → `rounded-e-none pe-2`.
    if (group.hasSuffix()) {
      parts.push("rounded-e-none pe-2");
    }

    // R-012: a range separator inside the group narrows the two sides:
    // `flex-none pe-0` for `slot="start"`, `ps-0` for `slot="end"`.
    if (group.hasRangeSeparator()) {
      if (local.slot === "start") {
        parts.push("flex-none pe-0");
      } else if (local.slot === "end") {
        parts.push("ps-0");
      }
    }

    const own = resolvedClassName() ?? "";

    return [...parts, own].filter((part) => part.length > 0).join(" ");
  });

  const role = computed(() => {
    const value = local.role ?? "group";

    return value === "presentation" ? "none" : value;
  });

  // A press on the padding (not on a segment) moves the focus like React Aria's
  // `useDatePickerGroup`: previous segment, or the last one when none is
  // focused. NSH does not focus a view on press, so the state's registered
  // element does it.
  const handlePress = () => {
    if (isDisabled()) {
      return;
    }

    group.setPointerModality();
    field.focusAdjacent(-1);
  };

  return (
    <DateInputGroupFieldContext.Provider value={field}>
      <View
        role={role()}
        nativeID={local.id ?? local.nativeID}
        testID={local.testID}
        accessibilityState={isDisabled() ? { disabled: true } : undefined}
        class={classes()}
        style={resolvedStyle()}
        onMouseEnter={() => hovered.set(true)}
        onMouseLeave={() => hovered.set(false)}
        onPressDown={handlePress}
        onPress={handlePress}
      >
        <Each of={field.segments(local.slot)} key="index">
          {(segment) => {
            const render = renderSegment();

            return typeof render === "function"
              ? (render as (value: DateSegment) => JSX.Element)(createLiveSegment(segment))
              : null;
          }}
        </Each>
      </View>
    </DateInputGroupFieldContext.Provider>
  );
}
