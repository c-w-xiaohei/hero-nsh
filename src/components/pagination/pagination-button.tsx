import type { AccessibilityState, Bounds, JSX } from "nsh";
import { computed, createAnimatedValue, reduceMotion, View } from "nsh";

import { createInput } from "../../primitives/environment";
import {
  createPressFeedback,
  PressableFeedbackContext,
  type PressableFeedbackContextValue,
} from "../../primitives/pressable";
import { renderChildren } from "./pagination-children";
import { PaginationContext } from "./pagination-context";
import type { PaginationButtonProps } from "./pagination-button-props";
import { createPaginationPressable } from "./create-pagination-pressable";
import type { PaginationRenderProps } from "./create-pagination-pressable";
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

  // A-002: the press-feedback seam, gated on `input() === "touch"` and the
  // pressable's blocked flags — under a pointer environment `pressDown` /
  // `pressUp` only forward `onPressChange` and `hitSlop()` stays `undefined`,
  // so the desktop chain below is untouched. `createInput()` resolves in this
  // owner scope (an `EnvironmentScope` remount re-creates the part).
  const input = createInput();
  const feedback = createPressFeedback({
    enabled: () => input() === "touch" && !pressable.isBlocked(),
  });

  // The seam's read half for probes and overlay parts: `PaginationContext`'s
  // `slots` shape is unchanged (sheet §2 A-003), so the channels travel in a
  // `PressableFeedbackContext` provider around the part's children — the same
  // carrier Disclosure's trigger uses. No Highlight/Ripple mounts by default.
  const feedbackValue: PressableFeedbackContextValue = {
    isPressed: feedback.isPressed,
    pressed: feedback.pressed,
    bounds: feedback.bounds,
    pressOrigin: feedback.pressOrigin,
    scale: feedback.scale,
    highlightOpacity: createAnimatedValue(0),
    rippleProgress: createAnimatedValue(0),
    enabled: () => input() === "touch" && !pressable.isBlocked(),
    hitSlop: feedback.hitSlop,
    isAllAnimationsDisabled: () => false,
  };

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

  // A-002: the seam hooks the host's press-down behind the pressable's chain
  // (a blocked press early-returns inside `handlePressDown`, and the gated
  // seam records nothing either way) and its press-up at the chain's head —
  // release and cancel share the one `onPressUp`, so the seam must unwind
  // before the callers hear the end.
  const handlePressDown = (event: Parameters<typeof pressable.handlers.onPressDown>[0]) => {
    pressable.handlers.onPressDown(event);
    feedback.pressDown(event);
  };

  const handlePressUp = (event: Parameters<typeof pressable.handlers.onPressUp>[0]) => {
    feedback.pressUp(event);
    pressable.handlers.onPressUp(event);
  };

  // A-002: `bounds` feeds `hitSlop` and `scale`, so the seam reads the layout
  // before the caller's `onLayout`, which stays last in the chain.
  const handleLayout = (event: { bounds: Bounds }) => {
    feedback.layout(event);
    props.onLayout?.(event);
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
      // A-002: `scale` owns the transform channel under touch (1 under
      // pointer); the `input` axis keeps every `active:scale-*` out of the
      // touch class output, so nothing else writes the same property.
      style={[
        { scale: feedback.scale },
        { transitionProperty: transitionProperty() },
        resolvedStyle(),
      ]}
      onPress={pressable.handlers.onPress}
      onPressDown={handlePressDown}
      onPressUp={handlePressUp}
      onMouseEnter={pressable.handlers.onMouseEnter}
      onMouseLeave={pressable.handlers.onMouseLeave}
      onMouseMove={props.onMouseMove}
      onContextMenu={props.onContextMenu}
      onFocus={pressable.handlers.onFocus}
      onBlur={pressable.handlers.onBlur}
      // A-002: the view-prop half of the hit area — the seam's computed slop,
      // `undefined` while gated off or already at the 44 pt target. The part
      // never sets a literal and never grows one as a prop.
      hitSlop={feedback.hitSlop()}
      onLayout={handleLayout}
    >
      <PressableFeedbackContext.Provider value={feedbackValue}>
        <PaginationButtonContent renderProps={renderProps}>
          {props.children}
        </PaginationButtonContent>
      </PressableFeedbackContext.Provider>
    </View>
  );
}

/**
 * The children half of `PaginationButtonRoot`, mounted inside
 * `PressableFeedbackContext.Provider`. `props.children` is a lazy accessor:
 * whichever component invokes it owns the scope its descendants are created
 * in. Resolving it here — under the provider — is what lets a child reading
 * `PressableFeedbackContext` (a seam probe, a `PressableFeedback.Scale` /
 * `Highlight` / `Ripple` overlay part) see the live seam value instead of
 * `RESTING_PRESS_FEEDBACK`; resolving it in `PaginationButtonRoot`'s own
 * scope, above the provider, binds every child to the default.
 */
function PaginationButtonContent(props: {
  children?: JSX.Element | ((values: PaginationRenderProps) => JSX.Element);
  renderProps: PaginationRenderProps;
}): JSX.Element {
  // The single read of `props.children`, through a computed, rendered at the
  // placement so a signal inside a child keeps updating (research 4.1 / 4.6).
  const children = computed(() => props.children);

  const content = children();

  // D17: a function that takes arguments is the HeroUI render prop; the
  // parameter object holds accessors. A zero-argument function is NSH's
  // reactive child and goes through `renderChildren`.
  if (typeof content === "function" && content.length >= 1) {
    return renderChildren(
      (content as (values: PaginationRenderProps) => JSX.Element)(props.renderProps),
    );
  }

  return renderChildren(content as JSX.Element);
}
