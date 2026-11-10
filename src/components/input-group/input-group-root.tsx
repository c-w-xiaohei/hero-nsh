import type {
  Accessor,
  Bounds,
  JSX,
  PressEvent,
  StyleProp,
  ViewRef,
  ViewStyle,
} from "nsh";
import { computed, reduceMotion, signal, split, untracked, View } from "nsh";

import {
  createInteractionModality,
  type InteractionModalityState,
} from "../../primitives/create-interaction-modality";
import { TextFieldContext } from "../textfield/textfield-context";
import {
  type AriaProps,
  type DataProps,
  type GlobalDomProps,
  hostProps,
} from "./input-group-dom-props";
import {
  InputGroupContext,
  type InputGroupContextValue,
} from "./input-group-context";
import type { InputGroupVariant } from "./input-group.styles";
import { inputGroupVariants } from "./input-group.styles";
import { renderChildren } from "./render-children";

/* -------------------------------------------------------------------------------------------------
 * Render props and events
 * -----------------------------------------------------------------------------------------------*/

/**
 * What the root's render props receive (HeroUI's `GroupRenderProps`). Per D17
 * the five booleans are accessors, so the subtree the function returns follows
 * the group without being rebuilt.
 */
export interface InputGroupRenderProps {
  isHovered: Accessor<boolean>;
  isFocusWithin: Accessor<boolean>;
  isFocusVisible: Accessor<boolean>;
  isDisabled: Accessor<boolean>;
  isInvalid: Accessor<boolean>;
}

/**
 * React Aria's `HoverEvent`, as NSH can report it: a view's mouse events carry
 * no DOM target, so `target` stays undefined (port sheet §8, item 7).
 */
export interface InputGroupHoverEvent {
  type: "hoverstart" | "hoverend" | "hover";
  pointerType: "mouse" | "pen" | "touch";
  target?: undefined;
}

/** What `className`'s function form receives. */
export interface InputGroupClassNameRenderProps extends InputGroupRenderProps {
  /** The `base` slot's class string, before the caller's `className`. */
  defaultClassName: string;
}

/** What `style`'s function form receives. */
export interface InputGroupStyleRenderProps extends InputGroupRenderProps {
  /** An empty style object, as React Aria's `useRenderProps` supplies. */
  defaultStyle: ViewStyle;
}

/** The props of `InputGroup.Root`, HeroUI's `InputGroupRootProps`. */
export interface InputGroupRootProps extends AriaProps, DataProps, GlobalDomProps {
  /**
   * The group's content: the affixes and the control, or a render prop called
   * once with the group state (D17). Bare strings become `Text` at the
   * placement.
   */
  children?: JSX.Element | ((values: InputGroupRenderProps) => JSX.Element);

  /** Appended after the variant classes; later classes win. Function form gets the same accessors. */
  className?: string | ((values: InputGroupClassNameRenderProps) => string | undefined);

  /** Style of the group; function form gets the same accessors. */
  style?: StyleProp<ViewStyle> | ((values: InputGroupStyleRenderProps) => StyleProp<ViewStyle>);

  /** `primary` by default; `secondary` drops the shadow and uses the default fill (R-033). */
  variant?: InputGroupVariant;

  /** `true` makes the group fill its container (`w-full`, R-038). @default false */
  fullWidth?: boolean;

  /**
   * Dims the group, shows `not-allowed` and blocks the pointer (R-014). It does
   * not disable the control: upstream's `Group` never writes the input context.
   */
  isDisabled?: boolean;

  /** Paints the invalid outline / ring and the invalid fill (R-013, R-036). */
  isInvalid?: boolean;

  /** Accepted; upstream's group has no separate look for read only. */
  isReadOnly?: boolean;

  /** The group's role; inside a TextField it is `presentation` upstream (NSH's `none`). */
  role?: "group" | "region" | "presentation";

  /** A press anywhere in the group: the input takes the focus first, then the caller runs. */
  onClick?: (event: PressEvent) => void;

  /** The pointer entered the group (off while disabled). */
  onHoverStart?: (event: InputGroupHoverEvent) => void;

  /** Both hover transitions, as React Aria's `useHover` reports them. */
  onHoverChange?: (isHovered: boolean) => void;

  /** The pointer left the group. */
  onHoverEnd?: (event: InputGroupHoverEvent) => void;

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

  /** Whether assistive technologies report the group disabled; the last fallback of the state. */
  "aria-disabled"?: boolean;

  /** Upstream's `aria-invalid`; the last fallback of the invalid state. */
  "aria-invalid"?: boolean;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect: NSH cannot replace a host element. */
  render?: unknown;

  /** The group's view, forwarded as a callback only: an undefined ref store throws on the web. */
  ref?: (node: ViewRef) => void;

  /** Any other DOM / global attribute HeroUI's `Group` accepts; no effect here (D18). */
  [key: string]: unknown;
}

