import type {
  Accessor,
  JSX,
  MouseEvent as NshMouseEvent,
  StyleProp,
  ViewProps,
  ViewRef,
  ViewStyle,
} from "nsh";
import { computed, signal, split, View } from "nsh";

import { joinClassNames } from "./class-names";
import {
  type AriaProps,
  type DataProps,
  type GlobalDomProps,
  hostProps,
} from "./search-field-dom-props";
import { renderChildren } from "./render-children";
import {
  SearchFieldContext,
  SearchFieldGroupContext,
  type SearchFieldGroupContextValue,
} from "./search-field-context";

/* -------------------------------------------------------------------------------------------------
 * Render props
 * -----------------------------------------------------------------------------------------------*/

/**
 * The values HeroUI's `Group` hands to a render prop (React Aria
 * `Group.tsx:28-52`), as accessors per D17.
 */
export interface SearchFieldGroupRenderProps {
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
}

/** What the group's `className` function receives. */
export interface SearchFieldGroupClassNameRenderProps extends SearchFieldGroupRenderProps {
  /** The `group` slot's class string, before the caller's `className`. */
  defaultClassName: string;
}

/** What the group's `style` function receives. */
export interface SearchFieldGroupStyleRenderProps extends SearchFieldGroupRenderProps {
  /** An empty style object, as React Aria's `useRenderProps` supplies. */
  defaultStyle: ViewStyle;
}

/* -------------------------------------------------------------------------------------------------
 * SearchField Group
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `SearchField.Group`: HeroUI 3.2.7's `SearchFieldGroupProps`,
 * which is React Aria Components' `Group` (its `GroupProps` plus
 * `HoverEvents`), expressed with NSH's view host props.
 *
 * The DOM-only members upstream (`render`, `slot`, the other HTML attributes)
 * are accepted so code written against HeroUI keeps compiling; the port sheet
 * §1.3 says what each can and cannot do here.
 */
export interface SearchFieldGroupProps
  extends Omit<ViewProps, "children" | "class" | "style" | "ref" | "role">,
    AriaProps,
    DataProps,
    GlobalDomProps {
  /**
   * The group's content: the search icon, the input and the clear button. A
   * one-argument function is upstream's render-prop child (React Aria
   * `RenderProps<GroupRenderProps>`) and receives the group's values.
   */
  children?: JSX.Element | ((values: SearchFieldGroupRenderProps) => JSX.Element);

  /** Appended after the variant classes; later classes win. Function form gets the same accessors. */
  className?: string | ((values: SearchFieldGroupClassNameRenderProps) => string | undefined);

  /** Style of the group; function form gets the same accessors. */
  style?:
    | StyleProp<ViewStyle>
    | ((values: SearchFieldGroupStyleRenderProps) => StyleProp<ViewStyle>);

  /**
   * Dims the group, shows `not-allowed` and blocks the pointer. It does **not**
   * disable the input: upstream's `Group` never writes the input context, so
   * the field root disables its input separately (R-014).
   */
  isDisabled?: boolean;

  /** Paints the invalid outline / ring and the invalid fill (R-013, R-031). */
  isInvalid?: boolean;

  /** Accepted, no effect: the search field's stylesheet has no read-only rule for the group. */
  isReadOnly?: boolean;

  /** The group's ARIA role. @default "group" */
  role?: "group" | "region" | "presentation";

  /** The accessible name of the group itself. */
  "aria-label"?: string;

  /** The accessible name through the host prop, below `aria-label`. */
  accessibilityLabel?: string;

  /** A DOM id upstream; maps to `nativeID`, the name other elements refer to. */
  id?: string;

  /** The name other elements refer to (NSH's counterpart of a DOM id). */
  nativeID?: string;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;

  /** The pointer entered the group (off while disabled). */
  onHoverStart?: (event: NshMouseEvent) => void;

  /** The pointer left the group. */
  onHoverEnd?: (event: NshMouseEvent) => void;

  /** Both hover transitions, as React Aria's `useHover` reports them. */
  onHoverChange?: (isHovered: boolean) => void;

  /** NSH host mouse events, chained beside the internal hover tracking. */
  onMouseEnter?: (event: NshMouseEvent) => void;

  /** NSH host mouse events, chained beside the internal hover tracking. */
  onMouseLeave?: (event: NshMouseEvent) => void;

  /** The group's view, as `ComponentPropsWithRef` gives upstream. */
  ref?: (node: ViewRef) => void;
}

