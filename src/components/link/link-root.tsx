import type {
  AccessibilityRole,
  AccessibilityState,
  Bounds,
  ContextMenuEvent,
  JSX,
  MouseEvent as NshMouseEvent,
  PressEvent,
  StyleProp,
  ViewRef,
  ViewStyle,
} from "nsh";
import { computed, effect, openUrl, reduceMotion, signal, View } from "nsh";
import type { Accessor } from "nsh";

import {
  createInteractionModality,
  isKeyboardPress,
} from "../../primitives/create-interaction-modality";
import { renderChildren } from "./children";
import { joinClassNames } from "./class-names";
import { LinkContext, type LinkContextValue } from "./context";
import type { AriaProps, DataProps, GlobalDomProps } from "./dom-props";
import { linkVariants, type LinkVariants } from "./link.styles";

/** The live state HeroUI hands to render-prop children, `className` and `style`. */
export interface LinkRenderProps {
  isCurrent: Accessor<boolean>;
  isHovered: Accessor<boolean>;
  isPressed: Accessor<boolean>;
  isFocused: Accessor<boolean>;
  isFocusVisible: Accessor<boolean>;
  isDisabled: Accessor<boolean>;
}

/**
 * The props of `Link.Root` (= `Link`): HeroUI 3.2.7's `LinkRootProps`, which is
 * React Aria Components' `LinkProps` (PressEvents, HoverEvents,
 * FocusableProps, the six render props, `href`, `isDisabled`, `autoFocus`,
 * `excludeFromTabOrder`, `render` / `slot`) plus React's anchor attributes,
 * expressed with NSH's view host props.
 *
 * The DOM-only members are accepted so code written against HeroUI keeps
 * compiling; port sheet §1.1 and §8 list what each can and cannot do here.
 */
export interface LinkRootProps
  extends LinkVariants,
    AriaProps,
    DataProps,
    GlobalDomProps {
  children?: JSX.Element | ((values: LinkRenderProps) => JSX.Element);

  /** Appended after the variant classes and before `classList`. */
  className?: string | ((values: LinkRenderProps) => string);

  /** NSH style keys instead of React's `CSSProperties` (sheet §8). */
  style?: StyleProp<ViewStyle> | ((values: LinkRenderProps) => StyleProp<ViewStyle>);

  /**
   * Where the link points. NSH has no `<a>` and no navigation: an absolute URL
   * is handed to `openUrl` on a completed press, while a relative path or a
   * `#anchor` only fires the press handlers (sheet §8).
   */
  href?: string;

  /** Native anchor navigation hints: accepted, no effect (sheet §8). */
  hrefLang?: string;
  target?: string;
  rel?: string;
  download?: string | boolean;
  ping?: string;
  referrerPolicy?: string;

  /** Disables the link: no hover, no press, no Tab stop. */
  isDisabled?: boolean;

  /** Called on every completed press, pointer or keyboard. */
  onPress?: (e: PressEvent) => void;

  /**
   * React Aria's compatibility alias for `onPress`: called in the same press
   * release. The payload is NSH's `PressEvent`, not a `MouseEvent` (sheet §8).
   */
  onClick?: (e: PressEvent) => void;

  /** Press started (forwarded from the host's `onPressDown`). */
  onPressStart?: (e: PressEvent) => void;
  /** Press released; shares the host event with `onPressEnd` (sheet §8). */
  onPressUp?: (e: PressEvent) => void;
  /** Press released; shares the host event with `onPressUp` (sheet §8). */
  onPressEnd?: (e: PressEvent) => void;
  /** Synthesized from the press start / release pair. */
  onPressChange?: (isPressed: boolean) => void;
  /** The long-press threshold elapsed. */
  onLongPress?: (e: PressEvent) => void;
  /** Called with `onLongPress`; React Aria reports the start of the same press. */
  onLongPressStart?: (e: PressEvent) => void;
  /** Accepted, never called: NSH has no event that ends a long press (sheet §8). */
  onLongPressEnd?: (e: PressEvent) => void;

  /** The pointer entered; off while disabled, as React Aria's `useHover`. */
  onHoverStart?: (e: NshMouseEvent) => void;
  /** The pointer left. */
  onHoverEnd?: (e: NshMouseEvent) => void;
  /** Synthesized hover state, as a boolean. */
  onHoverChange?: (isHovered: boolean) => void;

  /** NSH host mouse events, chained beside the internal hover tracking. */
  onMouseEnter?: (e: NshMouseEvent) => void;
  onMouseLeave?: (e: NshMouseEvent) => void;
  onMouseMove?: (e: NshMouseEvent) => void;
  onContextMenu?: (e: ContextMenuEvent) => void;

  /** The link took the keyboard focus. */
  onFocus?: () => void;
  /** The link lost the keyboard focus. */
  onBlur?: () => void;
  /** Synthesized from `onFocus` / `onBlur`. */
  onFocusChange?: (isFocused: boolean) => void;

  /** Accepted, no effect: a view has no keyboard events (sheet §8). */
  onKeyDown?: (e: unknown) => void;
  /** Accepted, no effect: a view has no keyboard events (sheet §8). */
  onKeyUp?: (e: unknown) => void;

  /** Focuses the link after it mounts, from an effect. */
  autoFocus?: boolean;
  /** Leaves the link out of the Tab order. */
  excludeFromTabOrder?: boolean;

  /** React Aria's element replacement: accepted, no effect (sheet §8). */
  render?: unknown;
  /** React Aria's collection slot: accepted, no effect (sheet §8). */
  slot?: string;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** The link's role; `link` unless the caller overrides it, as `{...props}` would. */
  role?: AccessibilityRole;

  /** The current item of a set; also lands in `accessibilityState.current`. */
  "aria-current"?:
    | boolean
    | "page"
    | "step"
    | "location"
    | "date"
    | "time"
    | "true"
    | "false";

  /** The accessible name; maps to `accessibilityLabel`. */
  "aria-label"?: string;

  /** Reads as `isDisabled` when `true`, like React Aria's Link. */
  "aria-disabled"?: boolean;

  /** Maps to `accessibilityElementsHidden`. */
  "aria-hidden"?: boolean;

  /** NSH host props, accepted beside the ARIA aliases above. */
  accessibilityLabel?: string;
  accessibilityState?: AccessibilityState;
  accessibilityElementsHidden?: boolean;
  testID?: string;
  nativeID?: string;
  tooltip?: JSX.Element;
  onLayout?: (e: { bounds: Bounds }) => void;

  /** Reaches the root `View`; a callback, as NSH forwards refs. */
  ref?: (node: ViewRef) => void;
}

