import type {
  Accessor,
  JSX,
  MouseEvent as NshMouseEvent,
  StyleProp,
  ViewProps,
  ViewRef,
  ViewStyle,
} from "nsh";
import { computed, reduceMotion, signal, split, View } from "nsh";

import { joinClassNames } from "./class-names";
import { NumberFieldContext } from "./context";
import {
  type AriaProps,
  type DataProps,
  type GlobalDomProps,
  hostProps,
} from "./number-field-dom-props";
import { renderChildren } from "./render-children";

/* -------------------------------------------------------------------------------------------------
 * Render props
 * -----------------------------------------------------------------------------------------------*/

/**
 * The values HeroUI's `Group` hands to a render prop
 * (`react-aria-components/src/Group.tsx:28-52`), as accessors per D17.
 */
export interface NumberFieldGroupRenderProps {
  /** A pointer rests on the group or something inside it. */
  isHovered: Accessor<boolean>;

  /** Something inside the group has keyboard focus (`:focus-within`). */
  isFocusWithin: Accessor<boolean>;

  /**
   * The group's only focus stop is its text input, and a text input counts as
   * focus-visible as soon as it is focused, so this equals `isFocusWithin`.
   */
  isFocusVisible: Accessor<boolean>;

  /** The group's effective disabled state. */
  isDisabled: Accessor<boolean>;

  /** The group's effective invalid state. */
  isInvalid: Accessor<boolean>;
}

/* -------------------------------------------------------------------------------------------------
 * Group props
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `NumberField.Group`: HeroUI 3.2.7's `NumberFieldGroupProps`,
 * which is React Aria Components' `Group` (`AriaLabelingProps`,
 * `HTMLAttributes`, `DOMProps`, `HoverProps`, `RenderProps<GroupRenderProps>`,
 * `SlotProps` and the three state overrides), expressed with NSH's view host
 * props.
 */
export interface NumberFieldGroupProps
  extends Omit<ViewProps, "children" | "class" | "style" | "ref" | "role">,
    AriaProps,
    DataProps,
    GlobalDomProps {
  /** The group's columns: decrement button, input, increment button, in that order. */
  children?: JSX.Element;

  /** Appended after the slot and state classes; later classes win. Function form gets the same accessors. */
  className?: string | ((values: NumberFieldGroupRenderProps) => string | undefined);

  /** Style of the group; function form gets the same accessors. */
  style?:
    | StyleProp<ViewStyle>
    | ((values: NumberFieldGroupRenderProps) => StyleProp<ViewStyle>);

  /** The group's ARIA role. @default "group"; `presentation` maps to NSH's `none`. */
  role?: "group" | "region" | "presentation";

  /** Dims the group and blocks its presses; overrides the field's state. */
  isDisabled?: boolean;

  /** Paints the invalid outline / ring; overrides the field's state. */
  isInvalid?: boolean;

  /** Accepted, no separate look upstream; overrides the field's state. */
  isReadOnly?: boolean;

  /** The accessible name of the group itself. */
  "aria-label"?: string;

  /** The accessible name through the host prop, below `aria-label`. */
  accessibilityLabel?: string;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;

  /** The pointer entered the group (off while disabled). */
  onHoverStart?: (e: NshMouseEvent) => void;

  /** The pointer left the group. */
  onHoverEnd?: (e: NshMouseEvent) => void;

  /** Both hover transitions, as React Aria's `useHover` reports them. */
  onHoverChange?: (isHovered: boolean) => void;

  /** The group's view, forwarded as a callback. */
  ref?: (node: ViewRef) => void;
}

/* -------------------------------------------------------------------------------------------------
 * Group
 * -----------------------------------------------------------------------------------------------*/

/**
 * NumberField.Group / NumberFieldGroup: the bordered grid that holds the input
 * and its two step buttons.
 *
 * Upstream's `:has([slot="decrement"])` / `:has([slot="increment"])` column
 * rules have no NSH equivalent, so the buttons register with the root and this
 * part picks the template from the two counts (R-009 … R-011). Hover,
 * focus-within, invalid and disabled are signals, because NSH has no
 * `:hover` / `:focus-within` and its variant order would let `hover:` win
 * while focused (port sheet §5).
 */
