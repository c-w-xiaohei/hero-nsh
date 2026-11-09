import type {
  AccessibilityState,
  Bounds,
  JSX,
  MouseEvent as NshMouseEvent,
  PressEvent,
  StyleProp,
  ViewRef,
  ViewStyle,
} from "nsh";
import {
  cleanup,
  computed,
  effect,
  reduceMotion,
  signal,
  split,
  View,
} from "nsh";
import type { Accessor } from "nsh";

import {
  createKeymapScope,
  createTypeSelect,
  isKeyboardPress,
  type KeyboardDelegate,
  ListKeyboardDelegate,
  OverlayTriggerContext,
} from "../../primitives";
import { renderChildren } from "../list-box/children";
import {
  SelectContext,
  SelectTriggerContext,
  type SelectTriggerContextValue,
} from "./select-context";

/* -------------------------------------------------------------------------------------------------
 * Render props
 * -----------------------------------------------------------------------------------------------*/

/**
 * What a trigger `children` function receives: React Aria's
 * `ButtonRenderProps`. Every flag is an accessor (D17); `isPending` is always
 * `false`, since a Select has no pending state.
 */
export interface SelectTriggerRenderProps {
  isHovered: Accessor<boolean>;
  isPressed: Accessor<boolean>;
  isFocused: Accessor<boolean>;
  isFocusVisible: Accessor<boolean>;
  isDisabled: Accessor<boolean>;
  isPending: Accessor<boolean>;
}

export interface SelectTriggerProps {
  /** The trigger's content, or a render prop called once with accessors. */
  children?:
    | JSX.Element
    | ((values: SelectTriggerRenderProps) => JSX.Element);

  /** Appended after the variant classes; function form gets the same accessors. */
  className?: string | ((values: SelectTriggerRenderProps) => string);

  style?:
    | StyleProp<ViewStyle>
    | ((values: SelectTriggerRenderProps) => StyleProp<ViewStyle>);

  ref?: (node: ViewRef) => void;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;
  nativeID?: string;
  testID?: string;
  tooltip?: JSX.Element;

  /** Overrides the root's `isDisabled`; the clear button reads this value. */
  isDisabled?: boolean;

  /** Focuses the trigger after mount (macOS and the web). */
  autoFocus?: boolean;

  /** Accepted, no effect: NSH has no tab index, only `focusable`. */
  excludeFromTabOrder?: boolean;

  /** Accepted, no effect: there is no form button to submit. */
  type?: "button" | "submit" | "reset";
  form?: string;
  name?: string;
  value?: string;

  /** The trigger was pressed (a pointer, Return or Space; it opens or closes). */
  onPress?: (e: PressEvent) => void;

  onPressDown?: (e: PressEvent) => void;

  onPressUp?: (e: PressEvent) => void;

  onPressStart?: (e: PressEvent) => void;

  onPressEnd?: (e: PressEvent) => void;

  onPressChange?: (isPressed: boolean) => void;

  onLongPress?: (e: PressEvent) => void;

  onMouseEnter?: (e: NshMouseEvent) => void;

  onMouseLeave?: (e: NshMouseEvent) => void;

  onHoverStart?: (e: NshMouseEvent) => void;

  onHoverEnd?: (e: NshMouseEvent) => void;

  onHoverChange?: (isHovered: boolean) => void;

  onFocus?: () => void;

  onBlur?: () => void;

  onFocusChange?: (isFocused: boolean) => void;

  /** A DOM click upstream; a press here. */
  onClick?: (e: PressEvent) => void;

  /** A DOM key event upstream; keys arrive through `keymap` here. */
  onKeyDown?: unknown;
  onKeyUp?: unknown;

  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;

  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityState?: AccessibilityState;

  /** Accepted, no effect: NSH has one kind of host element. */
  elementType?: string;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect: NSH cannot replace the host element. */
  render?: unknown;

  onLayout?: (e: { bounds: Bounds }) => void;
}

/**
 * The keyboard characters of a US layout, as Kobalte's type-select takes any
 * single character (`create-type-select.ts:42-47`). Space stays out: on the web
 * and macOS it is the focused view's activation press.
 */
