import type {
  AccessibilityRole,
  AccessibilityState,
  JSX,
  StyleProp,
  ViewProps,
  ViewRef,
  ViewStyle,
} from "nsh";
import { computed, split, View } from "nsh";

import { renderChildren } from "./children";
import { FieldsetContext, type FieldsetContextValue } from "./context";
import type { FieldsetDomProps } from "./fieldset-dom-props";
import { fieldsetVariants } from "./fieldset.styles";

/* -------------------------------------------------------------------------------------------------
 * Fieldset Root
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Fieldset.Root`: HeroUI 3.2.7's `FieldsetRootProps`, the props of
 * a `<fieldset>` element, expressed with NSH's view host props.
 *
 * `disabled`, `role` and `aria-label` are the three members that do something
 * here: `disabled` becomes the disabled scope of `FieldsetContext` (§5.2),
 * `role` names the group (§5.3), `aria-label` is the only channel that can name
 * the group at all (§5.3). The rest of the DOM surface is accepted so that code
 * written against HeroUI keeps compiling; see `FieldsetDomProps`.
 */
export interface FieldsetRootProps
  extends Omit<ViewProps, "children" | "class" | "style" | "ref" | "role" | "disabled">,
    FieldsetDomProps {
  children?: JSX.Element;

  /** Appended after the variant classes; later classes win. */
  className?: string;

  style?: StyleProp<ViewStyle>;

  /** Forwarded as a callback only (a ref store throws on the web target). */
  ref?: (node: ViewRef) => void;

  /**
   * Disables the whole subtree, as `<fieldset disabled>` does. Only `true`
   * counts, exactly as upstream (`fieldset.tsx:52`). Nothing is written to the
   * host: the effect travels through `FieldsetContext`, which every control
   * inside reads.
   */
  disabled?: boolean;

  /**
   * The role of the group. `<fieldset>`'s implicit role is `group`; an explicit
   * value wins, and `"presentation"` maps to NSH's `"none"` (§5.3).
   */
  role?: AccessibilityRole | "presentation";

  /** A DOM id upstream; maps to `nativeID`, the name other elements refer to. */
  id?: string;

  /** `AriaLabelingProps`: the only way to name the group here (§5.3). */
  "aria-label"?: string;
}

export function FieldsetRoot(props: FieldsetRootProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "disabled",
    "role",
    "id",
    "nativeID",
    "name",
    "form",
    "render",
    "aria-label",
    "aria-labelledby",
    "aria-describedby",
    "aria-details",
  ] as const);

  // §2: the component's only state source. `disabled` is read-only by design
  // (the caller owns it), so there is nothing to store and no
  // `createControllableSignal` here; the accessor itself is the shared value.
  const isDisabled = computed(() => local.disabled === true);

  // The whole context value, handed to the subtree. A stable accessor, so a
  // change from `true` back to `false` reaches every consumer without the
  // subtree remounting (upstream instead re-wraps or drops its `Provider`).
  const contextValue: FieldsetContextValue = { isDisabled };

  // §2 derived: `<fieldset>`'s implicit role is `group`; an explicit `role`
  // overrides it, and `"presentation"` is NSH's spelling of `"none"`.
  const role = computed<AccessibilityRole>(() =>
    local.role === "presentation" ? "none" : (local.role ?? "group"),
  );

  // §2 derived: `data-disabled` is the hook for the `[data-disabled] .label`
  // descendant selector upstream (R-008). NSH has no attribute channel, so the
  // same fact is exposed as accessibility state and as the context above.
  const accessibilityState = computed<AccessibilityState>(() => ({
    ...props.accessibilityState,
    disabled: isDisabled() || props.accessibilityState?.disabled === true,
  }));

  const classes = computed(() =>
    fieldsetVariants().base({ className: local.className }),
  );

  // The one read of `props.children`, inside the provider and at the placement
  // (research 4.1, 4.6; a component that provides a context must read it here,
  // not through a `computed` created outside the provider's owner). The value
  // goes through this unit's `renderChildren`, the way `<fieldset>` shows a
  // bare string: upstream types the prop as `ReactNode` and renders
  // `<Fieldset>Content</Fieldset>` as text (fieldset.test.tsx:25, :34-36), while
  // a string directly inside a `View` is not drawn.
  return (
    <FieldsetContext.Provider value={contextValue}>
      <View
        {...rest}
        ref={(node) => local.ref?.(node)}
        nativeID={local.id ?? local.nativeID}
        class={classes()}
        style={local.style}
        role={role()}
        accessibilityLabel={local["aria-label"] ?? props.accessibilityLabel}
        accessibilityState={accessibilityState()}
        // A `<fieldset>` is not a focus stop upstream (common rules).
        focusable={props.focusable ?? false}
      >
        {renderChildren(local.children)}
      </View>
    </FieldsetContext.Provider>
  );
}