/* -------------------------------------------------------------------------------------------------
 * Root
 * -----------------------------------------------------------------------------------------------*/

/**
 * InputGroup.Root / InputGroupRoot: the group box around an input or a textarea
 * and its affixes.
 *
 * It provides `InputGroupContext` and reads its children exactly once, inside
 * that provider, so the parts the caller places in it see the group state
 * (research 4.1, `_common`'s provider exception). Every appearance rule the
 * stylesheet attached to a state or a `:has()` selector is a computed class
 * string here; the three `:has()` rules are registrations the affixes and the
 * textarea report (port sheet §4).
 */
export function InputGroupRoot(props: InputGroupRootProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "variant",
    "fullWidth",
    "isDisabled",
    "isInvalid",
    "isReadOnly",
    "role",
    "onClick",
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
    "slot",
    "render",
    "ref",
  ] as const);

  // Read once in the body: the field this group belongs to, when there is one
  // (research 4.6). React Aria's TextField also injects `variant`,
  // `isDisabled`, `isInvalid` and `role="presentation"` into its `GroupContext`
  // (`TextField.tsx:165-170`), which the three fallbacks below stand in for.
  const field = TextFieldContext();

  const variant = computed<InputGroupVariant>(() => local.variant ?? field?.variant() ?? "primary");
  const fullWidth = computed(() => local.fullWidth ?? false);

  const slots = computed(() => inputGroupVariants({ variant: variant(), fullWidth: fullWidth() }));

  const isDisabled = computed(
    () => local.isDisabled ?? field?.isDisabled() ?? local["aria-disabled"] === true,
  );
  const isInvalid = computed(
    () => local.isInvalid ?? field?.isInvalid() ?? local["aria-invalid"] === true,
  );
  const isReadOnly = computed(() => local.isReadOnly ?? false);

  // --- Hover (R-011, R-034) --------------------------------------------------
  const hovered = signal(false);

  const hoverEvent = (type: InputGroupHoverEvent["type"]): InputGroupHoverEvent => ({
    type,
    pointerType: "mouse",
    target: undefined,
  });

  const handleMouseEnter = () => {
    if (isDisabled() || hovered()) {
      return;
    }

    hovered.set(true);
    local.onHoverStart?.(hoverEvent("hoverstart"));
    local.onHoverChange?.(true);
  };

  const handleMouseLeave = () => {
    if (!hovered()) {
      return;
    }

    hovered.set(false);
    local.onHoverEnd?.(hoverEvent("hoverend"));
    local.onHoverChange?.(false);
  };

  // --- Focus registration (R-012, R-035) ------------------------------------
  // NSH's group is not a focusable element and focus does not bubble, so the
  // input and the textarea report an accessor and the root aggregates them;
  // this replaces the stylesheet's `:has(…:focus)`.
  const focusTargets = signal<readonly Accessor<boolean>[]>([]);

  const registerFocusTarget = (isFocused: Accessor<boolean>) => {
    focusTargets.set([...focusTargets(), isFocused]);

    return () => {
      focusTargets.set(focusTargets().filter((target) => target !== isFocused));
    };
  };

  const isFocusWithin = computed(() => focusTargets().some((target) => target()));

  // The single-line input's `focus()`, upstream's `querySelector("input")`.
  // A textarea does not register: upstream focuses only an `<input>`.
  let inputFocus: (() => void) | undefined;

  const registerInputFocus = (focus: () => void) => {
    inputFocus = focus;

    return () => {
      if (inputFocus === focus) {
        inputFocus = undefined;
      }
    };
  };

  const focusInput = () => {
    if (!isDisabled()) {
      inputFocus?.();
    }
  };

  // --- Affix / textarea registrations (R-008, R-016, R-017) ------------------
  const prefixCount = signal(0);
  const suffixCount = signal(0);
  const textAreaCount = signal(0);

  const registerPrefix = () => {
    prefixCount.set(prefixCount() + 1);

    return () => prefixCount.set(Math.max(0, prefixCount() - 1));
  };

  const registerSuffix = () => {
    suffixCount.set(suffixCount() + 1);

    return () => suffixCount.set(Math.max(0, suffixCount() - 1));
  };

  const registerTextArea = () => {
    textAreaCount.set(textAreaCount() + 1);

    return () => textAreaCount.set(Math.max(0, textAreaCount() - 1));
  };

  const hasPrefix = computed(() => prefixCount() > 0);
  const hasSuffix = computed(() => suffixCount() > 0);
  const hasTextArea = computed(() => textAreaCount() > 0);

  // --- Modality --------------------------------------------------------------
  const modality: InteractionModalityState = createInteractionModality();
  const isFocusVisible = computed(() => isFocusWithin() && modality.isKeyboard());

  // A mark left by a press that did not end up moving the focus: the next
  // focus then belongs to the keyboard, as React Aria's `useFocusVisible`
  // decides from the event that caused the focus, never from the focus event.
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
    focusFromPointer = false;
    modality.setKeyboardModality();
  };

  // --- Render props and classes --------------------------------------------
  const renderProps: InputGroupRenderProps = {
    isHovered: hovered,
    isFocusWithin,
    isFocusVisible,
    isDisabled,
    isInvalid,
  };

  const classNameRenderProps: InputGroupClassNameRenderProps = {
    ...renderProps,
    defaultClassName: slots().base(),
  };

  const styleRenderProps: InputGroupStyleRenderProps = {
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

  const classes = computed(() => {
    const parts = [slots().base()];

    // R-008: `.input-group:has([data-slot="input-group-textarea"])` →
    // `@apply items-start` (`height: auto` is NSH's default content sizing).
    if (hasTextArea()) {
      parts.push("items-start");
    }

    // R-011: `:hover:not(:focus-within)` → `bg-field-hover`, off while disabled.
    if (hovered() && !isFocusWithin() && !isDisabled()) {
      parts.push("bg-field-hover");
    }

    // R-012: `:has(input:focus), :has(textarea:focus)` →
    // `status-focused-field` (`ring-2 ring-focus ring-offset-0 outline-none`)
    // plus the focus fill. Upstream's selector is `:focus`, not
    // `:focus-visible`, so a pointer press into the control shows it too.
    if (isFocusWithin()) {
      parts.push("ring-2 ring-focus ring-offset-0 outline-none bg-field-focus");
    }

    // R-013: `[data-invalid="true"]` → `status-invalid-field` plus the field
    // focus fill; focused, the 2px danger ring paints over the outline.
    if (isInvalid()) {
      parts.push("outline-1 outline-danger outline-solid bg-field-focus");

      if (isFocusWithin()) {
        parts.push("ring-2 ring-danger ring-offset-0");
      }
    }

    // R-014: `[data-disabled="true"]`, `[aria-disabled="true"]` →
    // `status-disabled`. The values are literals: the theme has no such tokens.
    if (isDisabled()) {
      parts.push("opacity-50 cursor-not-allowed pointer-events-none");
    }

    // R-034: secondary hover background.
    if (variant() === "secondary" && hovered() && !isFocusWithin() && !isDisabled()) {
      parts.push("bg-default-hover");
    }

    // R-035: secondary focus background, after R-012's `bg-field-focus`.
    if (variant() === "secondary" && isFocusWithin()) {
      parts.push("bg-default");
    }

    // R-036: secondary invalid background, after R-013's `bg-field-focus`.
    if (variant() === "secondary" && isInvalid()) {
      parts.push("bg-default");
    }

    const own = resolvedClassName() ?? "";

    return [...parts, own].filter((part) => part.length > 0).join(" ");
  });

  // R-009: the three transitioned properties upstream. NSH animates through a
  // class and a property list; the class carries duration / curve (R-005's
  // base), and reduced motion turns the list off. Upstream gives box-shadow
  // `ease-out`; sharing one property list makes it `ease-smooth` (§8).
  const style = computed<StyleProp<ViewStyle>>(() => [
    {
      transitionProperty: reduceMotion() ? "none" : "background-color, border-color, box-shadow",
    },
    resolvedStyle(),
  ]);

  const role = computed<"group" | "region" | "none">(() => {
    if (local.role === "presentation") {
      return "none";
    }

    if (local.role !== undefined) {
      return local.role;
    }

    // Upstream's TextField injects `role="presentation"` into `GroupContext`.
    return field ? "none" : "group";
  });

  // R-005 / R-009: a press on the affixes or the padding moves the focus into
  // the input, as upstream's `handleClick` does with `querySelector("input")`.
  const handlePress = (event: PressEvent) => {
    focusInput();
    local.onClick?.(event);
  };

  const contextValue: InputGroupContextValue = {
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
    hasTextArea,
    registerPrefix,
    registerSuffix,
    registerTextArea,
    registerFocusTarget,
    registerInputFocus,
    focusInput,
  };

  return (
    <InputGroupContext.Provider value={contextValue}>
      <View
        {...hostProps(rest)}
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
        onPress={handlePress}
        onLayout={local.onLayout}
      >
        {resolveRootChildren(local.children, renderProps)}
      </View>
    </InputGroupContext.Provider>
  );
}

/** The one read of `props.children`, at the placement inside the provider. */
function resolveRootChildren(
  children: JSX.Element | ((values: InputGroupRenderProps) => JSX.Element),
  renderProps: InputGroupRenderProps,
): JSX.Element {
  if (typeof children === "function" && children.length >= 1) {
    return renderChildren(
      untracked(() => (children as (values: InputGroupRenderProps) => JSX.Element)(renderProps)),
    );
  }

  return renderChildren(children as JSX.Element);
}