const PUNCTUATION: ReadonlyArray<[keystroke: string, character: string]> = [
  ["minus", "-"],
  ["plus", "="],
  ["[", "["],
  ["]", "]"],
  ["\\", "\\"],
  [";", ";"],
  ["'", "'"],
  [",", ","],
  [".", "."],
  ["/", "/"],
  ["`", "`"],
];

/** A delegate for a field whose list has not registered yet: nothing matches. */
const EMPTY_DELEGATE: KeyboardDelegate = {};

/**
 * Select.Trigger / SelectTrigger: the field's button, a `View` that takes
 * presses (not nsh/base's Button and not HeroUI's Button component). It holds
 * the keyboard focus and the open shortcut, and it is the overlay's anchor and
 * focus-return target.
 */
export function SelectTrigger(props: SelectTriggerProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "id",
    "nativeID",
    "testID",
    "tooltip",
    "isDisabled",
    "autoFocus",
    "excludeFromTabOrder",
    "type",
    "form",
    "name",
    "value",
    "onPress",
    "onPressDown",
    "onPressUp",
    "onPressStart",
    "onPressEnd",
    "onPressChange",
    "onLongPress",
    "onMouseEnter",
    "onMouseLeave",
    "onHoverStart",
    "onHoverEnd",
    "onHoverChange",
    "onFocus",
    "onBlur",
    "onFocusChange",
    "onClick",
    "onKeyDown",
    "onKeyUp",
    "aria-label",
    "aria-labelledby",
    "aria-describedby",
    "accessibilityLabel",
    "accessibilityHint",
    "accessibilityState",
    "elementType",
    "slot",
    "render",
    "onLayout",
  ] as const);

  const select = SelectContext();

  if (!select) {
    return null;
  }

  const overlay = OverlayTriggerContext();

  const isDisabled = () => local.isDisabled ?? select.isDisabled();
  const isOpen = select.isOpen;

  const hovered = signal(false);
  const pressed = signal(false);
  const focused = signal(false);
  // R-007: the trigger's hover excludes the clear button's, which a plain
  // `hover:` variant cannot express (the pointer is inside the trigger there
  // too). The clear button reports its hover here.
  const clearHovered = signal(false);
  const hasIndicator = signal(false);

  // R-013 … R-017: the secondary variant swaps the field background.
  const isSecondary = () => select.variant() === "secondary";

  const isFocusVisible = computed(
    () => focused() && select.isKeyboard(),
  );

  const renderProps: SelectTriggerRenderProps = {
    isHovered: hovered,
    isPressed: pressed,
    isFocused: focused,
    isFocusVisible,
    isDisabled,
    isPending: () => false,
  };

  const resolvedClassName = () => {
    const className = local.className;

    return typeof className === "function"
      ? className(renderProps)
      : className;
  };

  const classes = computed(() =>
    [select.slots().trigger(), resolvedClassName()]
      .filter((part): part is string => typeof part === "string" && part.length > 0)
      .join(" "),
  );

  const resolvedStyle = () => {
    const style = local.style;

    return typeof style === "function" ? style(renderProps) : style;
  };

  // R-005: the property list is the only inline owner (NSH's `transition-colors`
  // omits the shadow and `transition-all` adds radius and border width). A
  // reduce-motion host transitions nothing.
  const transitionProperty = () =>
    reduceMotion() ? "none" : "background-color, border-color, box-shadow";

  const classList = computed(() => {
    const list: Record<string, boolean> = {};

    // R-006: `:has(.select__indicator)` → `pe-7` while an Indicator is mounted.
    if (hasIndicator()) {
      list["pe-7"] = true;
    }

    // R-007 / R-014: the hover background, unless the clear button holds the
    // pointer. The border colour is invisible at `border-0` (R-004), as upstream.
    if (hovered() && !clearHovered()) {
      list["bg-field-hover border-field-border-hover"] = true;
    }

    // R-008: `:focus-visible` → `status-focused`. The utility gives a 2pt
    // page-coloured offset (`--ring-offset-width: 2px`, Button's R-006);
    // R-015: a secondary trigger keeps its own background. NSH's class string
    // and classList are joined in that order, so these later classes win over
    // the base ones.
    if (isFocusVisible()) {
      list["ring-2 ring-focus ring-offset-2 ring-offset-background outline-none border-field-border-focus bg-field-focus"] = true;
    }

    // R-010: the invalid field ring; R-017: secondary keeps `--default`.
    // `status-invalid-field`'s ring sets `--tw-ring-offset-width: 0`, so the
    // invalid branch forces `ring-offset-0` over R-008's 2pt offset.
    if (select.isInvalid()) {
      if (focused()) {
        list["ring-2 ring-danger ring-offset-0 outline-none bg-field-focus"] = true;
      } else {
        list["outline outline-1 outline-danger bg-field-focus"] = true;
      }
    }

    // The secondary background overrides the focus / invalid one, as the
    // later block of `select.css` does (R-014 / R-015 / R-017).
    if (isSecondary() && ((hovered() && !clearHovered()) || isFocusVisible() || select.isInvalid())) {
      list["bg-default"] = true;
    }

    // R-011: `status-disabled` as literals (theme notes).
    if (isDisabled()) {
      list["opacity-50 cursor-not-allowed pointer-events-none"] = true;
    }

    return list;
  });

  /* -------------------------------------------------------------------------------------------
   * Presses: the trigger opens / closes, and keyboard activation keeps the
   * keyboard modality (never inferred from hover).
   * ----------------------------------------------------------------------------------------- */
  const notePress = (event?: PressEvent) => {
    if (event && !isKeyboardPress(event)) {
      select.notePointer();
    } else {
      select.noteKeyboard();
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

    // Return / Space arrive as a press on the focused view and open at the
    // first option, as Kobalte's Enter / Space branch does. A pointer press
    // keeps the selected option (RAC's `open()` with no strategy).
    if (isKeyboardPress(event)) {
      select.noteKeyboard();
      select.toggle("first");
    } else {
      select.notePointer();
      select.toggle(true);
    }

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
    select.noteFocus();
    select.setTriggerFocused(true);
    local.onFocusChange?.(true);
    local.onFocus?.();
  };

  const handleBlur = () => {
    focused.set(false);
    select.setTriggerFocused(false);
    local.onFocusChange?.(false);
    local.onBlur?.();

    // The trigger is no longer the keyboard station; a closed field holds no
    // focused option either.
    if (!isOpen()) {
      select.selectionManager()?.setFocused(false);
    }
  };

  /* -------------------------------------------------------------------------------------------
   * The keyboard delegate over the registered collection: the arrows' targets
   * and the typeahead's search.
   * ----------------------------------------------------------------------------------------- */
  const delegate = computed<KeyboardDelegate>(() => {
    const state = select.list();

    if (!state) {
      return EMPTY_DELEGATE;
    }

    return new ListKeyboardDelegate(state.collection, {
      disabledBehavior: () => state.selectionManager().disabledBehavior(),
    });
  });

  const typeSelect = createTypeSelect({
    isDisabled: () => isDisabled(),
    keyboardDelegate: () => delegate(),
    selectionManager: () =>
      // Never read without a delegate that can search, which needs a list.
      select.selectionManager()!,
    // Kobalte's trigger selects the option the search found.
    onTypeSelect: (key) => select.selectionManager()?.select(key),
  });

  const firstSelectedKey = () =>
    select.selectionManager()?.firstSelectedKey();

  // Kobalte's ArrowLeft / ArrowRight: step the selection beside the first
  // selected option (or the first option when nothing is selected). It does
  // nothing in multiple mode.
  const moveSelection = (direction: "up" | "down") => {
    if (select.selectionMode() === "multiple") {
      return;
    }

    const delegateNow = delegate();
    const selected = firstSelectedKey();
    const key =
      selected != null
        ? (direction === "up"
            ? delegateNow.getKeyAbove?.(selected)
            : delegateNow.getKeyBelow?.(selected))
        : delegateNow.getFirstKey?.();

    if (key != null) {
      select.selectionManager()?.select(key);
    }
  };

  // Port sheet §5, fourth change: the closed trigger owns the keys. Return and
  // Space stay unbound (the host delivers them as the focused view's press);
  // the scope is live only while the trigger holds the focus and the field is
  // closed, so the list's own scope takes over on open.
  const navigationBindings: Record<string, () => void> = {
    down: () => select.open("first"),
    up: () => select.open("last"),
    left: () => moveSelection("up"),
    right: () => moveSelection("down"),
  };

  createKeymapScope({
    isActive: () => focused() && !isOpen() && !isDisabled(),
    bindings: navigationBindings,
  });

  // R-...: the clear shortcut. It needs a mounted clear button, a non-empty
  // selection and a closed field; anything else lets the key through.
  const clearBindings: Record<string, () => void> = {
    backspace: () => {
      if (select.hasClearButton() && !select.isSelectionEmpty() && !isOpen()) {
        select.clear();
      }
    },
    delete: () => {
      if (select.hasClearButton() && !select.isSelectionEmpty() && !isOpen()) {
        select.clear();
      }
    },
  };

  createKeymapScope({
    isActive: () => focused() && !isOpen() && !isDisabled(),
    bindings: clearBindings,
  });

  const printableBindings: Record<string, () => void> = {};

  for (const key of "abcdefghijklmnopqrstuvwxyz0123456789") {
    printableBindings[key] = () => {
      select.noteKeyboard();
      typeSelect.typeSelectHandlers.onKeyDown(key);
    };
  }

  for (const [keystroke, character] of PUNCTUATION) {
    printableBindings[keystroke] = () => {
      select.noteKeyboard();
      typeSelect.typeSelectHandlers.onKeyDown(character);
    };
  }

  createKeymapScope({
    isActive: () => focused() && !isOpen() && !isDisabled(),
    bindings: printableBindings,
  });

  /* -------------------------------------------------------------------------------------------
   * Registration: the overlay's anchor / focus-return target, and the trigger
   * context the indicator and the clear button read.
   * ----------------------------------------------------------------------------------------- */
  let node: ViewRef | undefined;
  let unregisterTrigger: (() => void) | undefined;

  cleanup(() => unregisterTrigger?.());

  const registerTrigger = (next: ViewRef | undefined) => {
    unregisterTrigger?.();
    unregisterTrigger = next ? overlay?.registerTrigger(next) : undefined;
  };

  const triggerContext: SelectTriggerContextValue = {
    isDisabled,
    registerIndicator: () => {
      hasIndicator.set(true);

      return () => hasIndicator.set(false);
    },
    setClearHovered: (isHovered) => clearHovered.set(isHovered),
  };

  let didAutoFocus = false;

  effect(() => {
    if (didAutoFocus || !local.autoFocus) {
      return;
    }

    didAutoFocus = true;
    node?.focus();
  });

  const content = () => {
    const children = local.children;

    if (typeof children === "function" && children.length >= 1) {
      return renderChildren(
        (children as (values: SelectTriggerRenderProps) => JSX.Element)(
          renderProps,
        ),
      );
    }

    return renderChildren(children as JSX.Element);
  };

  return (
    <SelectTriggerContext.Provider value={triggerContext}>
      <View
        {...rest}
        ref={(next) => {
          node = next;
          registerTrigger(next);
          local.ref?.(next);
        }}
        testID={local.testID}
        nativeID={local.id ?? local.nativeID}
        tooltip={local.tooltip}
        role="button"
        // The trigger is the field's Tab stop; a disabled trigger is not.
        focusable={!isDisabled()}
        disabled={isDisabled()}
        accessibilityLabel={
          local["aria-label"] ??
          local.accessibilityLabel ??
          select.ariaLabel() ??
          select.labelText()
        }
        accessibilityHint={
          local.accessibilityHint ??
          (() => {
            const hint = [select.descriptionText(), select.errorText()]
              .filter((part): part is string => typeof part === "string" && part.length > 0)
              .join(" ");

            return hint.length > 0 ? hint : undefined;
          })()
        }
        accessibilityState={{
          ...local.accessibilityState,
          // React Aria's `aria-expanded` on the trigger; `controls` has no
          // channel (port sheet §8).
          expanded: isOpen(),
        }}
        class={classes()}
        classList={classList()}
        style={[resolvedStyle(), { transitionProperty: transitionProperty() }]}
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
    </SelectTriggerContext.Provider>
  );
}
