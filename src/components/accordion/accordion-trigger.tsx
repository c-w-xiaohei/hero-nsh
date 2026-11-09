import type {
  AccessibilityState,
  Accessor,
  Bounds,
  JSX,
  MouseEvent as NshMouseEvent,
  PressEvent,
  StyleProp,
  ViewRef,
  ViewStyle,
} from "nsh";
import { computed, effect, reduceMotion, signal, split, untracked, View } from "nsh";

import {
  createInteractionModality,
  isKeyboardPress,
} from "../../primitives/create-interaction-modality";
import { renderChildren } from "./children";
import { AccordionContext, AccordionItemContext } from "./accordion-context";

/** The live state HeroUI hands a Trigger's render props (React Aria's `ButtonRenderProps`). */
export interface AccordionTriggerRenderProps {
  isHovered: Accessor<boolean>;
  isPressed: Accessor<boolean>;
  isFocused: Accessor<boolean>;
  isFocusVisible: Accessor<boolean>;
  isDisabled: Accessor<boolean>;
  isPending: Accessor<boolean>;
}

/**
 * The props of `Accordion.Trigger`: HeroUI 3.2.7's `AccordionTriggerProps`,
 * which is React Aria Components' `Button` props.
 *
 * The DOM-only members (`type`, the `form*` family, `name`, `value`, `render`,
 * `slot`, `onKeyDown` / `onKeyUp`) are accepted so code written against HeroUI
 * keeps compiling; NSH has no form submission, no key events on a view and no
 * replaceable element (port sheet §1, §8).
 */
export interface AccordionTriggerProps {
  /** The title and the Indicator, or a render prop called once (D17). */
  children?:
    | JSX.Element
    | ((values: AccordionTriggerRenderProps) => JSX.Element);

  /** Appended after the trigger slot classes; function form gets the accessors. */
  className?:
    | string
    | ((values: AccordionTriggerRenderProps) => string | undefined);

  /** Style of the trigger; function form gets the accessors. */
  style?:
    | StyleProp<ViewStyle>
    | ((values: AccordionTriggerRenderProps) => StyleProp<ViewStyle>);

  /** Disables the trigger on its own, over the group and item flags. */
  isDisabled?: boolean;

  /** HeroUI's pending flag; kept in the render props, it paints nothing here. */
  isPending?: boolean;

  /** Focuses the trigger after it mounts (macOS and the web today). */
  autoFocus?: boolean;

  /** Leaves the trigger out of the Tab order. */
  excludeFromTabOrder?: boolean;

  /** Accepted, no effect: NSH has no form submission. */
  type?: "button" | "submit" | "reset";

  /** Accepted, no effect: NSH has no form submission. */
  form?: string;
  formAction?: string;
  formEncType?: string;
  formMethod?: string;
  formNoValidate?: boolean;
  formTarget?: string;

  /** Accepted, no effect: NSH has no form submission. */
  name?: string;

  /** Accepted, no effect: NSH has no form submission. */
  value?: string;

  /** A completed press: a pointer release over the trigger, or Return / Space. */
  onPress?: (e: PressEvent) => void;

  /** The press went down. */
  onPressStart?: (e: PressEvent) => void;

  /** NSH's own press-down event, beside `onPressStart`. */
  onPressDown?: (e: PressEvent) => void;

  /** The press was released. */
  onPressUp?: (e: PressEvent) => void;

  /** The press ended, after `onPressUp`. */
  onPressEnd?: (e: PressEvent) => void;

  /** Every press-start / press-end transition. */
  onPressChange?: (isPressed: boolean) => void;

  /** A press held for about half a second. */
  onLongPress?: (e: PressEvent) => void;

  /** The completed activation; NSH has no DOM `click`, so this follows `onPress`. */
  onClick?: (e: PressEvent) => void;

  /** The pointer came over the trigger. */
  onHoverStart?: (e: NshMouseEvent) => void;

  /** The pointer left the trigger. */
  onHoverEnd?: (e: NshMouseEvent) => void;

