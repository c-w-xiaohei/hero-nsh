import type {
  Accessor,
  AccessibilityState,
  Bounds,
  JSX,
  StyleProp,
  ViewRef,
  ViewStyle,
} from "nsh";
import {
  cleanup,
  computed,
  effect,
  signal,
  split,
  untracked,
  View,
} from "nsh";

import {
  createInteractionModality,
  createOverlayTrigger,
  createSelectState,
  type ListOwner,
  ListOwnerContext,
  type ListOwnerListControls,
  type ListState,
  OverlayTriggerContext,
  type SelectionManager,
  type SelectionMode,
} from "../../primitives";
import { renderChildren } from "../list-box/children";
import { DescriptionContext } from "../description/context";
import type { DescriptionContextValue } from "../description/context";
import { FieldErrorContext } from "../field-error/context";
import type { FieldErrorState } from "../field-error/context";
import { FieldContext } from "../label/context";
import type { FieldState } from "../label/context";
import { formatListText } from "./select-list-format";
import {
  SelectContext,
  type SelectContextValue,
  type SelectSelectedItem,
  type SelectSlots,
  type SelectStateFacade,
} from "./select-context";
import { selectVariants, type SelectVariants } from "./select.styles";

/* -------------------------------------------------------------------------------------------------
 * Render props
 * -----------------------------------------------------------------------------------------------*/

/** The default trigger / value / popover tree upstream builds when no children are given. */
export type SelectDefaultChildren = JSX.Element | undefined;

/**
 * What a `children` function receives (HeroUI's `SelectRenderProps`). Per D17
 * the flags are accessors; `defaultChildren` is the tree the field would render
 * with no children at all.
 */
export interface SelectRenderProps {
  isOpen: Accessor<boolean>;
  isDisabled: Accessor<boolean>;
  isInvalid: Accessor<boolean>;
  isRequired: Accessor<boolean>;
  /** The trigger or the list holds the focus (React Aria's `state.isFocused`). */
  isFocused: Accessor<boolean>;
  isFocusVisible: Accessor<boolean>;
  defaultChildren: Accessor<SelectDefaultChildren>;
}

/* -------------------------------------------------------------------------------------------------
 * Root
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Select.Root`: HeroUI 3.2.7's `SelectRootProps`, which is React
 * Aria Components' `Select` plus `onClear` and the (two-dimensional) variant
 * surface, expressed with NSH host props.
 *
 * Both selection spellings are accepted: the single-select `selectedKey` /
 * `defaultSelectedKey` and the multiple-select `selectedKeys` /
 * `defaultSelectedKeys`, plus HeroUI's deprecated `value` / `defaultValue` /
 * `onChange` aliases. When an alias and its official name are both present the
 * official one wins, as React Aria's `useControlledState` does.
 */
export interface SelectRootProps<T = unknown> extends SelectVariants {
  /** The field's parts; a one-parameter function is a render prop (D17). */
  children?: JSX.Element | ((values: SelectRenderProps) => JSX.Element);

  /** Appended after the variant classes; function form gets the same accessors. */
  className?: string | ((values: SelectRenderProps) => string);

  style?:
    | StyleProp<ViewStyle>
    | ((values: SelectRenderProps) => StyleProp<ViewStyle>);

  /** The root view, as `ComponentPropsWithRef` gives upstream. */
  ref?: (node: ViewRef) => void;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;
  nativeID?: string;
  testID?: string;
  tooltip?: JSX.Element;

  /** The dynamic collection; used by a `ListBox` inside the field, not here. */
  items?: Iterable<T>;

  /** `"single"` by default; it decides the value's text and the close rule. */
  selectionMode?: "single" | "multiple";

  /** The selected key in controlled single mode (`null` is an empty selection). */
  selectedKey?: string | number | null;

  /** The initial selected key in uncontrolled single mode. */
  defaultSelectedKey?: string | number | null;

  /** The selected keys in controlled multiple mode, or `"all"`. */
  selectedKeys?: "all" | Iterable<string | number>;

  /** The initial selected keys in uncontrolled multiple mode, or `"all"`. */
  defaultSelectedKeys?: "all" | Iterable<string | number>;

  /**
   * The selection changed. Single mode gets a key or `null`; multiple mode gets
   * `"all"` or a `Set` of keys (strings, as the list primitive normalizes them).
   */
  onSelectionChange?: (selection: SelectSelection) => void;

