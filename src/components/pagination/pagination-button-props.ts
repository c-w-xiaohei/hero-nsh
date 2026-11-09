import type {
  AccessibilityState,
  Bounds,
  ContextMenuEvent,
  JSX,
  MouseEvent as NshMouseEvent,
  StyleProp,
  ViewRef,
  ViewStyle,
} from "nsh";

import type {
  PaginationPressableProps,
  PaginationRenderProps,
} from "./create-pagination-pressable";
import type { DataProps, GlobalDomEvents, KeyboardEvents } from "./pagination-dom-props";

/**
 * The ARIA attributes React Aria's `Button` accepts (port sheet §1.3). The ones
 * with an NSH counterpart are mapped by `pagination-button.tsx`; the relation
 * ones (`aria-labelledby`, `aria-describedby`, `aria-controls`, `aria-details`,
 * `aria-haspopup`) are accepted and have no effect, because NSH has no
 * cross-element references and no popup semantics.
 *
 * There is no `aria-${string}` index signature on purpose: forgetting to
 * declare a supported attribute would silently drop it, while the port sheet
 * fixes the exact set. `aria-busy` / `aria-checked` / `aria-selected` are here
 * because React Aria's button type carries them.
 */
export interface PaginationButtonAriaProps {
  /** A DOM id upstream; maps to `nativeID`. */
  "aria-labelledby"?: string;

  /** Accepted, no effect: NSH has no cross-element references. */
  "aria-describedby"?: string;

  /** Accepted, no effect: NSH has no cross-element references. */
  "aria-controls"?: string;

  /** Accepted, no effect: NSH has no cross-element references. */
  "aria-details"?: string;

  /** Accepted, no effect: NSH has no popup semantics. */
  "aria-haspopup"?: boolean | "dialog" | "grid" | "listbox" | "menu" | "tree";

  /** Maps to `accessibilityLabel`. */
  "aria-label"?: string;

  /** Maps to `accessibilityElementsHidden`. */
  "aria-hidden"?: boolean;

  /** `true` / `"true"` is the same state as `isDisabled`. */
  "aria-disabled"?: boolean | "true" | "false";

  /** Maps to `accessibilityState.expanded`; `"true"` / `"false"` fold to booleans. */
  "aria-expanded"?: boolean | "true" | "false";

  /** Maps to `accessibilityState.pressed`; `"mixed"` stays as it is. */
  "aria-pressed"?: boolean | "true" | "false" | "mixed";

  /** Maps to `accessibilityState.checked`; `"mixed"` stays as it is. */
  "aria-checked"?: boolean | "true" | "false" | "mixed";

  /** Maps to `accessibilityState.selected`; `"true"` / `"false"` fold to booleans. */
  "aria-selected"?: boolean | "true" | "false";

  /** Maps to `accessibilityState.busy`; `"true"` / `"false"` fold to booleans. */
  "aria-busy"?: boolean | "true" | "false";

  /**
   * Maps to `accessibilityState.current`; the named values pass through.
   * `Pagination.Link` defaults it to `"page"` while `isActive`, and the
   * property wins over that default, as the upstream `{...props}` spread does.
   */
  "aria-current"?: boolean | "true" | "false" | "page" | "step" | "location" | "date" | "time";
}

/** Host attributes that exist only because HeroUI renders a real `<button>`. */
export interface PaginationButtonFormProps {
  /** Accepted, no effect: NSH has no form submission. */
  type?: "button" | "submit" | "reset";

  /** Accepted, no effect: NSH has no form submission. */
  form?: string;

  /** Accepted, no effect: NSH has no form submission. */
  formAction?: string;

  /** Accepted, no effect: NSH has no form submission. */
  formEncType?: string;

  /** Accepted, no effect: NSH has no form submission. */
  formMethod?: string;

  /** Accepted, no effect: NSH has no form submission. */
  formNoValidate?: boolean;

  /** Accepted, no effect: NSH has no form submission. */
  formTarget?: string;

  /** Accepted, no effect: NSH has no form submission. */
  name?: string;

  /** Accepted, no effect: NSH has no form submission. */
  value?: string;
}

/**
 * The props `Link`, `Previous` and `Next` share: HeroUI's
 * `ComponentPropsWithRef<typeof ButtonPrimitive>` (React Aria's `Button`).
 *
 * The DOM-only members are accepted so code written against HeroUI keeps
 * compiling; port sheet §1.3 and §5 list what each one does here.
 */
export interface PaginationButtonProps
  extends PaginationPressableProps,
    PaginationButtonAriaProps,
    PaginationButtonFormProps,
    DataProps,
    GlobalDomEvents,
    KeyboardEvents {
  /** Content, or React Aria's render prop; the parameter object holds accessors (D17). */
  children: JSX.Element | ((values: PaginationRenderProps) => JSX.Element);

  /** Appended after the slot classes; later classes win (D13). */
  className?: string | ((values: PaginationRenderProps) => string);

  /** Merged with the internal `transitionProperty`; the caller's value comes last. */
  style?: StyleProp<ViewStyle> | ((values: PaginationRenderProps) => StyleProp<ViewStyle>);

  /** Leaves the button out of the Tab order, as RAC's `tabIndex={-1}` does. */
  excludeFromTabOrder?: boolean;

  /** Accepted, no effect: a pointer press does not focus a view in NSH. */
  preventFocusOnPress?: boolean;

  /**
   * Accepted, no effect: pagination has no pending state. The render prop's
   * `isPending` is always `false` and no pending look is painted (port sheet
   * §5).
   */
  isPending?: boolean;

  /** A DOM role upstream; defaults to `"button"` as React Aria's button does. */
  role?: string;

  /** Accepted, no effect: a view is a focus stop or it is not. */
  tabIndex?: number;

  /** React Aria's slot collection prop: accepted, no effect (no Provider slots). */
  slot?: string;

  /** Accepted, no effect: NSH has no replaceable DOM element. */
  render?: unknown;

  /** Forwarded to the root view as it is. */
  onMouseMove?: (e: NshMouseEvent) => void;

  /** Forwarded to the root view as it is. */
  onContextMenu?: (e: ContextMenuEvent) => void;

  /** NSH host props, accepted beside the ARIA aliases above. */
  accessibilityLabel?: string;
  accessibilityState?: AccessibilityState;
  accessibilityElementsHidden?: boolean;
  testID?: string;
  nativeID?: string;
  id?: string;
  tooltip?: JSX.Element;
  onLayout?: (e: { bounds: Bounds }) => void;

  /** A callback, as NSH forwards refs; `ref={undefined}` would reach the host. */
  ref?: (node: ViewRef) => void;
}

/** The props of `Pagination.Link`: a button plus the current-page flag. */
export interface PaginationLinkProps extends PaginationButtonProps {
  /**
   * Whether this is the current page. `true` writes
   * `accessibilityState.current = "page"` and paints the tertiary `bg-default`
   * background; it is a state prop, not a variant (port sheet §1.1).
   *
   * @default false
   */
  isActive?: boolean;
}

/** The props of `Pagination.Previous`. */
export type PaginationPreviousProps = PaginationButtonProps;

/** The props of `Pagination.Next`. */
export type PaginationNextProps = PaginationButtonProps;