  /** Every hover transition. */
  onHoverChange?: (isHovered: boolean) => void;

  /** NSH's mouse-enter event, beside `onHoverStart`. */
  onMouseEnter?: (e: NshMouseEvent) => void;

  /** NSH's mouse-leave event, beside `onHoverEnd`. */
  onMouseLeave?: (e: NshMouseEvent) => void;

  /** The trigger took the keyboard focus. */
  onFocus?: () => void;

  /** The trigger lost the keyboard focus. */
  onBlur?: () => void;

  /** Every focus transition. */
  onFocusChange?: (isFocused: boolean) => void;

  /** Accepted, no effect: NSH views report no key events (use presses). */
  onKeyDown?: unknown;
  onKeyUp?: unknown;

  /** The trigger's accessible name; also names the Panel. */
  "aria-label"?: string;

  /** Accepted, no effect: NSH has no cross-element references. */
  "aria-labelledby"?: string;

  /** Accepted, no effect: NSH has no cross-element references. */
  "aria-describedby"?: string;

  /** Accepted, no effect: NSH derives it from the item's state. */
  "aria-expanded"?: boolean;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** The name other elements refer to. */
  nativeID?: string;

  /** An identifier for UI tests. */
  testID?: string;

  /** A desktop hover tooltip on the trigger. */
  tooltip?: JSX.Element;

  /** The trigger was laid out. */
  onLayout?: (e: { bounds: Bounds }) => void;

  /** NSH's accessible name, over `aria-label`. */
  accessibilityLabel?: string;

  /** A hint read after the name. */
  accessibilityHint?: string;

  /** Merged into the trigger's accessibility state. */
  accessibilityState?: AccessibilityState;

  /** Hides the trigger from assistive technologies. */
  accessibilityElementsHidden?: boolean;

  /** Accepted, no effect: NSH cannot replace the host element. */
  render?: unknown;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect (D18). */
  [key: `aria-${string}`]: unknown;

  /** Accepted, no effect (D18). */
  [key: `data-${string}`]: unknown;

  /** The trigger view; a callback, as NSH forwards refs. */
  ref?: (node: ViewRef) => void;
}

/**
 * Accordion.Trigger / AccordionTrigger: the heading's button.
 *
 * It is a core `View` with `role="button"`, not nsh/base's `AccordionTrigger`
 * and not its `Button`: the base trigger exposes only class / classList / style
 * and no hover, focus or press-event channel, and HeroUI's
 * `:hover:not([aria-expanded="true"])` background and keyboard focus ring need
 * all three (port sheet §3, criterion B3). The press toggles the item.
 */
