import type {
  Accessor,
  JSX,
  MouseEvent as NshMouseEvent,
  StyleProp,
  ViewProps,
  ViewRef,
  ViewStyle,
} from "nsh";
import { computed, signal, split, untracked, View } from "nsh";

import { joinClassNames } from "./class-names";
import {
  ColorInputGroupContext,
  type ColorInputGroupContextValue,
  ColorInputGroupFieldContext,
} from "./context";
import {
  type AriaProps,
  type DataProps,
  type GlobalDomProps,
  hostProps,
} from "./color-input-group-dom-props";
import { colorInputGroupVariants } from "./color-input-group.styles";
import type { ColorInputGroupVariants } from "./color-input-group.styles";
import { renderChildren } from "./render-children";

/* -------------------------------------------------------------------------------------------------
 * Render props
 * -----------------------------------------------------------------------------------------------*/

/**
 * The values HeroUI's `Group` hands to a render prop
 * (`react-aria-components/src/Group.tsx:28-52`), as accessors per D17.
 *
 * `defaultClassName` / `defaultStyle` are the pair React Aria's
 * `useRenderProps` adds: the slot classes and an empty default style. The
 * upstream root's `className` function receives the group's render props
 * including the default pair, so a caller can append to or replace them.
 */
export interface ColorInputGroupRootRenderProps {
  /** A pointer rests on the group or something inside it. */
  isHovered: Accessor<boolean>;

  /** Something inside the group has keyboard focus (`:focus-within`). */
  isFocusWithin: Accessor<boolean>;

  /**
   * The group's only focus stop is its text input, and a text input counts as
   * focus-visible as soon as it is focused, so this equals `isFocusWithin`.
   */
  isFocusVisible: Accessor<boolean>;

  /** The effective disabled state. */
  isDisabled: Accessor<boolean>;

  /** The effective invalid state. */
  isInvalid: Accessor<boolean>;

  /** The `base` slot's class string, before the caller's `className`. */
  defaultClassName: string;

  /** An empty style object, as React Aria's `useRenderProps` supplies. */
  defaultStyle: ViewStyle;
}

/* -------------------------------------------------------------------------------------------------
 * ColorInputGroup Root
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `ColorInputGroup.Root`: HeroUI 3.2.7's `ColorInputGroupRootProps`,
 * which is React Aria Components' `Group` (its `GroupProps` plus `HoverEvents`)
 * and the two variant dimensions, expressed with NSH's view host props.
 *
 * The DOM-only members upstream are accepted so code written against HeroUI
 * keeps compiling; the port sheet §1.2 says what each can and cannot do here.
 */
export interface ColorInputGroupRootProps
  extends Omit<ViewProps, "children" | "class" | "style" | "ref" | "role">,
    AriaProps,
    DataProps,
    GlobalDomProps {
  /**
   * The group's content: an element, or a render prop called once with the
   * group state (D17). Bare strings and numbers become `Text` at the placement,
   * or NSH would not draw them.
   */
  children?: JSX.Element | ((values: ColorInputGroupRootRenderProps) => JSX.Element);

  /** Appended after the variant classes; later classes win. Function form gets the same accessors. */
  className?: string | ((values: ColorInputGroupRootRenderProps) => string | undefined);

  /** Style of the group; function form gets the same accessors. */
  style?:
    | StyleProp<ViewStyle>
    | ((values: ColorInputGroupRootRenderProps) => StyleProp<ViewStyle>);

  /** The fill flavor. @default "primary" */
  variant?: ColorInputGroupVariants["variant"];

  /** Stretches the group across its parent. @default false */
  fullWidth?: boolean;

  /**
   * Dims the group, shows `not-allowed` and blocks the pointer. It does **not**
   * disable the input: upstream's `Group` never writes `InputContext`, so the
   * field root disables its input separately (R-014).
   */
  isDisabled?: boolean;

  /** Paints the invalid outline / ring and the invalid fill (R-011, R-012). */
  isInvalid?: boolean;

  /** Accepted, no effect: upstream only sets `data-readonly`, with no rule. */
  isReadOnly?: boolean;

  /** The group's ARIA role. @default "group", or "presentation" inside a field */
  role?: "group" | "region" | "presentation";

  /** The accessible name of the group itself. */
  "aria-label"?: string;

  /** The accessible name through the host prop, below `aria-label`. */
  accessibilityLabel?: string;

  /** A DOM id upstream; maps to `nativeID`, the name other elements refer to. */
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

  /** The group's view, as `ComponentPropsWithRef` gives upstream. */
  ref?: (node: ViewRef) => void;
}

