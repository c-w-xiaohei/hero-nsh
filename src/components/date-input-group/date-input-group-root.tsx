import type { Accessor, Bounds, JSX, StyleProp, ViewRef, ViewStyle } from "nsh";
import { computed, effect, reduceMotion, signal, split, untracked, View } from "nsh";

import {
  createInteractionModality,
  type InteractionModalityState,
} from "../../primitives/create-interaction-modality";
import {
  DateInputGroupContext,
  type DateInputGroupContextValue,
  DateInputGroupFieldContext,
} from "./date-input-group-context";
import type { DateInputGroupVariant } from "./date-input-group.styles";
import { dateInputGroupVariants } from "./date-input-group.styles";
import { renderChildren } from "./render-children";

/* -------------------------------------------------------------------------------------------------
 * Render props and events
 * -----------------------------------------------------------------------------------------------*/

/**
 * What the root's render props receive (HeroUI's `GroupRenderProps`). Per D17
 * the five booleans are accessors, so the subtree the function returns follows
 * the group without being rebuilt.
 */
export interface DateInputGroupRenderProps {
  isHovered: Accessor<boolean>;
  isFocusWithin: Accessor<boolean>;
  isFocusVisible: Accessor<boolean>;
  isDisabled: Accessor<boolean>;
  isInvalid: Accessor<boolean>;
}

/**
 * React Aria's `HoverEvent`, as NSH can report it: the mouse events a view
 * receives carry no DOM target, so `target` stays undefined (registered in the
 * port sheet §8).
 */
export interface DateInputGroupHoverEvent {
  type: "hoverstart" | "hoverend" | "hover";
  pointerType: "mouse" | "pen" | "touch";
  target?: undefined;
}

/** The props of `DateInputGroup.Root`, HeroUI's `DateInputGroupRootProps`. */
export interface DateInputGroupRootProps {
  /**
   * The group's content: an element, or a render prop called once with the
   * group state (D17). Bare strings become `Text` at the placement.
   */
  children?: JSX.Element | ((values: DateInputGroupRenderProps) => JSX.Element);

  /** Appended after the variant classes; later classes win. The function form gets the same accessors. */
  className?: string | ((values: DateInputGroupRenderProps) => string | undefined);

  /** The root's style; the function form gets the same accessors. */
  style?: StyleProp<ViewStyle> | ((values: DateInputGroupRenderProps) => StyleProp<ViewStyle>);

  /** `true` makes the group fill its container (`w-full`, R-033). */
  fullWidth?: boolean;

  /** `primary` by default; `secondary` drops the shadow and uses the default fill (R-027, R-028). */
  variant?: DateInputGroupVariant;

  /** Whether the whole group is disabled (R-008). */
  isDisabled?: boolean;

  /** Whether the group is invalid (R-007). */
  isInvalid?: boolean;

  /** Whether its segments cannot be edited. Has no separate look. */
  isReadOnly?: boolean;

  /** The group's role; `presentation` maps to NSH's `none`. */
  role?: "group" | "region" | "presentation";

  /** Accepted, no effect: NSH has no slot collection (the DateField unit keys its own fields). */
  slot?: string;

  /** The group was hovered: its only keyboard / pointer modality entry, through `onMouseEnter`. */
  onHoverStart?: (event: DateInputGroupHoverEvent) => void;

  /** Every hover transition. */
  onHoverChange?: (isHovering: boolean) => void;

  /** The pointer left the group. */
  onHoverEnd?: (event: DateInputGroupHoverEvent) => void;

  /** The root was laid out. */
  onLayout?: (event: { bounds: Bounds }) => void;

  /** An identifier for UI tests. */
  testID?: string;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** The name other elements refer to. */
  nativeID?: string;

  /** The accessible name of the group; HeroUI's `aria-label`. */
  "aria-label"?: string;

  /** NSH's own accessible name; `aria-label` wins. */
  accessibilityLabel?: string;

  /** Accepted, no effect: NSH has no cross-element references. */
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-details"?: string;

  /** Whether assistive technologies report the group disabled (`aria-disabled` upstream). */
  "aria-disabled"?: boolean;

  /** Upstream's `aria-invalid`; the last fallback of the invalid state. */
  "aria-invalid"?: boolean;

  /** Accepted, no effect: NSH cannot replace a host element. */
  render?: unknown;

  /** The group's view. Forwarded as a callback only: an undefined ref store throws on the web. */
  ref?: (node: ViewRef) => void;

  /** Any other DOM / global attribute HeroUI's `Group` accepts; no effect here (D18). */
  [key: string]: unknown;
}

/* -------------------------------------------------------------------------------------------------
 * Root
 * -----------------------------------------------------------------------------------------------*/

/**
 * DateInputGroup.Root / DateInputGroupRoot: the group box around a date or time
 * field's segments and affixes.
 *
 * It provides `DateInputGroupContext` and reads its children exactly once,
 * inside that provider, so the parts the caller places in it see the group
 * state (research 4.1, `_common`'s provider exception). Every appearance rule
 * the stylesheet attached to a state or a `:has()` selector is a computed
 * class string here; the three `:has()` rules are registrations the affixes
 * and the range separator report (port sheet §4).
 */