export function AccordionTrigger(props: AccordionTriggerProps): JSX.Element | null {
  const [local] = split(props, [
    "children",
    "className",
    "style",
    "isDisabled",
    "isPending",
    "autoFocus",
    "excludeFromTabOrder",
    "type",
    "form",
    "formAction",
    "formEncType",
    "formMethod",
    "formNoValidate",
    "formTarget",
    "name",
    "value",
    "onPress",
    "onPressStart",
    "onPressDown",
    "onPressUp",
    "onPressEnd",
    "onPressChange",
    "onLongPress",
    "onClick",
    "onHoverStart",
    "onHoverEnd",
    "onHoverChange",
    "onMouseEnter",
    "onMouseLeave",
    "onFocus",
    "onBlur",
    "onFocusChange",
    "onKeyDown",
    "onKeyUp",
    "aria-label",
    "aria-labelledby",
    "aria-describedby",
    "aria-expanded",
    "id",
    "nativeID",
    "testID",
    "tooltip",
    "onLayout",
    "accessibilityLabel",
    "accessibilityHint",
    "accessibilityState",
    "accessibilityElementsHidden",
    "render",
    "slot",
    "ref",
  ] as const);

  const accordion = AccordionContext();
  const item = AccordionItemContext();

  if (!accordion || !item) {
    return null;
  }

  /* -------------------------------------------------------------------------------------------
   * State: hover, press and focus are the Trigger's own (port sheet §2); the
   * expanded state is the item's, read from the root's set.
   * ----------------------------------------------------------------------------------------- */
  const hovered = signal(false);
  const pressed = signal(false);
  const focused = signal(false);

  // Input modality decides the focus ring; never inferred from hover.
  const modality = createInteractionModality();

  const isFocusVisible = computed(() => focused() && modality.isKeyboard());
  const isExpanded = item.isExpanded;
  const isSurface = computed(() => accordion.variant() === "surface");
  const isDisabled = computed(() => item.isDisabled() || local.isDisabled === true);
  const isPending = computed(() => local.isPending ?? false);

  const renderProps: AccordionTriggerRenderProps = {
    isHovered: hovered,
    isPressed: pressed,
    isFocused: focused,
    isFocusVisible,
    isDisabled,
    isPending,
  };

  // The Item's `isFocusVisibleWithin` and the Panel's name, registered here
  // because the Trigger owns both.
  item.registerTriggerFocusVisible(isFocusVisible);
  item.registerTriggerLabel(() => local["aria-label"] ?? local.accessibilityLabel);

  /* -------------------------------------------------------------------------------------------
   * Classes: the slot, then the surface position rules (which the caller's
   * class may still override), then the caller's class. The state-dependent
   * ones are `classList`, so a caller's `hover:` / `focus-visible:` variant
   * classes still win by Tailwind's variant order.
   * ----------------------------------------------------------------------------------------- */
  const resolvedClassName = () => {
    const value = local.className;

    return typeof value === "function" ? value(renderProps) : value;
  };

  const resolvedStyle = () => {
    const value = local.style;

    return typeof value === "function" ? value(renderProps) : value;
  };

  const classes = computed(() => {
    const list = [accordion.slots().trigger()];

    // R-034: `.accordion--surface .accordion__item:first-child` →
    // `border-start-start-radius` / `border-start-end-radius` on the trigger.
    // R-035: the last item adds the end radii while it is not expanded (the
    // `:not(:has(trigger[aria-expanded="true"]))` condition).
    if (isSurface()) {
      if (item.isFirst()) {
        list.push("rounded-ss-3xl rounded-se-3xl");
      }

      if (item.isLast() && !isExpanded()) {
        list.push("rounded-es-3xl rounded-ee-3xl");
      }
    }

    const consumer = resolvedClassName();

    if (typeof consumer === "string" && consumer.length > 0) {
      list.push(consumer);
    }

    return list.join(" ");
  });

  const classList = computed(() => {
    const list: Record<string, boolean> = {};

    // R-018: the default hover background, `color-mix(…foreground 3%, …)`
    // normalised to the theme's `bg-foreground/3`; only while the item is not
    // expanded.
    // R-031: the surface variant replaces it with the `default` token.
    // R-019: no media query is needed; NSH reports hover only where a pointer
    // exists.
    if (hovered() && !isExpanded()) {
      if (isSurface()) {
        list["bg-default"] = true;
      } else {
        list["bg-foreground/3"] = true;
      }
    }

    // R-021: `:focus-visible` → `status-focused` (a 2pt page-coloured ring with
    // no offset ring width of its own), only for a keyboard focus.
    if (isFocusVisible()) {
      list["ring-2 ring-focus ring-offset-2 ring-offset-background outline-none"] = true;
    }

    return list;
  });

  /* -------------------------------------------------------------------------------------------
   * Presses, hover, focus
   * ----------------------------------------------------------------------------------------- */
  const notePress = (event: PressEvent) => {
    if (isKeyboardPress(event)) {
      modality.setKeyboardModality();
    } else {
      modality.setPointerModality();
    }
  };

  const handlePressDown = (event: PressEvent) => {
    if (isDisabled()) {
      return;
    }

    notePress(event);
    pressed.set(true);
    local.onPressStart?.(event);
    local.onPressDown?.(event);
    local.onPressChange?.(true);
  };

  const handlePressUp = (event: PressEvent) => {
    if (pressed()) {
      pressed.set(false);
      local.onPressChange?.(false);
    }

    if (isDisabled()) {
      return;
    }

    local.onPressUp?.(event);
    local.onPressEnd?.(event);
  };

  const handlePress = (event: PressEvent) => {
    if (isDisabled()) {
      return;
    }

    notePress(event);

    // One activation entry: the pointer release and the keyboard's Return /
    // Space both arrive here on a focused view. React Aria toggles the keyboard
    // case on key-down instead (port sheet §8, registered difference).
    item.toggle();

    local.onPress?.(event);
    local.onClick?.(event);
  };

  const handleLongPress = (event: PressEvent) => {
    if (isDisabled()) {
      return;
    }

    local.onLongPress?.(event);
  };

  const handleMouseEnter = (event: NshMouseEvent) => {
    local.onMouseEnter?.(event);

    if (isDisabled() || hovered()) {
      return;
    }

    hovered.set(true);
    local.onHoverStart?.(event);
    local.onHoverChange?.(true);
  };

  const handleMouseLeave = (event: NshMouseEvent) => {
    local.onMouseLeave?.(event);

    if (!hovered()) {
      return;
    }

    hovered.set(false);
    local.onHoverEnd?.(event);
    local.onHoverChange?.(false);
  };

  const handleFocus = () => {
    focused.set(true);
    modality.onFocus();
    local.onFocusChange?.(true);
    local.onFocus?.();
  };

  const handleBlur = () => {
    focused.set(false);
    local.onFocusChange?.(false);
    local.onBlur?.();
  };

  /* -------------------------------------------------------------------------------------------
   * autoFocus: a callback ref keeps the node, and the effect focuses it after
   * the mount (only macOS and the web give a view keyboard focus today).
   * ----------------------------------------------------------------------------------------- */
  let node: ViewRef | undefined;

  effect(() => {
    if (local.autoFocus) {
      node?.focus();
    }
  });

  const content = () => {
    // The single read of `props.children`, at the placement.
    const children = local.children;

    if (typeof children === "function" && children.length >= 1) {
      return renderChildren(
        untracked(() => (children as (values: AccordionTriggerRenderProps) => JSX.Element)(renderProps)),
      );
    }

    return renderChildren(children as JSX.Element);
  };

  // R-017: the transition's property list, duration and curve. It cannot be a
  // class: NSH's `transition` would also fade the hover background, which
  // HeroUI does not transition. Reduce motion turns the transition off, as the
  // stylesheet's `motion-reduce:transition-none` does.
  const transitionStyle = (): ViewStyle => ({
    transitionProperty: reduceMotion() ? "none" : "opacity, box-shadow",
    transitionDuration: "150ms",
    transitionTimingFunction: "ease-out",
  });

  return (
    <View
      ref={(next) => {
        node = next;
        local.ref?.(next);
      }}
      testID={local.testID}
      nativeID={local.id ?? local.nativeID}
      tooltip={local.tooltip}
      role="button"
      focusable={!isDisabled() && local.excludeFromTabOrder !== true}
      disabled={isDisabled()}
      accessibilityLabel={local["aria-label"] ?? local.accessibilityLabel}
      accessibilityHint={local.accessibilityHint}
      accessibilityElementsHidden={local.accessibilityElementsHidden}
      // React Aria's `aria-expanded` on the trigger. The View's own state is
      // where NSH projects it.
      accessibilityState={{
        ...local.accessibilityState,
        expanded: isExpanded(),
        disabled: isDisabled(),
      }}
      class={classes()}
      classList={classList()}
      // The caller's style wins over the transition, as the stylesheet's rule
      // loses to an inline `transition-*` in HeroUI.
      style={[transitionStyle(), resolvedStyle()]}
      onPress={handlePress}
      onPressDown={handlePressDown}
      onPressUp={handlePressUp}
      onLongPress={handleLongPress}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onLayout={local.onLayout}
    >
      {content()}
    </View>
  );
}