  /** HeroUI's deprecated alias of `selectedKey` / `selectedKeys`. */
  value?: string | number | null | "all" | Iterable<string | number>;

  /** HeroUI's deprecated alias of `defaultSelectedKey` / `defaultSelectedKeys`. */
  defaultValue?: string | number | null | "all" | Iterable<string | number>;

  /** HeroUI's deprecated alias of `onSelectionChange`. */
  onChange?: (selection: SelectSelection) => void;

  /** Applies the value's change to the single selection's toggle rule. */
  disallowEmptySelection?: boolean;

  /** Options that cannot be selected; the list receives them through the owner. */
  disabledKeys?: Iterable<string | number>;

  /** The controlled open state. */
  isOpen?: boolean;

  /** The initial open state. */
  defaultOpen?: boolean;

  onOpenChange?: (isOpen: boolean) => void;

  isDisabled?: boolean;
  isRequired?: boolean;
  isInvalid?: boolean;

  /** Accepted, no effect: NSH has no read-only field semantics (port sheet §8). */
  isReadOnly?: boolean;

  /** Accepted, no effect: `isInvalid` is the only validation source (port sheet §8). */
  validationBehavior?: "native" | "aria";

  /** Accepted, no effect: there is no form validation flow to run it in. */
  validate?: (value: unknown) => string | readonly string[] | null | undefined;

  /** The error messages `FieldError` falls back to. */
  validationErrors?: readonly string[];

  /** Accepted, no effect: NSH has no form submission or hidden `<select>`. */
  name?: string;
  form?: string;
  autoComplete?: string;

  /** Focuses the trigger after mount (macOS and the web move view focus). */
  autoFocus?: boolean;

  /** Accepted, no effect: NSH has no tab index, only `focusable`. */
  excludeFromTabOrder?: boolean;

  /** The trigger took the focus. */
  onFocus?: () => void;

  /** The trigger lost the focus. */
  onBlur?: () => void;

  /** Either focus transition. */
  onFocusChange?: (isFocused: boolean) => void;

  /** Names the trigger; wins over a registered Label's text. */
  "aria-label"?: string;

  /** Accepted, no effect: NSH resolves no accessible names from ids. */
  "aria-labelledby"?: string;

  /** Accepted, no effect: NSH resolves no descriptions from ids. */
  "aria-describedby"?: string;

  "aria-details"?: string;

  /** Shown while nothing is selected; HeroUI's localized `"Select an item"`. */
  placeholder?: string;

  /** Called after the clear button (or Backspace / Delete) empties the selection. */
  onClear?: () => void;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect: NSH cannot replace the host element. */
  render?: unknown;

  /** Accepted, no effect: the accessible state is composed from the field state. */
  accessibilityState?: AccessibilityState;

  onLayout?: (e: { bounds: Bounds }) => void;
}

/** The payload `onSelectionChange` / `onChange` receive. */
export type SelectSelection = string | number | null | "all" | Set<string>;

/** `"all"` stays a sentinel; any iterable becomes the string-keyed set. */
function toKeySet(
  keys: "all" | Iterable<string | number>,
): "all" | Set<string> {
  if (keys === "all") {
    return "all";
  }

  const set = new Set<string>();

  for (const key of keys) {
    set.add(String(key));
  }

  return set;
}

/** Joins whatever the parts registered into one accessible string. */
function joinedText(readers: readonly (() => string | undefined)[]): string | undefined {
  const text = readers
    .map((read) => read())
    .filter((part): part is string => typeof part === "string" && part.length > 0)
    .join(" ");

  return text.length > 0 ? text : undefined;
}

/**
 * Select.Root / SelectRoot: the field container, the one open state and the
 * field contexts. HeroUI's root is React Aria's `Select`, a plain `<div>` with
 * no role; Kobalte's `role="group"` is not HeroUI's contract and is not carried
 * (port sheet §3).
 */