/**
 * `SearchField.Group` / `SearchFieldGroup`: the visual holder of the field's
 * row. It owns the hover and focus-within states HeroUI writes with `:hover`
 * and `:focus-within`, and it is where `SearchIcon` and `ClearButton` register
 * themselves so the input can drop its side padding (R-017, R-018).
 *
 * The one read of its children happens inside the group's own provider, at the
 * placement (the provider exception in the common rules).
 */
export function SearchFieldGroup(props: SearchFieldGroupProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "id",
    "nativeID",
    "role",
    "isDisabled",
    "isInvalid",
    "isReadOnly",
    "aria-label",
    "accessibilityLabel",
    "aria-disabled",
    "aria-invalid",
    "data-disabled",
    "data-invalid",
    "onMouseEnter",
    "onMouseLeave",
    "onHoverStart",
    "onHoverEnd",
    "onHoverChange",
    "slot",
    "render",
  ] as const);

  // Read once in the body: the field this group belongs to, when there is one
  // (research 4.6).
  const field = SearchFieldContext();

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

    return field?.isDisabled() ?? false;
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

    return field?.isInvalid() ?? false;
  });

  // --- Hover and focus-within ----------------------------------------------
  const hovered = signal(false);
  const localFocus = signal(false);

  // R-011 / R-012: upstream's `:focus-within` covers the group's subtree. The
  // input is the only focus stop and writes both the field's signal and this
  // group's, so inside a field the field's value is the authority (port sheet
  // §2); a group rendered alone keeps its own.
  const isFocusWithin = computed(() => (field ? field.focused() : localFocus()));

  const setFocusWithin = (value: boolean) => {
    localFocus.set(value);
  };

  // React Aria's `useRenderProps` hands these values to a function child, once,
  // at the placement (upstream `Group.tsx:70`).
  const groupRenderProps: SearchFieldGroupRenderProps = {
    isHovered: hovered,
    isFocusWithin,
    isFocusVisible: isFocusWithin,
    isDisabled,
    isInvalid,
  };

  // --- Icon / clear button registration ------------------------------------
  // Stands in for `:has([data-slot="search-field-search-icon"])` (R-017) and
  // `:has([slot="clear"])` (R-018): the parts register on creation and
  // unregister on cleanup, and the input reads the two counts.
  const searchIconCount = signal(0);
  const clearButtonCount = signal(0);

  const hasSearchIcon = computed(() => searchIconCount() > 0);
  const hasClearButton = computed(() => clearButtonCount() > 0);

  const registerSearchIcon = () => {
    searchIconCount.update((count) => count + 1);

    return () => searchIconCount.update((count) => Math.max(0, count - 1));
  };

  const registerClearButton = () => {
    clearButtonCount.update((count) => count + 1);

    return () => clearButtonCount.update((count) => Math.max(0, count - 1));
  };

  // --- Render props and classes --------------------------------------------
  const renderProps: SearchFieldGroupRenderProps = {
    isHovered: hovered,
    isFocusWithin,
    // A text input counts as focus-visible from its first frame (§1.3).
    isFocusVisible: isFocusWithin,
    isDisabled,
    isInvalid,
  };

  const classNameRenderProps: SearchFieldGroupClassNameRenderProps = {
    ...renderProps,
    defaultClassName: field?.slots.group() ?? "",
  };

  const styleRenderProps: SearchFieldGroupStyleRenderProps = {
    ...renderProps,
    defaultStyle: {},
  };

  const resolvedClassName = () => {
    const value = local.className;

    return typeof value === "function" ? value(classNameRenderProps) : value;
  };

  const resolvedStyle = () => {
    const value = local.style;

    return typeof value === "function" ? value(styleRenderProps) : value;
  };

  const classes = computed(() =>
    joinClassNames(field?.slots.group() ?? "", resolvedClassName()),
  );

  // --- Pointer --------------------------------------------------------------
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

  // --- Role -----------------------------------------------------------------
  const role = computed<"group" | "region" | "none">(() =>
    local.role === "presentation" ? "none" : (local.role ?? "group"),
  );

  const contextValue: SearchFieldGroupContextValue = {
    isDisabled,
    isInvalid,
    isFocusWithin,
    setFocusWithin,
    hasSearchIcon,
    hasClearButton,
    registerSearchIcon,
    registerClearButton,
  };

  const isSecondary = computed(() => field?.variant() === "secondary");

  return (
    <SearchFieldGroupContext.Provider value={contextValue}>
      <View
        {...hostProps(rest)}
        ref={(node) => local.ref?.(node)}
        nativeID={local.id ?? local.nativeID}
        role={role()}
        accessibilityLabel={local["aria-label"] ?? local.accessibilityLabel}
        // A `<div role="group">` is not a focus stop upstream; a caller's own
        // `focusable` still wins (it stays in `rest`).
        class={classes()}
        classList={{
          // R-013: the invalid primary group takes `--field-focus`.
          "bg-field-focus": isInvalid() && !isSecondary(),
          // R-030 / R-031: secondary keeps `--default` while focused and while
          // invalid; the variant already carries `bg-default`, and this
          // restates it after a hover fill could have applied.
          "bg-default": isSecondary() && (isFocusWithin() || isInvalid()),
          // R-012: `status-focused-field` → `ring-2 ring-focus ring-offset-0
          // outline-none`. Focus comes from the text input, so a pointer press
          // into it shows the ring too, as `:focus-within` does upstream.
          // Invalid groups use the danger pair below instead.
          "ring-2 ring-focus ring-offset-0 outline-none": isFocusWithin() && !isInvalid(),
          // R-013: `status-invalid-field`, unfocused half → `outline-1
          // outline-danger outline-solid`.
          "outline-1 outline-danger outline-solid": isInvalid() && !isFocusWithin(),
          // R-013: the focused half → `ring-2 ring-danger ring-offset-0`.
          "ring-2 ring-danger ring-offset-0 outline-none": isInvalid() && isFocusWithin(),
          // R-011: `:hover:not(:focus-within)` → `bg-field-hover`. The
          // focus-within exclusion must be a signal: NSH's variant order puts
          // `hover:` after `focus-within:`, so stacking those classes would let
          // hover win while focused. Later classes win, so this entry sits
          // after the invalid fills, as upstream's specificity puts hover over
          // the invalid rule.
          "bg-field-hover":
            hovered() && !isFocusWithin() && !isDisabled() && !isSecondary(),
          // R-029: the secondary twin of R-011 → `bg-default-hover`.
          "bg-default-hover":
            hovered() && !isFocusWithin() && !isDisabled() && isSecondary(),
          // R-014: `status-disabled` → `opacity: .5`, `cursor: not-allowed`,
          // `pointer-events: none`, with the literals the theme notes require.
          // The group does not set `View.disabled`: upstream's group has no
          // `aria-disabled`, and the accessibility state would announce a
          // disabled group that still holds an editable input.
          "opacity-50 cursor-not-allowed pointer-events-none": isDisabled(),
        }}
        style={resolvedStyle()}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* The single read of the group's children, at the placement inside
            its provider (research 4.1 / 4.6). */}
        {renderGroupChildren(local.children, groupRenderProps)}
      </View>
    </SearchFieldGroupContext.Provider>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Helpers
 * -----------------------------------------------------------------------------------------------*/

/**
 * Renders the group's children: a one-argument function is upstream's render
 * prop and receives the group's values; NSH's reactive children are
 * zero-argument and take `renderChildren`'s per-value path.
 */
function renderGroupChildren(
  node: JSX.Element | ((values: SearchFieldGroupRenderProps) => JSX.Element),
  values: SearchFieldGroupRenderProps,
): JSX.Element {
  if (typeof node === "function" && node.length >= 1) {
    return renderChildren((node as (values: SearchFieldGroupRenderProps) => JSX.Element)(values));
  }

  return renderChildren(node as JSX.Element);
}