export function NumberFieldGroup(props: NumberFieldGroupProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "role",
    "isDisabled",
    "isInvalid",
    "isReadOnly",
    "aria-label",
    "accessibilityLabel",
    "aria-disabled",
    "aria-invalid",
    "id",
    "nativeID",
    "slot",
    "render",
    "onHoverStart",
    "onHoverEnd",
    "onHoverChange",
    "onMouseEnter",
    "onMouseLeave",
    "ref",
  ] as const);

  // Read once in the body: the field this group belongs to. Explicit props win
  // over it, as React Aria's merge does (port sheet §1.3).
  const field = NumberFieldContext();

  const isDisabled = computed(() => local.isDisabled ?? field?.isDisabled() ?? false);
  const isInvalid = computed(
    () =>
      local.isInvalid ??
      (local["aria-invalid"] === true || local["aria-invalid"] === "true"
        ? true
        : (field?.isInvalid() ?? false)),
  );
  const isReadOnly = computed(() => local.isReadOnly ?? field?.isReadOnly() ?? false);

  // --- Hover ----------------------------------------------------------------
  const hovered = signal(false);

  const handleMouseEnter = (event: NshMouseEvent) => {
    local.onMouseEnter?.(event);

    // React Aria's `useHover({ isDisabled })`: a disabled group never hovers.
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

  // --- Grid columns (R-008 … R-011) ----------------------------------------
  const columns = computed(() => {
    const decrement = field?.hasDecrement() ?? false;
    const increment = field?.hasIncrement() ?? false;

    if (decrement && increment) {
      return "grid-cols-[40px_1fr_40px]";
    }

    if (decrement) {
      return "grid-cols-[40px_1fr]";
    }

    if (increment) {
      return "grid-cols-[1fr_40px]";
    }

    return "grid-cols-1";
  });

  // --- Render props and classes --------------------------------------------
  const isFocusWithin = computed(() => field?.isFocusWithin() ?? false);

  const renderProps: NumberFieldGroupRenderProps = {
    isHovered: hovered,
    isFocusWithin,
    isFocusVisible: isFocusWithin,
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

  const classes = computed(() => {
    const secondary = (field?.variant() ?? "primary") === "secondary";
    const focused = isFocusWithin();
    const invalid = isInvalid();
    const disabled = isDisabled();

    return joinClassNames(
      field?.slots.group() ?? "",
      columns(),
      // R-014: `:hover:not(:focus-within)` → `bg-field-hover`. The focus
      // exclusion must be a signal: NSH's variant order puts `hover:` after
      // `focus-within:`, so stacking those classes would let hover win.
      hovered() && !focused && !disabled && !secondary ? "bg-field-hover" : undefined,
      // R-035: the secondary twin → `bg-default-hover`.
      hovered() && !focused && !disabled && secondary ? "bg-default-hover" : undefined,
      // R-015: `status-focused-field` → `ring-2 ring-focus ring-offset-0
      // outline-none` plus the focus fill. Invalid groups use the danger pair
      // below instead.
      focused && !invalid ? "ring-2 ring-focus ring-offset-0 outline-none bg-field-focus" : undefined,
      // R-036: secondary keeps `--default` while focused; this restates it
      // after a hover fill could have applied.
      focused && secondary ? "bg-default" : undefined,
      // R-016: `status-invalid-field`'s unfocused half → `outline-1
      // outline-danger outline-solid`, with the invalid focus fill.
      invalid && !focused ? "outline-1 outline-danger outline-solid bg-field-focus" : undefined,
      // R-016: its focused half → `ring-2 ring-danger ring-offset-0`.
      invalid && focused ? "ring-2 ring-danger ring-offset-0 outline-none bg-field-focus" : undefined,
      // R-037: secondary invalid keeps the `--default` fill; the ring / outline
      // is R-016's.
      invalid && secondary ? "bg-default" : undefined,
      // R-017: `status-disabled` → `opacity: .5`, `cursor: not-allowed`,
      // `pointer-events: none`, as literals (the theme has no such tokens).
      disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : undefined,
      resolvedClassName(),
    );
  });

  // R-012: the transitioned properties upstream. NSH animates through a class
  // and a property list; the class carries duration / curve, and reduced
  // motion turns the list off.
  const style = computed<StyleProp<ViewStyle>>(() => [
    {
      transitionProperty: reduceMotion()
        ? "none"
        : "background-color, border-color, box-shadow",
    },
    resolvedStyle(),
  ]);

  const role = computed(() => {
    const value = local.role ?? "group";

    return value === "presentation" ? "none" : value;
  });

  return (
    <View
      {...hostProps(rest)}
      ref={(node) => local.ref?.(node)}
      nativeID={local.id ?? local.nativeID}
      role={role()}
      accessibilityLabel={local["aria-label"] ?? local.accessibilityLabel}
      // R-017: upstream's group carries `aria-disabled`, which NSH's `disabled`
      // states and which also stops the presses inside it.
      disabled={isDisabled()}
      class={classes()}
      style={style()}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {renderChildren(local.children as JSX.Element)}
    </View>
  );
}
