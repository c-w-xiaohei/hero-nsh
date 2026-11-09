import type { AccessibilityState, JSX } from "nsh";
import { computed, reduceMotion, View } from "nsh";

import { renderChildren } from "./pagination-children";
import { PaginationContext } from "./pagination-context";
import type { PaginationButtonProps } from "./pagination-button-props";
import { createPaginationPressable } from "./create-pagination-pressable";
import { toAccessibilityRole } from "./pagination-roles";
import { paginationNavClasses } from "./pagination.styles";

/** The internal shape the three pressable parts hand to their one root. */
export interface PaginationButtonRootProps extends PaginationButtonProps {
  /** `Link`'s current-page flag; `false` / absent on `Previous` and `Next`. */
  isActive?: boolean;

  /** Adds the nav geometry of R-017 / R-021 / R-027 after the `link` slot. */
  nav?: boolean;
}

function foldBoolean(value: boolean | "true" | "false" | undefined): boolean | undefined {
  if (value === "true") return true;
  if (value === "false") return false;

  return value;
}

function foldMixed(
  value: boolean | "true" | "false" | "mixed" | undefined,
): boolean | "mixed" | undefined {
  if (value === "true") return true;
  if (value === "false") return false;

  return value;
}

function foldCurrent(
  value: boolean | "true" | "false" | "page" | "step" | "location" | "date" | "time" | undefined,
): AccessibilityState["current"] {
  if (value === "true") return true;
  if (value === "false") return false;

  return value;
}

/**
 * The view behind `Pagination.Link`, `Pagination.Previous` and
 * `Pagination.Next`. HeroUI renders each on React Aria's `Button`; nsh/base's
 * `Button` cannot carry what that surface needs (a press payload, hover / focus
 * channels, and functional `children` / `className` / `style`), so all three
 * are core `View`s sharing one pressable (port sheet §3, criterion B3).
 *
 * They are not built on this repo's `ButtonRoot` either: pagination's buttons
 * have their own geometry and class table, and wrapping would drag in the
 * button's height, padding and seven variants only to override them.
 *
 * This component is internal: the three parts are the public face, and only
 * they are exported from the index.
 */
export function PaginationButtonRoot(props: PaginationButtonRootProps): JSX.Element {
  const ctx = PaginationContext();
  const pressable = createPaginationPressable(props);
  const renderProps = pressable.renderProps;

  const resolvedClassName = () => {
    const className = props.className;

    return typeof className === "function" ? className(renderProps) : className;
  };

  const classes = computed(() => {
    const slots = ctx?.slots();

    // R-015: the `[data-active="true"]` block puts `--default` behind the
    // current page, and hover / pressed still use `--default-hover` (R-013 /
    // R-014). With no Provider the slot classes are absent, exactly as
    // upstream's `slots?.link()`.
    const active = props.isActive ? "bg-default" : undefined;

    return [
      slots?.link(),
      props.nav ? paginationNavClasses(ctx?.size()) : undefined,
      active,
      resolvedClassName(),
    ]
      .filter((part): part is string => typeof part === "string" && part.length > 0)
      .join(" ");
  });

  const resolvedStyle = () => {
    const style = props.style;

    return typeof style === "function" ? style(renderProps) : style;
  };

  // R-008: the transition names `transform` at 250ms `ease-smooth` and
  // background / box shadow at 100ms `ease-out` upstream. NSH takes one
  // property list, one duration (the class `duration-[250ms]`) and one curve
  // (`ease-smooth`), so the list is inline — its only owner — and reduced
  // motion is `"none"` (R-009).
  const transitionProperty = () =>
    reduceMotion() ? "none" : "transform, background-color, box-shadow";

  const accessibilityState = computed<AccessibilityState>(() => {
    const own = props.accessibilityState ?? {};

    return {
      ...own,
      disabled: pressable.isDisabled() || own.disabled === true,
      expanded: foldBoolean(props["aria-expanded"]) ?? own.expanded,
      pressed: foldMixed(props["aria-pressed"]) ?? own.pressed,
      checked: foldMixed(props["aria-checked"]) ?? own.checked,
      selected: foldBoolean(props["aria-selected"]) ?? own.selected,
      busy: foldBoolean(props["aria-busy"]) ?? own.busy,
      // Link's `aria-current={isActive ? "page" : undefined}`; the caller's own
      // attribute wins, as the later `{...props}` spread does upstream.
      current:
        foldCurrent(props["aria-current"]) ??
        (props.isActive ? ("page" as const) : undefined) ??
        own.current,
    };
  });

  // The single read of `props.children`, through a computed, rendered at the
  // placement so a signal inside a child keeps updating (research 4.1 / 4.6).
  const children = computed(() => props.children);

  const renderContent = () => {
    const content = children();

    // D17: a function that takes arguments is the HeroUI render prop; the
    // parameter object holds accessors. A zero-argument function is NSH's
    // reactive child and goes through `renderChildren`.
    if (typeof content === "function" && content.length >= 1) {
      return renderChildren(
        (content as (values: typeof renderProps) => JSX.Element)(renderProps),
      );
    }

    return renderChildren(content as JSX.Element);
  };

  return (
    <View
      ref={pressable.handleRef}
      testID={props.testID}
      nativeID={props.id ?? props.nativeID}
      tooltip={props.tooltip}
      role={toAccessibilityRole(props.role, "button")}
      disabled={pressable.isDisabled()}
      focusable={props.excludeFromTabOrder === true ? false : undefined}
      accessibilityLabel={props["aria-label"] ?? props.accessibilityLabel}
      accessibilityState={accessibilityState()}
      accessibilityElementsHidden={props["aria-hidden"] ?? props.accessibilityElementsHidden}
      class={classes()}
      // R-011: `status-focused` → the focus ring, shown only while the keyboard
      // is the last interaction (the port has no `:focus-visible`).
      // R-012: `status-disabled` → opacity 0.5, `cursor-not-allowed` and no
      // pointer events. Pending paints the same look because RAC writes
      // `aria-disabled="true"` for it (Button.tsx:172) and pagination.css
      // matches `[aria-disabled="true"]`; `View.disabled` stays on
      // `isDisabled` so a pending part keeps its focus stop (Button.tsx:89-93).
      classList={{
        "ring-2 ring-focus ring-offset-2 ring-offset-background": renderProps.isFocusVisible(),
        "opacity-50 cursor-not-allowed pointer-events-none": pressable.isBlocked(),
      }}
      style={[{ transitionProperty: transitionProperty() }, resolvedStyle()]}
      onPress={pressable.handlers.onPress}
      onPressDown={pressable.handlers.onPressDown}
      onPressUp={pressable.handlers.onPressUp}
      onMouseEnter={pressable.handlers.onMouseEnter}
      onMouseLeave={pressable.handlers.onMouseLeave}
      onMouseMove={props.onMouseMove}
      onContextMenu={props.onContextMenu}
      onFocus={pressable.handlers.onFocus}
      onBlur={pressable.handlers.onBlur}
      onLayout={props.onLayout}
    >
      {renderContent()}
    </View>
  );
}