/** `http:`, `mailto:`, `tel:` …: what `openUrl` accepts; `#anchor` is not. */
const ABSOLUTE_URL = /^[a-z][a-z0-9+.-]*:/i;

/**
 * `Link.Root` / `LinkRoot`: a focusable, pressable text link. Built on the core
 * `View` and not on nsh/base `Link`, whose public surface cannot carry
 * PressEvents, HoverEvents, the six render props or the function forms of
 * `className` / `style` / `children` (port sheet section 3, criterion B3).
 */
export function LinkRoot(props: LinkRootProps): JSX.Element {
  const isHovered = signal(false);
  const isPressed = signal(false);
  const isFocused = signal(false);
  const modality = createInteractionModality();

  const isFocusVisible = computed(() => isFocused() && modality.isKeyboard());

  // Effective disabled: the prop, then `aria-disabled`, as React Aria resolves
  // them. `??`, not `||`, so an explicit `false` wins over `aria-disabled`.
  const isDisabled = computed(
    () =>
      props.isDisabled ??
      (props["aria-disabled"] === true ? true : undefined) ??
      false,
  );

  // RAC's `!!aria-current`: the string `"false"` is truthy, so it reads as
  // current too (upstream semantics, copied on purpose).
  const isCurrent = computed(() => Boolean(props["aria-current"]));

  const renderProps: LinkRenderProps = {
    isCurrent,
    isHovered,
    isPressed,
    isFocused,
    isFocusVisible,
    isDisabled,
  };

  const slots = linkVariants();

  const resolvedClassName = () => {
    const className = props.className;

    return typeof className === "function" ? className(renderProps) : className;
  };

  const classes = computed(() => joinClassNames(slots.base(), resolvedClassName()));

  const resolvedStyle = () => {
    const style = props.style;

    return typeof style === "function" ? style(renderProps) : style;
  };

  // R-002: the four transitioned properties are one inline list, because NSH
  // takes one property list, one duration and one curve. R-003:
  // `motion-reduce:transition-none` cannot override an inline property list, so
  // the reduced-motion case writes `"none"` into the same inline value instead.
  const transitionProperty = () =>
    reduceMotion() ? "none" : "color, background-color, box-shadow, opacity";

  // V4: Return and Space activation reports `pagePosition` exactly `{0, 0}`,
  // a real pointer press reports where it happened. React Aria sets the
  // modality from the event that caused it, so a keyboard activation keeps the
  // focus ring and any other press switches to the pointer one.
  const notePress = (event: PressEvent) => {
    if (isKeyboardPress(event)) {
      modality.setKeyboardModality();
    } else {
      modality.setPointerModality();
    }
  };

  const handlePress = (event: PressEvent) => {
    if (isDisabled()) {
      return;
    }

    notePress(event);
    props.onPress?.(event);
    props.onClick?.(event);

    // The native anchor's navigation, replayed: only an absolute URL is handed
    // to the host. A relative path or `#anchor` fires the handlers and stops
    // there (sheet §8); a rejected URL is dropped silently.
    const href = props.href;

    if (href !== undefined && ABSOLUTE_URL.test(href)) {
      void openUrl(href).catch(() => {});
    }
  };

  const handlePressDown = (event: PressEvent) => {
    if (isDisabled()) {
      return;
    }

    notePress(event);
    isPressed.set(true);
    props.onPressStart?.(event);
    props.onPressChange?.(true);
  };

  const handlePressUp = (event: PressEvent) => {
    if (isPressed()) {
      isPressed.set(false);
      props.onPressChange?.(false);
    }

    if (isDisabled()) {
      return;
    }

    props.onPressUp?.(event);
    props.onPressEnd?.(event);
  };

  const handleLongPress = (event: PressEvent) => {
    if (isDisabled()) {
      return;
    }

    props.onLongPressStart?.(event);
    props.onLongPress?.(event);
  };

  const handleMouseEnter = (event: NshMouseEvent) => {
    props.onMouseEnter?.(event);

    // React Aria's `useHover({ isDisabled })` reports no hover while disabled.
    if (isDisabled() || isHovered()) {
      return;
    }

    isHovered.set(true);
    props.onHoverStart?.(event);
    props.onHoverChange?.(true);
  };

  const handleMouseLeave = (event: NshMouseEvent) => {
    props.onMouseLeave?.(event);

    if (!isHovered()) {
      return;
    }

    isHovered.set(false);
    props.onHoverEnd?.(event);
    props.onHoverChange?.(false);
  };

  const handleFocus = () => {
    isFocused.set(true);
    // A view is focused by Tab on macOS and the web; a pointer press does not
    // focus it, so this focus is the keyboard modality arriving.
    modality.onFocus();
    props.onFocusChange?.(true);
    props.onFocus?.();
  };

  const handleBlur = () => {
    isFocused.set(false);
    props.onFocusChange?.(false);
    props.onBlur?.();
  };

  let node: ViewRef | undefined;
  const handleRef = (next: ViewRef) => {
    node = next;
    props.ref?.(next);
  };

  effect(() => {
    if (props.autoFocus) {
      node?.focus();
    }
  });

  // React Aria's `useHover` / `usePress` end their interaction state when the
  // link becomes disabled; the disabled guard in the handlers only covers
  // presses that start afterwards.
  effect(() => {
    if (!isDisabled()) {
      return;
    }

    if (isHovered()) {
      isHovered.set(false);
    }

    if (isPressed()) {
      isPressed.set(false);
    }
  });

  // `aria-current` maps onto `accessibilityState.current`: `true` / `"true"` →
  // `true`, `false` / `"false"` / absent → not written, the rest keep their
  // value (sheet §1.1).
  const ariaCurrent = () => {
    const value = props["aria-current"];

    if (value === true || value === "true") {
      return true;
    }

    if (value === false || value === "false" || value === undefined) {
      return undefined;
    }

    return value;
  };

  const accessibilityState = computed<AccessibilityState>(() => {
    const own = props.accessibilityState ?? {};

    return {
      ...own,
      disabled: isDisabled() || own.disabled === true,
      current: ariaCurrent() ?? own.current,
    };
  });

  const contextValue: LinkContextValue = { slots, isFocusVisible };

  // Read `props.children` once, in the provider and at the placement (research
  // 4.1, 4.6 and the provider exception in the common rules): a computed made
  // in the body would evaluate outside the provider, and `Link.Icon` would lose
  // its slot and focus state.
  const renderContent = (
    content: JSX.Element | ((values: LinkRenderProps) => JSX.Element),
  ) => {
    // D17: a function that takes arguments is the HeroUI render prop; a
    // zero-argument function is an NSH reactive child. A string or number
    // result must become Text just like static children do.
    if (typeof content === "function" && content.length >= 1) {
      return renderChildren(
        (content as (values: LinkRenderProps) => JSX.Element)(renderProps),
      );
    }

    return renderChildren(content as JSX.Element);
  };

  return (
    <LinkContext.Provider value={contextValue}>
      <View
        ref={handleRef}
        testID={props.testID}
        nativeID={props.id ?? props.nativeID}
        tooltip={props.tooltip}
        role={props.role ?? "link"}
        disabled={isDisabled()}
        // A pointer press does not focus a view, so an unpressable link is out
        // of the Tab order through `focusable`; a caller's
        // `excludeFromTabOrder` takes it out even when it is pressable.
        focusable={props.excludeFromTabOrder === true ? false : undefined}
        accessibilityLabel={props["aria-label"] ?? props.accessibilityLabel}
        accessibilityState={accessibilityState()}
        accessibilityElementsHidden={
          props["aria-hidden"] ?? props.hidden ?? props.accessibilityElementsHidden
        }
        class={classes()}
        // R-010: `status-focused` → `ring-2 ring-focus ring-offset-0
        // ring-offset-background outline-none` with a 2 px offset, written as
        // `ring-offset-2`. The upstream `:focus-visible:not([data-focused])`
        // condition is `isFocusVisible` here.
        classList={{
          "ring-2 ring-focus ring-offset-2 ring-offset-background outline-none":
            isFocusVisible(),
        }}
        style={[{ transitionProperty: transitionProperty() }, resolvedStyle()]}
        onPress={handlePress}
        onPressDown={handlePressDown}
        onPressUp={handlePressUp}
        onLongPress={handleLongPress}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseMove={props.onMouseMove}
        onContextMenu={props.onContextMenu}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onLayout={props.onLayout}
      >
        {renderContent(props.children)}
      </View>
    </LinkContext.Provider>
  );
}
