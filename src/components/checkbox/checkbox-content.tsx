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
import { DescriptionContext } from "../description/context";
import { FieldErrorContext } from "../field-error/context";
import {
  FALLBACK_CHECKBOX_CONTEXT,
  type CheckboxButtonRenderProps,
  CheckboxContext,
} from "./checkbox-context";
import { checkboxVariants } from "./checkbox.styles";
import { renderChildren } from "./render-children";

/* -------------------------------------------------------------------------------------------------
 * Render props
 * -----------------------------------------------------------------------------------------------*/

export type { CheckboxButtonRenderProps } from "./checkbox-context";

/* -------------------------------------------------------------------------------------------------
 * Checkbox Content
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Checkbox.Content`: HeroUI 3.2.7's `CheckboxContentProps`, which
 * is React Aria Components' `CheckboxButton` (a `<label>` wrapping a hidden
 * `<input type="checkbox">`) plus the hover events.
 *
 * The component carries the role, the accessibility name and description, the
 * checked state and every interaction signal, because NSH has no hidden
 * `<input>` to put them on (port sheet §2, §5).
 */
export interface CheckboxContentProps
  extends Omit<ViewProps, "children" | "class" | "style" | "ref"> {
  /**
   * The clickable face's content: an element, or a render prop called once with
   * the button state (D17). Bare strings and numbers become `Text` at the
   * single read, or NSH would not draw them.
   */
  children?: JSX.Element | ((values: CheckboxButtonRenderProps) => JSX.Element);

  /** Appended after the variant classes; later classes win. Function form gets the same accessors. */
  className?: string | ((values: CheckboxButtonRenderProps) => string | undefined);

  /** Style of the clickable face; function form gets the same accessors. */
  style?: StyleProp<ViewStyle> | ((values: CheckboxButtonRenderProps) => StyleProp<ViewStyle>);

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

  /** The press began. HeroUI puts this on the field root; accepted here too. */
  onPressStart?: (e: PressEvent) => void;

  /** The press ended. */
  onPressEnd?: (e: PressEvent) => void;

  /** Every press-start / press-end transition. */
  onPressChange?: (isPressed: boolean) => void;

  /** A completed activation, after the selection changed. */
  onClick?: (e: PressEvent) => void;

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

export function CheckboxContent(props: CheckboxContentProps): JSX.Element {
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
    "onPressStart",
    "onPressEnd",
    "onPressChange",
    "onClick",
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

  const ctx = CheckboxContext() ?? FALLBACK_CHECKBOX_CONTEXT;

  // `checkbox.css:9-14` gives the indented help-text classes to the field
  // root's *direct* Description / FieldError children only (`& > …`); the
  // disabled dim (`checkbox.css:24-28`) is descendant-scoped. A Description
  // nested inside the Content — the FeaturesAndAddOns story, upstream
  // `checkbox.stories.tsx:366-369` — therefore keeps only the dim. NSH has no
  // `>` selector, so the Content shadows the two contexts with the same
  // registration and a narrower `partClass`.
  const descriptionContext = DescriptionContext();
  const fieldErrorContext = FieldErrorContext();

  const nestedPartClass = () => (ctx.isDisabled() ? "opacity-50" : undefined);

  const nestedDescriptionState = descriptionContext
    ? { ...descriptionContext, partClass: nestedPartClass }
    : undefined;

  const nestedFieldErrorState = fieldErrorContext
    ? { ...fieldErrorContext, partClass: nestedPartClass }
    : undefined;

  // The Content is the pressable face, so a caller may put HeroUI's press
  // callbacks here instead of on the root. They are reported back through the
  // context, which also lets a Label press (reported by the root's
  // `focusField`, which never reaches this view) reach the same callbacks.
  ctx.setContentPressHandlers({
    onPress: (event) => local.onPress?.(event),
    onPressStart: (event) => local.onPressStart?.(event),
    onPressUp: (event) => local.onPressUp?.(event),
    onPressEnd: (event) => local.onPressEnd?.(event),
    onPressChange: (isPressed) => local.onPressChange?.(isPressed),
    onClick: (event) => local.onClick?.(event),
  });

  cleanup(() => ctx.setContentPressHandlers(undefined));

  // The button-level render props: the field state plus the signals this part
  // originates (port sheet §1). All accessors, per D17.
  const renderProps: CheckboxButtonRenderProps = {
    isSelected: ctx.isSelected,
    isIndeterminate: ctx.isIndeterminate,
    isDisabled: ctx.isDisabled,
    isReadOnly: ctx.isReadOnly,
    isInvalid: ctx.isInvalid,
    isRequired: ctx.isRequired,
    isHovered: ctx.isHovered,
    isPressed: ctx.isPressed,
    isFocused: ctx.isFocused,
    isFocusVisible: ctx.isFocusVisible,
  };

  // One read of `children`, shared by the accessible-name fallback and the
  // placement (common rules: a second read would build new native views, and a
  // plain capture would freeze `<Checkbox.Content>{state()}</Checkbox.Content>`).
  const children = computed(() => local.children);

  // The content, resolved once: a function child with parameters is the HeroUI
  // render prop and is called here, untracked, so a signal read in its body
  // does not rebuild the subtree (D17).
  const content = computed(() => {
    const value = children();

    if (typeof value === "function" && value.length >= 1) {
      return untracked(() =>
        (value as (values: CheckboxButtonRenderProps) => JSX.Element)(renderProps),
      );
    }

    return value as JSX.Element;
  });

  // The text a bare-string child contributes to the accessible name. HeroUI's
  // `<label>` names its hidden input with its whole text content; NSH cannot
  // read a rendered view's text, so the literal strings among the children are
  // the part that can be known here (the default story puts its text in the
  // Content as a bare string).
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

  // Description first, then the error message, as two `aria-describedby` ids
  // would read.
  const accessibilityHint = computed(() => {
    if (local.accessibilityHint !== undefined) {
      return local.accessibilityHint;
    }

    const parts = [ctx.descriptionText(), ctx.errorText()].filter(
      (part): part is string => typeof part === "string" && part.length > 0,
    );

    return parts.length > 0 ? parts.join(" ") : undefined;
  });

  // The hidden input's `aria-checked`: ARIA reports a mixed checkbox as
  // `"mixed"` (the native input's `indeterminate` in a screen reader).
  const accessibilityState = computed<AccessibilityState>(() => ({
    ...(local.accessibilityState ?? {}),
    checked: ctx.isIndeterminate() ? "mixed" : ctx.isSelected(),
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
      checkboxVariants({ variant: ctx.variant() }).content(),
      // R-037: `cursor-[inherit]` in the stylesheet has no NSH equivalent; the
      // part names the cursor itself, and the disabled state keeps the root's
      // `not-allowed`.
      ctx.isDisabled() ? "cursor-not-allowed" : "cursor-pointer",
      resolvedClassName() ?? "",
    ]
      .filter((part) => part.length > 0)
      .join(" "),
  );

  // Return and Space activation reach the same press handlers a pointer press
  // does, and `PressEvent` carries only a position; `isKeyboardPress` reads it.
  // React Aria sets the modality from the event that caused it, so a keyboard
  // activation keeps the ring and any other press drops it (R-023).
  const notePress = (event: PressEvent) => {
    if (isKeyboardPress(event)) {
      ctx.setKeyboardModality();
    } else {
      ctx.setPointerModality();
    }
  };

  const handlePressDown = (event: PressEvent) => {
    // A read-only press dispatches no press callback upstream. The held raw
    // signal still starts, so the Control's `:active` paint is unchanged; the
    // callbacks are gated in the root.
    if (ctx.isDisabled() || ctx.isReadOnly()) {
      ctx.pressStart(event);

      return;
    }

    notePress(event);
    ctx.pressStart(event);
    local.onPressDown?.(event);
  };

  const handlePressUp = (event: PressEvent) => {
    ctx.pressUp(event);
    // `onPressUp` fires before `onPress`; the press is over even when the
    // release does not become a press (a release outside).
    ctx.pressEnd(event);
  };

  const handlePress = (event: PressEvent) => {
    // Read-only: no callbacks, no toggle, no validation, no focus. Only the
    // held paint ends.
    if (ctx.isDisabled() || ctx.isReadOnly()) {
      ctx.pressEnd(event);

      return;
    }

    notePress(event);
    // The release already ended the press in `handlePressUp`; this is a no-op
    // then, and the guard keeps a backend that only reports `onPress` correct.
    ctx.pressEnd(event);

    // Upstream's input fires `onPress`, then the value changes, then the click
    // callback.
    ctx.press(event);

    // The one place the value changes: the Label's `focusField` goes through
    // the same state, and the root blocks disabled / read-only and commits
    // validation.
    ctx.state.toggle();

    // Pressing a `<label>` focuses its control; NSH's pointer press does not
    // focus a view, so the Content asks for it, as a pointer interaction (no
    // ring). Without this, a click followed by Space does nothing.
    if (!isKeyboardPress(event)) {
      ctx.focusContentFromPointer();
    }

    ctx.click(event);
  };

  const handleMouseEnter = (event: NshMouseEvent) => {
    local.onMouseEnter?.(event);

    // React Aria's `useHover({ isDisabled: isDisabled || isReadOnly })`:
    // read-only fields do not hover either.
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
    // Upstream cancels it on pointer leave too (`usePress`'s `onPointerLeave`
    // ends the press without calling `onPress`), so the root's `onPressEnd` and
    // `onPressChange(false)` still fire with the pointer's last position.
    ctx.pressEnd({
      position: event.position,
      pagePosition: event.pagePosition,
      modifiers: event.modifiers,
      clickCount: 1,
    });

    if (!ctx.isHovered()) {
      return;
    }

    ctx.setHovered(false);
    local.onHoverEnd?.(event);
    local.onHoverChange?.(false);
  };

  // This item's identity in the group's focus-within set.
  const focusToken = {};
  let contentFocused = false;

  const handleFocus = () => {
    // R-023: the Label's `focusField` records the pointer before it focuses,
    // and that marker must survive this handler; any other focus (Tab) is the
    // keyboard arriving.
    if (!ctx.consumeFocusFromPointer()) {
      ctx.setKeyboardModality();
    }

    if (contentFocused) {
      return;
    }

    contentFocused = true;
    ctx.focusIn(focusToken);
    local.onFocus?.();
  };

  const handleBlur = () => {
    if (!contentFocused) {
      return;
    }

    contentFocused = false;
    // The root's `onBlur` / `onFocusChange(false)`. Validation does not commit
    // on blur: React Aria listens to `change` / `invalid` only.
    ctx.focusOut(focusToken);
    local.onBlur?.();
  };

  const handleRef = (node: ViewRef) => {
    ctx.setContentRef(node);
    local.ref?.(node);
  };

  // A Content unmounting while focused must leave the group's focus-within set
  // and the root's focus state, or the group would stay "focused" for ever.
  cleanup(() => {
    if (contentFocused) {
      contentFocused = false;
      ctx.focusOut(focusToken);
    }

    ctx.setContentRef(undefined);
  });

  return (
    <View
      {...rest}
      ref={handleRef}
      role="checkbox"
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
      <DescriptionContext.Provider value={nestedDescriptionState}>
        <FieldErrorContext.Provider value={nestedFieldErrorState}>
          {renderChildren(content() as JSX.Element)}
        </FieldErrorContext.Provider>
      </DescriptionContext.Provider>
    </View>
  );
}
