import type {
  AccessibilityState,
  JSX,
  MouseEvent as NshMouseEvent,
  PressEvent,
  StyleProp,
  ViewProps,
  ViewRef,
  ViewStyle,
} from "nsh";
import { cleanup, computed, split, untracked, View } from "nsh";

import { isKeyboardPress } from "../../primitives/create-interaction-modality";
import { renderChildren } from "./render-children";
import {
  FALLBACK_SWITCH_CONTEXT,
  type SwitchButtonRenderProps,
  SwitchContext,
} from "./switch-context";
import { switchVariants } from "./switch.styles";

/* -------------------------------------------------------------------------------------------------
 * Render props
 * -----------------------------------------------------------------------------------------------*/

export type { SwitchButtonRenderProps } from "./switch-context";

/* -------------------------------------------------------------------------------------------------
 * Switch Content
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Switch.Content`: HeroUI 3.2.7's `SwitchContentProps`, which is
 * React Aria Components' `SwitchButton` (a `<label>`) plus the hover events.
 *
 * The component carries the role, the accessibility name and description, the
 * checked state and every interaction signal, because NSH has no hidden
 * `<input>` to put them on (port sheet §2, §5).
 */
export interface SwitchContentProps
  extends Omit<ViewProps, "children" | "class" | "style" | "ref"> {
  /**
   * The clickable face's content: an element, or a render prop called once
   * with the button state (D17). Bare strings and numbers become `Text` at the
   * single read, or NSH would not draw them.
   */
  children?: JSX.Element | ((values: SwitchButtonRenderProps) => JSX.Element);

  /** Appended after the variant classes; later classes win. Function form gets the same accessors. */
  className?: string | ((values: SwitchButtonRenderProps) => string | undefined);

  /** Style of the clickable face; function form gets the same accessors. */
  style?: StyleProp<ViewStyle> | ((values: SwitchButtonRenderProps) => StyleProp<ViewStyle>);

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** The clickable face's view, as `ComponentPropsWithRef` gives upstream. */
  ref?: (node: ViewRef) => void;

  /** The pointer entered the clickable face (off while disabled or read-only). */
  onHoverStart?: (e: NshMouseEvent) => void;

  /** The pointer left the clickable face. */
  onHoverEnd?: (e: NshMouseEvent) => void;

  /** Both hover transitions, as React Aria's `useHover` reports them. */
  onHoverChange?: (isHovered: boolean) => void;

  /** Accepted, no effect: NSH has one kind of host element. */
  elementType?: string;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect: NSH cannot replace a host element. */
  render?: unknown;

  /** Names the clickable face directly; it wins over a registered Label text. */
  "aria-label"?: string;
  /** Accepted, no effect: NSH has no cross-element references. */
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-details"?: string;
  "aria-errormessage"?: string;
}