export function DateInputGroupRoot(props: DateInputGroupRootProps): JSX.Element {
  const [local] = split(props, [
    "children",
    "className",
    "style",
    "fullWidth",
    "variant",
    "isDisabled",
    "isInvalid",
    "isReadOnly",
    "role",
    "slot",
    "onHoverStart",
    "onHoverChange",
    "onHoverEnd",
    "onLayout",
    "testID",
    "id",
    "nativeID",
    "aria-label",
    "accessibilityLabel",
    "aria-labelledby",
    "aria-describedby",
    "aria-details",
    "aria-disabled",
    "aria-invalid",
    "render",
    "ref",
  ] as const);

  // The field this group belongs to, when its owner provides one. Root reads
  // it for its own disabled / invalid / read-only fallbacks only; the segments
  // and the Input read the field state directly (port sheet §2).
  const field = DateInputGroupFieldContext();

  const variant = computed<DateInputGroupVariant>(() => local.variant ?? "primary");
  const fullWidth = computed(() => local.fullWidth ?? false);

  const slots = computed(() => dateInputGroupVariants({ variant: variant(), fullWidth: fullWidth() }));

  const isDisabled = computed(
    () => local.isDisabled ?? field?.isDisabled() ?? local["aria-disabled"] === true,
  );
  const isInvalid = computed(
    () => local.isInvalid ?? field?.isInvalid() ?? local["aria-invalid"] === true,
  );
  const isReadOnly = computed(() => local.isReadOnly ?? field?.isReadOnly() ?? false);

  // --- Hover (R-005, R-029) --------------------------------------------------
  const hovered = signal(false);

  const hoverEvent = (type: DateInputGroupHoverEvent["type"]): DateInputGroupHoverEvent => ({
    type,
    pointerType: "mouse",
    target: undefined,
  });

  const handleMouseEnter = () => {
    if (isDisabled()) {
      return;
    }

    hovered.set(true);
    local.onHoverStart?.(hoverEvent("hoverstart"));
    local.onHoverChange?.(true);
  };

  const handleMouseLeave = () => {
    hovered.set(false);
    local.onHoverEnd?.(hoverEvent("hoverend"));
    local.onHoverChange?.(false);
  };

  // --- Focus registration (R-006) -------------------------------------------
  // NSH's group is not a focusable element and focus does not bubble, so every
  // focusable part registers an accessor and the root aggregates them. The
  // picker triggers register separately: their focus counts as focus-within
  // but suppresses the ring, which is what the stylesheet's `:has()` does.
  const focusTargets = signal<readonly Accessor<boolean>[]>([]);
  const triggerTargets = signal<readonly Accessor<boolean>[]>([]);

  const registerFocusTarget = (isFocused: Accessor<boolean>) => {
    focusTargets.set([...focusTargets(), isFocused]);

    return () => {
      focusTargets.set(focusTargets().filter((target) => target !== isFocused));
    };
  };

  const registerTriggerFocus = (isFocused: Accessor<boolean>) => {
    triggerTargets.set([...triggerTargets(), isFocused]);

    return () => {
      triggerTargets.set(triggerTargets().filter((target) => target !== isFocused));
    };
  };

  const triggerFocused = computed(() => triggerTargets().some((target) => target()));
  const isFocusWithin = computed(
    () => focusTargets().some((target) => target()) || triggerFocused(),
  );

  // --- Affix / separator registrations (R-010 … R-012) ----------------------
  const prefixCount = signal(0);
  const suffixCount = signal(0);
  const separatorCount = signal(0);

  const registerPrefix = () => {
    prefixCount.set(prefixCount() + 1);

    return () => prefixCount.set(Math.max(0, prefixCount() - 1));
  };

  const registerSuffix = () => {
    suffixCount.set(suffixCount() + 1);

    return () => suffixCount.set(Math.max(0, suffixCount() - 1));
  };

  const registerRangeSeparator = () => {
    separatorCount.set(separatorCount() + 1);

    return () => separatorCount.set(Math.max(0, separatorCount() - 1));
  };

  const hasPrefix = computed(() => prefixCount() > 0);
  const hasSuffix = computed(() => suffixCount() > 0);
  const hasRangeSeparator = computed(() => separatorCount() > 0);

  // --- Modality --------------------------------------------------------------
  const modality: InteractionModalityState = createInteractionModality();
  const isFocusVisible = computed(() => isFocusWithin() && modality.isKeyboard());

  // React Aria sets the modality from the event that caused it, never from a
  // focus event (`@react-aria/interactions/src/useFocusVisible.ts:86-92`): a
  // keydown or a pointer press does, a programmatic `focus()` does not. NSH
  // reports no keydown for Tab, so a focus that no press asked for is the
  // keyboard arriving; a press marks the focus it is about to take, and its
  // own focus handler must not turn it into a keyboard interaction.
  let focusFromPointer = false;

  const requestPointerFocus = () => {
    focusFromPointer = true;
  };

  const consumePointerFocus = () => {
    const value = focusFromPointer;

    focusFromPointer = false;

    return value;
  };

  const setKeyboardModality = () => {
    // Any keyboard interaction invalidates a mark left by a press that did not
    // move the focus after all.
    focusFromPointer = false;
    modality.setKeyboardModality();
  };

  // React Aria commits the edited value and runs validation when the focus
  // leaves the whole field, not when it moves between segments
  // (`@react-aria/datepicker/src/useDateField.ts:105-116`, `useFocusWithin`'s
  // `onBlurWithin`). The group is the field's boundary: its registered targets
  // are the segments and the picker triggers, so a focus moving to a trigger
  // stays inside and does not commit.
  let hadFocusWithin = false;

  effect(() => {
    const value = isFocusWithin();

    if (hadFocusWithin && !value) {
      field?.commit();
    }

    hadFocusWithin = value;
  });

  // --- Classes and style (R-001 … R-008, R-027 … R-031, R-033) --------------
  const renderProps: DateInputGroupRenderProps = {
    isHovered: hovered,
    isFocusWithin,
    isFocusVisible,
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
    const parts = [slots().base()];

    // R-005: `:hover:not(:focus-within)` → `bg-field-hover`, off while disabled.
    if (hovered() && !isFocusWithin() && !isDisabled()) {
      parts.push("bg-field-hover");
    }

    // R-006: `[data-focus-within=true]:not(:has(trigger:focus))` →
    // `status-focused-field` (`ring-2 ring-focus ring-offset-0 outline-none`).
    if (isFocusWithin() && !triggerFocused()) {
      parts.push("ring-2 ring-focus ring-offset-0 outline-none");
    }

    // R-007: `[data-invalid=true]` → `status-invalid-field` plus the field
    // focus fill; focused, the 2px danger ring replaces the outline's colour
    // role — both stay, the ring paints over it.
    if (isInvalid()) {
      parts.push("outline-1 outline-danger outline-solid bg-field-focus");

      if (isFocusWithin()) {
        parts.push("ring-2 ring-danger ring-offset-0");
      }
    }

    // R-008: `[data-disabled=true]`, `[aria-disabled=true]` → `status-disabled`.
    // The values are literals because the theme carries no such variables.
    if (isDisabled()) {
      parts.push("opacity-50 cursor-not-allowed pointer-events-none");
    }

    // R-029: secondary hover background.
    if (variant() === "secondary" && hovered() && !isFocusWithin() && !isDisabled()) {
      parts.push("bg-default-hover");
    }

    // R-030: secondary focus background, after hover so it wins.
    if (variant() === "secondary" && isFocusWithin()) {
      parts.push("bg-default");
    }

    // R-031: secondary invalid background, after R-007's `bg-field-focus`.
    if (variant() === "secondary" && isInvalid()) {
      parts.push("bg-default");
    }

    const own = resolvedClassName() ?? "";

    return [...parts, own].filter((part) => part.length > 0).join(" ");
  });

  // R-003: the three transitioned properties upstream. NSH animates through a
  // class and a property list; the class carries duration / curve (R-001's
  // base), and reduced motion turns the list off.
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

  const contextValue: DateInputGroupContextValue = {
    slots,
    isDisabled,
    isInvalid,
    isReadOnly,
    isFocusWithin,
    isFocusVisible,
    isKeyboard: modality.isKeyboard,
    setKeyboardModality,
    setPointerModality: modality.setPointerModality,
    requestPointerFocus,
    consumePointerFocus,
    hasPrefix,
    hasSuffix,
    hasRangeSeparator,
    triggerFocused,
    registerPrefix,
    registerSuffix,
    registerRangeSeparator,
    registerFocusTarget,
    registerTriggerFocus,
  };

  return (
    <DateInputGroupContext.Provider value={contextValue}>
      <View
        ref={(node) => local.ref?.(node)}
        role={role()}
        nativeID={local.id ?? local.nativeID}
        testID={local.testID}
        accessibilityLabel={local["aria-label"] ?? local.accessibilityLabel}
        accessibilityState={isDisabled() ? { disabled: true } : undefined}
        class={classes()}
        style={style()}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onLayout={local.onLayout}
      >
        {resolveRootChildren(local.children, renderProps)}
      </View>
    </DateInputGroupContext.Provider>
  );
}

/** The one read of `props.children`, at the placement inside the provider. */
function resolveRootChildren(
  children: JSX.Element | ((values: DateInputGroupRenderProps) => JSX.Element),
  renderProps: DateInputGroupRenderProps,
): JSX.Element {
  if (typeof children === "function" && children.length >= 1) {
    return renderChildren(
      untracked(() =>
        (children as (values: DateInputGroupRenderProps) => JSX.Element)(renderProps),
      ),
    );
  }

  return renderChildren(children as JSX.Element);
}