export function ColorInputGroupRoot(props: ColorInputGroupRootProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "id",
    "nativeID",
    "focusable",
    "role",
    "variant",
    "fullWidth",
    "isDisabled",
    "isInvalid",
    "isReadOnly",
    "aria-label",
    "accessibilityLabel",
    "aria-disabled",
    "data-disabled",
    "aria-invalid",
    "data-invalid",
    "onMouseEnter",
    "onMouseLeave",
    "onHoverStart",
    "onHoverEnd",
    "onHoverChange",
    "onFocus",
    "onBlur",
  ] as const);

  // The optional field root (ColorField, a later unit). Captured once in the
  // body; effects and cleanup closures use this captured value, never the
  // context call (research 4.6).
  const field = ColorInputGroupFieldContext();

  // --- Variant table --------------------------------------------------------
  // Re-resolved against the current props, and wrapped in a plain object whose
  // slot calls go through that computed: the context contract is HeroUI's
  // `slots.input()` call shape, while a runtime `variant` / `fullWidth` change
  // still re-resolves every slot.
  const resolvedSlots = computed(() =>
    colorInputGroupVariants({
      fullWidth: local.fullWidth,
      variant: local.variant,
    }),
  );

  const slots: ColorInputGroupContextValue["slots"] = {
    base: () => resolvedSlots().base(),
    input: () => resolvedSlots().input(),
    prefix: () => resolvedSlots().prefix(),
    suffix: () => resolvedSlots().suffix(),
  };

  const isSecondary = computed(() => (local.variant ?? "primary") === "secondary");

  // --- Effective state ------------------------------------------------------
  // Explicit prop, then `aria-*` / `data-*` (the two upstream also reads), then
  // the field root. `??`, not `||`, so an explicit `false` wins.
  const isDisabled = computed(() => {
    if (local.isDisabled !== undefined) {
      return local.isDisabled;
    }

    if (local["aria-disabled"] === true || local["aria-disabled"] === "true") {
      return true;
    }

    if (local["data-disabled"] === true || local["data-disabled"] === "true") {
      return true;
    }

    return field?.isDisabled?.() ?? false;
  });

  const isInvalid = computed(() => {
    if (local.isInvalid !== undefined) {
      return local.isInvalid;
    }

    if (local["aria-invalid"] === true || local["aria-invalid"] === "true") {
      return true;
    }

    if (local["data-invalid"] === true || local["data-invalid"] === "true") {
      return true;
    }

    return field?.isInvalid?.() ?? false;
  });

  // --- Group-level signals --------------------------------------------------
  // HeroUI observes hover and focus-within with React Aria's `useHover` /
  // `useFocusRing({ within: true })`; NSH has no `:hover` / `:focus-within`
  // machinery to read, so the root keeps the two signals and the parts write
  // into them (port sheet §2).
  const hovered = signal(false);
  const focusWithin = signal(false);

  const setFocusWithin = (value: boolean) => {
    focusWithin.set(value);
  };

  // --- Prefix / suffix registration ----------------------------------------
  // Stands in for `:has([data-slot="color-input-group-prefix"])` (R-017) and
  // the suffix twin (R-018): the parts register on creation and unregister on
  // cleanup, and `Input` reads the two counts.
  const prefixCount = signal(0);
  const suffixCount = signal(0);

  const hasPrefix = computed(() => prefixCount() > 0);
  const hasSuffix = computed(() => suffixCount() > 0);

  const registerPrefix = () => {
    prefixCount.update((count) => count + 1);

    return () => prefixCount.update((count) => Math.max(0, count - 1));
  };

  const registerSuffix = () => {
    suffixCount.update((count) => count + 1);

    return () => suffixCount.update((count) => Math.max(0, count - 1));
  };

  // --- Render props and classes ---------------------------------------------
  const buildRenderProps = (): ColorInputGroupRootRenderProps => ({
    isHovered: hovered,
    isFocusWithin: focusWithin,
    // The group's only focus stop is the text input; a text input counts as
    // focus-visible from its first frame (port sheet §1.2).
    isFocusVisible: focusWithin,
    isDisabled,
    isInvalid,
    defaultClassName: slots.base(),
    defaultStyle: {},
  });

  const resolvedClassName = () => {
    const value = local.className;

    return typeof value === "function" ? value(buildRenderProps()) : value;
  };

  const resolvedStyle = () => {
    const value = local.style;

    return typeof value === "function" ? value(buildRenderProps()) : value;
  };

  const classes = computed(() => joinClassNames(slots.base(), resolvedClassName()));

  // --- Pointer and focus ----------------------------------------------------
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

  const handleFocus = () => {
    focusWithin.set(true);
    local.onFocus?.();
  };

  const handleBlur = () => {
    focusWithin.set(false);
    local.onBlur?.();
  };

  // --- Role -----------------------------------------------------------------
  // Explicit role wins; inside a field the group defaults to RAC's
  // `"presentation"` (mapped to NSH's `"none"`), otherwise `"group"`.
  const role = computed<"group" | "region" | "none">(() => {
    if (local.role === "presentation") {
      return "none";
    }

    if (local.role !== undefined) {
      return local.role;
    }

    return field?.role === "presentation" ? "none" : "group";
  });

  const contextValue: ColorInputGroupContextValue = {
    slots,
    hasPrefix,
    hasSuffix,
    registerPrefix,
    registerSuffix,
    isDisabled,
    isInvalid,
    isFocusWithin: focusWithin,
    setFocusWithin,
  };

  // A one-argument function is HeroUI's render prop (D17); a zero-argument one
  // is NSH's reactive child and reaches `renderChildren` untouched.
  const renderRootChildren = (
    children: ColorInputGroupRootProps["children"],
  ): JSX.Element => {
    if (typeof children === "function" && children.length >= 1) {
      const rendered = untracked(() =>
        (children as (values: ColorInputGroupRootRenderProps) => JSX.Element)(
          buildRenderProps(),
        ),
      );

      return renderChildren(rendered);
    }

    return renderChildren(children as JSX.Element);
  };

  // The single read of `props.children`, inside the provider and at the
  // placement (research 4.1 / 4.6, and the provider exception in the common
  // rules): a computed made in the body would evaluate outside the provider,
  // and `Prefix` / `Suffix` / `Input` would lose the group context.
  return (
    <ColorInputGroupContext.Provider value={contextValue}>
      <View
        {...hostProps(rest)}
        ref={(node) => local.ref?.(node)}
        nativeID={local.id ?? local.nativeID}
        role={role()}
        accessibilityLabel={local["aria-label"] ?? local.accessibilityLabel}
        // A `<div role="group">` is not a focus stop upstream; a caller's own
        // `focusable` still wins.
        focusable={local.focusable ?? false}
        class={classes()}
        classList={{
          // R-012: primary, invalid → `--color-input-group-bg-focus`
          // (`--field-focus`).
          "bg-field-focus": isInvalid() && !isSecondary(),
          // R-030 / R-033: secondary keeps `--default` while focused and
          // while invalid; the variant already carries `bg-default`, and this
          // restates it after a hover fill could have applied.
          "bg-default": isSecondary() && (focusWithin() || isInvalid()),
          // R-010: `status-focused-field` → `ring-2 ring-focus
          // ring-offset-0 outline-none`. Focus comes from the text input, so
          // a pointer press into it shows the ring too, as `:focus-within`
          // does upstream. Invalid groups use the danger pair below instead.
          "ring-2 ring-focus ring-offset-0 outline-none": focusWithin() && !isInvalid(),
          // R-011 / R-031: `status-invalid-field`, unfocused half → `outline-1
          // outline-danger outline-solid`. R-031 is the secondary variant's
          // `@apply status-invalid-field`, the same class set.
          "outline-1 outline-danger outline-solid": isInvalid() && !focusWithin(),
          // R-011 / R-031: focused half → `ring-2 ring-danger ring-offset-0`.
          // The upstream utility's comment says the outline is removed while
          // its code does not; the comment's intent wins and §8 registers it.
          "ring-2 ring-danger ring-offset-0 outline-none": isInvalid() && focusWithin(),
          // R-009: `:hover:not(:focus-within)` → `bg-field-hover`. The
          // focus-within exclusion must be a signal: NSH's variant order puts
          // `hover:` after `focus-within:`, so stacking those classes would let
          // hover win while focused.
          "bg-field-hover":
            hovered() && !focusWithin() && !isDisabled() && !isSecondary(),
          // R-029: the secondary twin of R-009 → `bg-default-hover`.
          "bg-default-hover":
            hovered() && !focusWithin() && !isDisabled() && isSecondary(),
          // R-014: `status-disabled` → `opacity: .5`, `cursor: not-allowed`,
          // `pointer-events: none`, with the literals the theme notes require.
          // The root does not set `View.disabled`: upstream's group has no
          // `aria-disabled`, and the accessibility state would announce a
          // disabled group.
          "opacity-50 cursor-not-allowed pointer-events-none": isDisabled(),
        }}
        style={resolvedStyle()}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
      >
        {renderRootChildren(local.children)}
      </View>
    </ColorInputGroupContext.Provider>
  );
}