export function SwitchContent(props: SwitchContentProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "id",
    "nativeID",
    "onPress",
    "onPressDown",
    "onPressUp",
    "onFocus",
    "onBlur",
    "onMouseEnter",
    "onMouseLeave",
    "onHoverStart",
    "onHoverEnd",
    "onHoverChange",
    "accessibilityLabel",
    "accessibilityHint",
    "accessibilityState",
    "accessibilityElementsHidden",
    "elementType",
    "slot",
    "render",
    "aria-label",
    "aria-labelledby",
    "aria-describedby",
    "aria-details",
    "aria-errormessage",
  ] as const);

  const ctx = SwitchContext() ?? FALLBACK_SWITCH_CONTEXT;

  // The button-level render props: the field state plus the signals this part
  // originates (port sheet §1). All accessors, per D17.
  const renderProps: SwitchButtonRenderProps = {
    isSelected: ctx.isSelected,
    isDisabled: ctx.isDisabled,
    isReadOnly: ctx.isReadOnly,
    isInvalid: ctx.isInvalid,
    isRequired: ctx.isRequired,
    isHovered: ctx.isHovered,
    isPressed: ctx.isPressed,
    isFocused: ctx.isFocused,
    isFocusVisible: ctx.isFocusVisible,
    state: ctx.state,
  };

  // One read of `children`, shared by the accessible-name fallback and the
  // placement (common rules: a second read would build new native views, and a
  // plain capture would freeze `<Switch.Content>{state()}</Switch.Content>`).
  const children = computed(() => local.children);

  // The content, resolved once: a function child with parameters is the HeroUI
  // render prop and is called here, untracked, so a signal read in its body
  // does not rebuild the subtree (D17). The resolved value feeds both the
  // accessible-name text and the placement, so `props.children` is still read
  // once and the render prop still runs once.
  const content = computed(() => {
    const value = children();

    if (typeof value === "function" && value.length >= 1) {
      return untracked(() =>
        (value as (values: SwitchButtonRenderProps) => JSX.Element)(renderProps),
      );
    }

    // Not the render-prop form: any other value is content, including the
    // zero-argument reactive child `renderChildren` calls at the placement.
    return value as JSX.Element;
  });

  // The text a bare-string child contributes to the accessible name. HeroUI's
  // `<label>` names its hidden input with its whole text content; NSH cannot
  // read a rendered view's text, so the literal strings among the children are
  // the part that can be known here (port sheet §1: the default story puts the
  // text in the Content as a bare string).
  const textLabel = computed(() => {
    const collect = (node: JSX.Element): string => {
      if (typeof node === "string" || typeof node === "number") {
        return String(node);
      }

      if (Array.isArray(node)) {
        return node.map((child) => collect(child as JSX.Element)).join(" ");
      }

      return "";
    };

    const text = collect(content() as JSX.Element).trim();

    return text.length > 0 ? text : undefined;
  });

  // The accessible name: an explicit `aria-label` (root or content) wins over
  // the text a Label inside the field registered — the stand-in for React
  // Aria's `labelProps` pointing at a `<label for>` — and a bare-string child
  // names the face when no Label was registered.
  const accessibilityLabel = computed(
    () =>
      local.accessibilityLabel ??
      local["aria-label"] ??
      ctx.ariaLabel() ??
      ctx.labelText() ??
      textLabel(),
  );

  // R-005 / the `descriptionProps` / `errorMessageProps` pair: description
  // first, then the error message, as two `aria-describedby` ids would read.
  const accessibilityHint = computed(() => {
    if (local.accessibilityHint !== undefined) {
      return local.accessibilityHint;
    }

    const parts = [ctx.descriptionText(), ctx.errorText()].filter(
      (part): part is string => typeof part === "string" && part.length > 0,
    );

    return parts.length > 0 ? parts.join(" ") : undefined;
  });

  const accessibilityState = computed<AccessibilityState>(() => ({
    ...(local.accessibilityState ?? {}),
    checked: ctx.isSelected(),
    disabled: ctx.isDisabled(),
  }));

  const resolvedClassName = () => {
    const value = local.className;

    return typeof value === "function" ? value(renderProps) : value;
  };

  const resolvedStyle = () => {
    const value = local.style;

    return typeof value === "function" ? value(renderProps) : value;
  };

  const classes = computed(() =>
    [
      switchVariants({ size: ctx.size() }).content(),
      // R-032 / R-048: `cursor-[inherit]` in the stylesheet has no NSH
      // equivalent; the part names the cursor itself, and the disabled state
      // keeps the root's `not-allowed`.
      ctx.isDisabled() ? "cursor-not-allowed" : "cursor-pointer",
      resolvedClassName() ?? "",
    ]
      .filter((part) => part.length > 0)
      .join(" "),
  );

  // V4: Return and Space activation reach the same press handlers a pointer
  // press does, and `PressEvent` carries only a position; `isKeyboardPress`
  // reads it. React Aria sets the modality from the event that caused it, so a
  // keyboard activation keeps the ring and any other press drops it (R-026).
  const notePress = (event: PressEvent) => {
    if (isKeyboardPress(event)) {
      ctx.setKeyboardModality();
    } else {
      ctx.setPointerModality();
    }
  };

  const handlePressDown = (event: PressEvent) => {
    notePress(event);
    ctx.setPressed(true);
    local.onPressDown?.(event);
  };

  const handlePressUp = (event: PressEvent) => {
    ctx.setPressed(false);
    local.onPressUp?.(event);
  };

  const handlePress = (event: PressEvent) => {
    notePress(event);
    // The one place the value changes: the Label's `focusField` goes through
    // the same state, and `createToggleState` blocks disabled / read-only.
    ctx.state.toggle();
    ctx.setPressed(false);
    local.onPress?.(event);
  };

  const handleMouseEnter = (event: NshMouseEvent) => {
    local.onMouseEnter?.(event);

    // React Aria's `useHover({ isDisabled: isDisabled || isReadOnly })`:
    // read-only fields do not hover either (R-027).
    if (ctx.isDisabled() || ctx.isReadOnly() || ctx.isHovered()) {
      return;
    }

    ctx.setHovered(true);
    local.onHoverStart?.(event);
    local.onHoverChange?.(true);
  };

  const handleMouseLeave = (event: NshMouseEvent) => {
    local.onMouseLeave?.(event);

    // NSH has no press-cancel event: a press that leaves the face ends here.
    ctx.setPressed(false);

    if (!ctx.isHovered()) {
      return;
    }

    ctx.setHovered(false);
    local.onHoverEnd?.(event);
    local.onHoverChange?.(false);
  };

  const handleFocus = () => {
    ctx.setFocused(true);

    // R-026: the Label's `focusField` records the pointer before it focuses,
    // and that marker must survive this handler; any other focus (Tab) is the
    // keyboard arriving.
    if (!ctx.consumeFocusFromPointer()) {
      ctx.setKeyboardModality();
    }

    local.onFocus?.();
  };

  const handleBlur = () => {
    ctx.setFocused(false);
    // React Aria commits validation when the control loses focus.
    ctx.commitValidation();
    local.onBlur?.();
  };

  const handleRef = (node: ViewRef) => {
    ctx.setContentRef(node);
    local.ref?.(node);
  };

  cleanup(() => ctx.setContentRef(undefined));

  return (
    <View
      {...rest}
      ref={handleRef}
      role="switch"
      nativeID={local.id ?? local.nativeID}
      disabled={ctx.isDisabled()}
      focusable={ctx.focusable()}
      accessibilityLabel={accessibilityLabel()}
      accessibilityHint={accessibilityHint()}
      accessibilityState={accessibilityState()}
      accessibilityElementsHidden={local.accessibilityElementsHidden}
      class={classes()}
      style={resolvedStyle()}
      onPressDown={handlePressDown}
      onPressUp={handlePressUp}
      onPress={handlePress}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      {renderChildren(content() as JSX.Element)}
    </View>
  );
}