export function SelectRoot<T>(props: SelectRootProps<T>): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "id",
    "nativeID",
    "testID",
    "tooltip",
    "items",
    "selectionMode",
    "selectedKey",
    "defaultSelectedKey",
    "selectedKeys",
    "defaultSelectedKeys",
    "onSelectionChange",
    "value",
    "defaultValue",
    "onChange",
    "disallowEmptySelection",
    "disabledKeys",
    "isOpen",
    "defaultOpen",
    "onOpenChange",
    "isDisabled",
    "isRequired",
    "isInvalid",
    "isReadOnly",
    "validationBehavior",
    "validate",
    "validationErrors",
    "name",
    "form",
    "autoComplete",
    "autoFocus",
    "excludeFromTabOrder",
    "onFocus",
    "onBlur",
    "onFocusChange",
    "aria-label",
    "aria-labelledby",
    "aria-describedby",
    "aria-details",
    "placeholder",
    "onClear",
    "slot",
    "render",
    "accessibilityState",
    "onLayout",
    "variant",
    "fullWidth",
  ] as const);

  const variant = () => local.variant ?? "primary";
  const fullWidth = () => local.fullWidth ?? false;
  const selectionMode = (): SelectionMode => local.selectionMode ?? "single";
  const isMultiple = () => selectionMode() === "multiple";

  const slots = computed(() => selectVariants({ variant: variant(), fullWidth: fullWidth() }));

  /* -------------------------------------------------------------------------------------------
   * Field state
   * ----------------------------------------------------------------------------------------- */
  const isDisabled = () => local.isDisabled ?? false;
  const isRequired = () => local.isRequired ?? false;
  const isInvalid = () => local.isInvalid ?? false;

  /* -------------------------------------------------------------------------------------------
   * Selection: HeroUI's single and multiple spellings plus the deprecated
   * aliases, normalized to what the list primitive consumes.
   * ----------------------------------------------------------------------------------------- */
  const controlledKeys = computed<"all" | Set<string> | undefined>(() => {
    if (isMultiple()) {
      const keys = local.selectedKeys !== undefined ? local.selectedKeys : (local.value as "all" | Iterable<string | number> | undefined);

      return keys === undefined ? undefined : toKeySet(keys);
    }

    const key = local.selectedKey !== undefined ? local.selectedKey : (local.value as string | number | null | undefined);

    if (key === undefined) {
      return undefined;
    }

    return key === null ? new Set<string>() : new Set<string>([String(key)]);
  });

  const defaultKeys = computed<"all" | Set<string> | undefined>(() => {
    if (isMultiple()) {
      const keys = local.defaultSelectedKeys !== undefined ? local.defaultSelectedKeys : (local.defaultValue as "all" | Iterable<string | number> | undefined);

      return keys === undefined ? undefined : toKeySet(keys);
    }

    const key = local.defaultSelectedKey !== undefined ? local.defaultSelectedKey : (local.defaultValue as string | number | null | undefined);

    if (key === undefined) {
      return undefined;
    }

    return key === null ? new Set<string>() : new Set<string>([String(key)]);
  });

  /** The official `onSelectionChange` wins over the deprecated `onChange`. */
  const emitSelection = (keys: Set<string> | "all") => {
    const handler = local.onSelectionChange ?? local.onChange;

    if (!handler) {
      return;
    }

    if (isMultiple()) {
      handler(keys);
    } else {
      handler(keys === "all" ? null : (keys.values().next().value ?? null));
    }
  };

  /* -------------------------------------------------------------------------------------------
   * Open state and the list registry (port sheet §5, first and third changes).
   * ----------------------------------------------------------------------------------------- */
  const overlay = createOverlayTrigger({
    isOpen: () => local.isOpen,
    defaultOpen: () => local.defaultOpen,
    onOpenChange: (open) => local.onOpenChange?.(open),
  });

  const selectState = createSelectState({
    isOpen: overlay.isOpen,
    setIsOpen: overlay.setIsOpen,
    collection: () => selectState.list()?.collection(),
    selectionManager: () => selectState.list()?.selectionManager(),
  });

  const { list, controls: listControls, open, close, toggle } = selectState;
  const selectionManager: Accessor<SelectionManager | undefined> = () =>
    list()?.selectionManager();

  /* -------------------------------------------------------------------------------------------
   * Registered texts: the label names the trigger, the description and the
   * error message become its hint (the stand-in for aria-describedby).
   * ----------------------------------------------------------------------------------------- */
  const labelSources = signal<readonly (() => string | undefined)[]>([]);
  const descriptionSources = signal<readonly (() => string | undefined)[]>([]);
  const errorSources = signal<readonly (() => string | undefined)[]>([]);

  const registerInto = (
    target: typeof labelSources,
    read: () => string | undefined,
  ) => {
    target.update((current) => [...current, read]);

    return () => {
      target.update((current) => current.filter((entry) => entry !== read));
    };
  };

  const labelText = computed(() => joinedText(labelSources()));
  const descriptionText = computed(() => joinedText(descriptionSources()));
  const errorText = computed(() => joinedText(errorSources()));

  /* -------------------------------------------------------------------------------------------
   * Derived selection values
   * ----------------------------------------------------------------------------------------- */
  const isSelectionEmpty = computed(() => selectionManager()?.isEmpty() ?? true);

  const selectedItems = computed<readonly SelectSelectedItem[]>(() => {
    const manager = selectionManager();
    const controls = listControls();

    if (!manager || !controls) {
      return [];
    }

    const items: SelectSelectedItem[] = [];

    // The selected keys keep their insertion order in the selection set, which
    // is the order the user chose them in (Kobalte's T-074).
    for (const key of manager.selectedKeys()) {
      const item = controls.findItem(key);

      if (!item) {
        continue;
      }

      items.push({
        key,
        value: undefined,
        textValue: item.textValue(),
        children: item.children ?? (() => undefined),
      });
    }

    return items;
  });

  const selectedText = computed<string | undefined>(() => {
    const items = selectedItems();
    const texts = items.map((item) => item.textValue ?? "");

    if (isMultiple()) {
      // HeroUI joins a multiple selection with React Aria's `useListFormatter`
      // (`type: "unit"`): `"One, Three"` in English. `Intl.ListFormat` is
      // missing from NSH's runtime, so the helper falls back to the same text.
      return formatListText(texts);
    }

    return texts[0];
  });

  const placeholder = () => local.placeholder ?? "Select an item";

  /* -------------------------------------------------------------------------------------------
   * Clearing
   * ----------------------------------------------------------------------------------------- */
  const clearButtonCount = signal(0);
  const hasClearButton = computed(() => clearButtonCount() > 0);

  const registerClearButton = () => {
    clearButtonCount.update((count) => count + 1);

    return () => clearButtonCount.update((count) => count - 1);
  };

  // R-024: the shortcut and the click share this one entry: the selection
  // manager sees the empty set (controlled mode included) and `onClear` runs.
  const clear = () => {
    selectionManager()?.setSelectedKeys(new Set<string>());
    local.onClear?.();
  };

  /* -------------------------------------------------------------------------------------------
   * Focus state, shared with the trigger (which owns the view)
   * ----------------------------------------------------------------------------------------- */
  const triggerFocused = signal(false);
  const modality = createInteractionModality();

  cleanup(() => modality.reset());

  const listFocused = computed(
    () => list()?.selectionManager().isFocused() ?? false,
  );

  const isFocused = computed(() => triggerFocused() || listFocused());
  const isFocusVisible = computed(() => isFocused() && modality.isKeyboard());

  const setTriggerFocused = (focused: boolean) => {
    triggerFocused.set(focused);
    local.onFocusChange?.(focused);

    if (focused) {
      local.onFocus?.();
    } else {
      local.onBlur?.();
    }
  };

  const focusTrigger = () => {
    overlay.triggerRef()?.focus();
  };

  // `autoFocus`: the trigger registers itself during the commit, so wait for
  // its ref instead of focusing in the render pass (research 4.6).
  let didAutoFocus = false;

  effect(() => {
    if (didAutoFocus || !local.autoFocus) {
      return;
    }

    const trigger = overlay.triggerRef();

    if (!trigger) {
      return;
    }

    didAutoFocus = true;
    trigger.focus();
  });

  /* -------------------------------------------------------------------------------------------
   * The owner contract the ListBox inside the popover reads.
   * ----------------------------------------------------------------------------------------- */
  const owner: ListOwner = {
    selectionMode,
    selectedKeys: controlledKeys,
    defaultSelectedKeys: defaultKeys,
    onSelectionChange: emitSelection,
    // Kobalte's Select default: a repeated selection still reports a change.
    allowDuplicateSelectionEvents: () => true,
    disallowEmptySelection: () => local.disallowEmptySelection ?? false,
    disabledKeys: () => local.disabledKeys,
    shouldFocusOnHover: () => true,
    shouldSelectOnPressUp: () => true,
    escape: () => close(),
    closeOnSelection: () => !isMultiple(),
    close,
    isActive: overlay.isOpen,
    registerList: (state: ListState, controls: ListOwnerListControls) =>
      selectState.registerList(state, controls),
  };

  /* -------------------------------------------------------------------------------------------
   * Render values and the context
   * ----------------------------------------------------------------------------------------- */
  const renderValues: SelectRenderProps = {
    isOpen: overlay.isOpen,
    isDisabled,
    isInvalid,
    isRequired,
    isFocused,
    isFocusVisible,
    // Upstream builds the trigger / value / popover tree here; NSH has no
    // `ListBox` to put in it (the caller writes that), so the default tree is
    // empty and registered as a difference (port sheet §8).
    defaultChildren: () => undefined,
  };

  const resolvedClassName = () => {
    const className = local.className;

    return typeof className === "function" ? className(renderValues) : className;
  };

  const resolvedStyle = () => {
    const style = local.style;

    return typeof style === "function" ? style(renderValues) : style;
  };

  const classes = computed(() =>
    [slots().base(), resolvedClassName()]
      .filter((part): part is string => typeof part === "string" && part.length > 0)
      .join(" "),
  );

  const stateFacade: SelectStateFacade = {
    // Accessors, per D17: the value's render function runs once, and the tree it
    // builds reads these where it binds.
    selectedItems,
    selectedKeys: () => selectionManager()?.selectedKeys() ?? new Set<string>(),
    selectionMode,
    isOpen: overlay.isOpen,
    isDisabled,
    isInvalid,
    isRequired,
  };

  const contextValue: SelectContextValue = {
    slots,
    variant: () => (variant() === "secondary" ? "secondary" : "primary"),
    onClear: () => local.onClear?.(),
    hasClearButton,
    registerClearButton,
    clear,
    isOpen: overlay.isOpen,
    open,
    close,
    toggle,
    selectionMode,
    disallowEmptySelection: () => local.disallowEmptySelection ?? false,
    list,
    listControls,
    selectionManager,
    selectedItems,
    selectedText,
    isSelectionEmpty,
    placeholder,
    isDisabled,
    isRequired,
    isInvalid,
    labelText,
    ariaLabel: () => local["aria-label"],
    descriptionText,
    errorText,
    triggerFocused,
    setTriggerFocused,
    isKeyboard: modality.isKeyboard,
    notePointer: () => modality.setPointerModality(),
    noteKeyboard: () => modality.setKeyboardModality(),
    noteFocus: () => modality.onFocus(),
    focusTrigger,
    state: stateFacade,
  };

  const fieldState: FieldState = {
    isRequired,
    isDisabled,
    isInvalid,
    registerLabel: (read) => registerInto(labelSources, read),
    // A press on a `<label for>` focuses the field's control. Upstream the
    // control is the trigger button; its press is not part of the label's.
    focusField: () => focusTrigger(),
  };

  const descriptionState: DescriptionContextValue = {
    registerDescription: (read) => registerInto(descriptionSources, read),
    // R-002: `.select[data-invalid] [data-slot="description"] { hidden }`. The
    // Description appends this after its own classes; it keeps its
    // accessibility hint, which `display: none` would take away upstream.
    partClass: () => (isInvalid() ? "hidden" : undefined),
  };

  const fieldErrorState: FieldErrorState = {
    isInvalid,
    validationErrors: () => local.validationErrors ?? [],
    registerErrorMessage: (read) => registerInto(errorSources, read),
  };

  // One read of `props.children`, at the placement inside every provider (the
  // component provides contexts, so `_common`'s exception applies): a
  // one-parameter function is the render prop, called once with accessors.
  const content = (): JSX.Element => {
    const children = local.children;

    if (typeof children === "function" && children.length >= 1) {
      return untracked(() =>
        (children as (values: SelectRenderProps) => JSX.Element)(renderValues),
      ) as JSX.Element;
    }

    return renderChildren(children as JSX.Element);
  };

  return (
    <OverlayTriggerContext.Provider value={overlay.context}>
      <SelectContext.Provider value={contextValue}>
        <FieldContext.Provider value={fieldState}>
          <DescriptionContext.Provider value={descriptionState}>
            <FieldErrorContext.Provider value={fieldErrorState}>
              <ListOwnerContext.Provider value={owner}>
                <View
                  {...rest}
                  ref={(node) => local.ref?.(node)}
                  testID={local.testID}
                  nativeID={local.id ?? local.nativeID}
                  tooltip={local.tooltip}
                  accessibilityState={local.accessibilityState}
                  class={classes()}
                  style={resolvedStyle()}
                  onLayout={local.onLayout}
                >
                  {content()}
                </View>
              </ListOwnerContext.Provider>
            </FieldErrorContext.Provider>
          </DescriptionContext.Provider>
        </FieldContext.Provider>
      </SelectContext.Provider>
    </OverlayTriggerContext.Provider>
  );
}
