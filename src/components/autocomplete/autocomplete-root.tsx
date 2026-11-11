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
import { DescriptionContext } from "../description/context";
import type { DescriptionContextValue } from "../description/context";
import { FieldErrorContext } from "../field-error/context";
import type { FieldErrorState } from "../field-error/context";
import { FieldsetContext } from "../fieldset/context";
import { FieldContext } from "../label/context";
import type { FieldState } from "../label/context";
import { renderChildren } from "../list-box/children";
import { formatListText } from "../select/select-list-format";
import {
  AutocompleteContext,
  type AutocompleteContextValue,
  type AutocompleteFilterRegistration,
  type AutocompleteFilterSource,
  type AutocompleteSelectedItem,
  type AutocompleteStateFacade,
} from "./autocomplete-context";
import {
  autocompleteVariants,
  type AutocompleteVariants,
} from "./autocomplete.styles";

/* -------------------------------------------------------------------------------------------------
 * Render props
 * -----------------------------------------------------------------------------------------------*/

/** The default root tree upstream builds when no children are given. */
export type AutocompleteDefaultChildren = JSX.Element | undefined;

/**
 * What a `children` function receives (HeroUI's `AutocompleteRenderProps`,
 * which is React Aria's `SelectRenderProps`). Per D17 the flags are accessors;
 * `defaultChildren` is the tree the field would render with no children at all.
 */
export interface AutocompleteRenderProps {
  isOpen: Accessor<boolean>;
  isDisabled: Accessor<boolean>;
  isInvalid: Accessor<boolean>;
  isRequired: Accessor<boolean>;
  /** The trigger, the input or the list holds the focus. */
  isFocused: Accessor<boolean>;
  isFocusVisible: Accessor<boolean>;
  defaultChildren: Accessor<AutocompleteDefaultChildren>;
}

/* -------------------------------------------------------------------------------------------------
 * Root
 * -------------------------------------------------------------------------------------------------*/

/**
 * The props of `Autocomplete.Root`: HeroUI 3.2.7's `AutocompleteRootProps`,
 * which is React Aria Components' `Select` plus `items`, `onClear` and the
 * (two-dimensional) variant surface, expressed with NSH host props.
 *
 * The React Aria `Autocomplete` surface (`inputValue`, `defaultInputValue`,
 * `onInputChange`, `filter`, `disableAutoFocusFirst`) is accepted here as well
 * as on `Autocomplete.Filter`: HeroUI's root is a `Select`, so those props land
 * on the field's public surface when a caller writes them on the root, and
 * they must take effect (port sheet §1, §4b).
 */
export interface AutocompleteRootProps<T = unknown> extends AutocompleteVariants {
  /** The field's parts; a one-parameter function is a render prop (D17). */
  children?: JSX.Element | ((values: AutocompleteRenderProps) => JSX.Element);

  /** Appended after the variant classes; function form gets the same accessors. */
  className?: string | ((values: AutocompleteRenderProps) => string);

  style?:
    | StyleProp<ViewStyle>
    | ((values: AutocompleteRenderProps) => StyleProp<ViewStyle>);

  /** The root view, as `ComponentPropsWithRef` gives upstream. */
  ref?: (node: ViewRef) => void;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;
  nativeID?: string;
  testID?: string;
  tooltip?: JSX.Element;

  /** The dynamic collection; used by a `ListBox` inside the field, not here. */
  items?: Iterable<T>;

  /** `"single"` by default; it decides the close rule and the value's shape. */
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
   * an array of keys (React Aria's `Select` `onChange`), as the stories' tag
   * fixture writes its own `value` back from it.
   */
  onSelectionChange?: (selection: AutocompleteSelection) => void;

  /**
   * React Aria's `Select` value surface: a key or `null` in single mode, an
   * array of keys in multiple mode (`AutocompleteMultipleFixture`).
   */
  value?: string | number | null | Iterable<string | number>;

  /** The initial value of the same surface. */
  defaultValue?: string | number | null | Iterable<string | number>;

  /** HeroUI's `onChange`: the same payload as `onSelectionChange`. */
  onChange?: (selection: AutocompleteSelection) => void;

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

  /** Accepted, no effect: NSH has no form submission or hidden input. */
  name?: string;
  form?: string;
  autoComplete?: string;

  /** Focuses the trigger after mount (macOS and the web move view focus). */
  autoFocus?: boolean;

  /** Accepted, no effect: NSH has no tab index, only `focusable`. */
  excludeFromTabOrder?: boolean;

  /** The field took the focus (the trigger or the search input). */
  onFocus?: () => void;

  /** The field lost the focus. */
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

  /** Called after the clear button empties the selection. */
  onClear?: () => void;

  /** The controlled search text (React Aria's `Autocomplete` `inputValue`). */
  inputValue?: string;

  /** The initial search text. */
  defaultInputValue?: string;

  /** The search text changed (typing, the clear button, Escape). */
  onInputChange?: (value: string) => void;

  /** The caller's filter; `Autocomplete.Filter` wins when both are given. */
  filter?: (textValue: string, inputValue: string) => boolean;

  /** Whether the virtual focus stays put when the filtered collection changes. */
  disableAutoFocusFirst?: boolean;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect: NSH cannot replace the host element. */
  render?: unknown;

  /** Accepted, no effect: the accessible state is composed from the field state. */
  accessibilityState?: AccessibilityState;

  onLayout?: (e: { bounds: Bounds }) => void;
}

/** The payload `onChange` / `onSelectionChange` receive. */
export type AutocompleteSelection =
  | string
  | number
  | null
  | readonly string[];

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
function joinedText(
  readers: readonly (() => string | undefined)[],
): string | undefined {
  const text = readers
    .map((read) => read())
    .filter((part): part is string => typeof part === "string" && part.length > 0)
    .join(" ");

  return text.length > 0 ? text : undefined;
}

/**
 * Autocomplete.Root / AutocompleteRoot: the field container, the one open
 * state, the one selection and the field contexts. HeroUI's root is React
 * Aria's `Select` (with `Autocomplete`'s filter inside the popover), so the
 * trigger opens a listbox whose rows live in a caller-written `ListBox`; the
 * search input that filters it is a caller-written `SearchField` inside
 * `Autocomplete.Filter` (port sheet §3).
 */
export function AutocompleteRoot<T>(props: AutocompleteRootProps<T>): JSX.Element {
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
    "inputValue",
    "defaultInputValue",
    "onInputChange",
    "filter",
    "disableAutoFocusFirst",
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

  const slots = computed(() =>
    autocompleteVariants({ variant: variant(), fullWidth: fullWidth() }),
  );

  /* -------------------------------------------------------------------------------------------
   * Field state
   * ----------------------------------------------------------------------------------------- */
  // Fieldset sheet §5.2: a disabled `Fieldset` disables the field.
  const fieldset = FieldsetContext();
  const isDisabled = () =>
    fieldset?.isDisabled() === true || (local.isDisabled ?? false);
  const isRequired = () => local.isRequired ?? false;
  const isInvalid = () => local.isInvalid ?? false;

  /* -------------------------------------------------------------------------------------------
   * Selection: the `selectedKey(s)` surface, the `value` / `defaultValue`
   * aliases, and the multiple-selection array shape of React Aria's `Select`.
   * ----------------------------------------------------------------------------------------- */
  const controlledKeys = computed<"all" | Set<string> | undefined>(() => {
    if (isMultiple()) {
      const keys = local.selectedKeys !== undefined ? local.selectedKeys : local.value;

      return keys === undefined || keys === null
        ? undefined
        : toKeySet(keys as "all" | Iterable<string | number>);
    }

    const key = local.selectedKey !== undefined ? local.selectedKey : local.value;

    if (key === undefined) {
      return undefined;
    }

    return key === null ? new Set<string>() : new Set<string>([String(key)]);
  });

  const defaultKeys = computed<"all" | Set<string> | undefined>(() => {
    if (isMultiple()) {
      const keys = local.defaultSelectedKeys !== undefined
        ? local.defaultSelectedKeys
        : local.defaultValue;

      return keys === undefined || keys === null
        ? undefined
        : toKeySet(keys as "all" | Iterable<string | number>);
    }

    const key =
      local.defaultSelectedKey !== undefined ? local.defaultSelectedKey : local.defaultValue;

    if (key === undefined) {
      return undefined;
    }

    return key === null ? new Set<string>() : new Set<string>([String(key)]);
  });

  /**
   * The selection changed. React Aria's `Select` reports a key or `null` in
   * single mode and an array in multiple mode (`value` / `onChange`), while
   * `onSelectionChange` keeps the `Set` shape of the collection API; both are
   * reported, as the deprecated `onChange` alias is.
   */
  const emitSelection = (keys: Set<string> | "all") => {
    if (isMultiple()) {
      const list = keys === "all" ? [] : Array.from(keys);

      local.onChange?.(list);
      local.onSelectionChange?.(list);

      return;
    }

    const key = keys === "all" ? null : (keys.values().next().value ?? null);

    local.onChange?.(key);
    local.onSelectionChange?.(key);
  };

  /* -------------------------------------------------------------------------------------------
   * Open state and the list registry (port sheet §5, first and third changes)
   * ----------------------------------------------------------------------------------------- */
  const overlay = createOverlayTrigger({
    isOpen: () => local.isOpen,
    defaultOpen: () => local.defaultOpen,
    onOpenChange: (open) => local.onOpenChange?.(open),
  });

  // The `Filter` registers the search input's focus here, so opening the field
  // keeps the focus in the input instead of moving it into the list: React
  // Aria's virtual focus (port sheet §2, §5).
  let filterRegistration: AutocompleteFilterRegistration | undefined;

  const focusSearchInput = () => filterRegistration?.focusInput();

  const selectState = createSelectState({
    isOpen: overlay.isOpen,
    setIsOpen: overlay.setIsOpen,
    collection: () => selectState.list()?.collection(),
    selectionManager: () => selectState.list()?.selectionManager(),
    focusTarget: () => focusSearchInput(),
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
  const isSelectionEmpty = computed(
    () => selectionManager()?.isEmpty() ?? true,
  );

  const selectedItems = computed<readonly AutocompleteSelectedItem[]>(() => {
    const manager = selectionManager();
    const controls = listControls();

    if (!manager || !controls) {
      return [];
    }

    const items: AutocompleteSelectedItem[] = [];

    // The selected keys keep their insertion order in the selection set, which
    // is the order the user chose them in.
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

  // The clear button and the root's own clear share this one entry: the
  // selection manager sees the empty set (controlled mode included) and
  // `onClear` runs, as HeroUI's clear button does.
  const clear = () => {
    selectionManager()?.setSelectedKeys(new Set<string>());
    local.onClear?.();
  };

  /* -------------------------------------------------------------------------------------------
   * Focus state, shared with the trigger and the search input
   * ----------------------------------------------------------------------------------------- */
  const triggerFocused = signal(false);
  const inputFocused = signal(false);
  const modality = createInteractionModality();

  cleanup(() => modality.reset());

  const fieldFocused = computed(() => triggerFocused() || inputFocused());
  const isFocusVisible = computed(
    () => fieldFocused() && modality.isKeyboard(),
  );

  const setTriggerFocused = (focused: boolean) => {
    triggerFocused.set(focused);
  };

  const setInputFocused = (focused: boolean) => {
    inputFocused.set(focused);
  };

  // The field's own focus callbacks follow the whole field, not one part: the
  // trigger holds the focus while closed and the search input while open
  // (React Aria's `state.isFocused`).
  let wasFocused = fieldFocused();

  effect(() => {
    const focused = fieldFocused();

    if (focused === wasFocused) {
      return;
    }

    wasFocused = focused;
    local.onFocusChange?.(focused);

    if (focused) {
      local.onFocus?.();
    } else {
      local.onBlur?.();
    }
  });

  const focusTrigger = () => {
    overlay.triggerRef()?.focus();
  };

  // The popover's subtree is mounted before the first open only when it has
  // something to show. Upstream (RAC's `Popover`) has no subtree at all while
  // closed, and this port must keep the list's collection once it built one;
  // mounting it lazily keeps a hidden `SearchField` from taking the keyboard
  // focus at mount, which would strip the trigger of the field's Tab stop.
  const everOpened = signal(false);

  effect(() => {
    if (overlay.isOpen()) {
      everOpened.set(true);
    }
  });

  // A closed field still shows its selection (the trigger's Value reads the
  // mounted rows' text), and a `defaultValue` / controlled `value` is known
  // before the first open; either mounts the popover subtree at once.
  const hasValueToShow = computed(() => {
    const keys = controlledKeys() ?? defaultKeys();

    return keys === "all" || (keys != null && keys.size > 0);
  });

  const shouldMountPopover = computed(
    () => overlay.isOpen() || everOpened() || hasValueToShow(),
  );

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
   * The filter registration (port sheet §2, §5): the text drives the list's
   * collection, and the items / filter / auto-focus switch come with it.
   * ----------------------------------------------------------------------------------------- */
  const filterRegistrationSignal = signal<
    AutocompleteFilterRegistration | undefined
  >(undefined);

  const registerFilter = (registration: AutocompleteFilterRegistration) => {
    filterRegistration = registration;
    filterRegistrationSignal.set(registration);

    return () => {
      if (filterRegistration === registration) {
        filterRegistration = undefined;
      }

      if (filterRegistrationSignal() === registration) {
        filterRegistrationSignal.set(undefined);
      }
    };
  };

  /* -------------------------------------------------------------------------------------------
   * The owner contract the ListBox inside the popover reads.
   * ----------------------------------------------------------------------------------------- */
  const owner: ListOwner = {
    selectionMode,
    selectedKeys: controlledKeys,
    defaultSelectedKeys: defaultKeys,
    onSelectionChange: emitSelection,
    // A repeated selection still reports a change (Kobalte's Select suite).
    allowDuplicateSelectionEvents: () => true,
    // React Stately's `SelectState` hard-codes `disallowEmptySelection: true`
    // for its single selection, so pressing the selected row reports that key
    // instead of clearing the field (port sheet T-046). A multiple selection
    // allows the empty set: that is how a tag is dropped (T-050).
    disallowEmptySelection: () => local.disallowEmptySelection ?? !isMultiple(),
    disabledKeys: () => local.disabledKeys,
    shouldFocusOnHover: () => true,
    shouldSelectOnPressUp: () => true,
    escape: () => close(),
    // A single selection closes the popover; one more pick in multiple mode
    // leaves it open, so the user can tag several animals in a row.
    closeOnSelection: () => !isMultiple(),
    close,
    isActive: overlay.isOpen,
    registerList: (state: ListState, controls: ListOwnerListControls) =>
      selectState.registerList(state, controls),
    // Port sheet §5, first change: the search text filters the collection.
    filterText: () => filterRegistrationSignal()?.text(),
    defaultFilter: () => filterRegistrationSignal()?.filter(),
    // The list is a virtual-focus collection: the input is the only Tab stop.
    isTabStop: () => false,
    // The root's `items` (or the Filter's) is the dynamic collection the
    // caller-written ListBox renders through its function child.
    items: () =>
      filterRegistrationSignal()?.items() ??
      (local.items as Iterable<unknown> | undefined),
  };

  /* -------------------------------------------------------------------------------------------
   * Render values and the context
   * ----------------------------------------------------------------------------------------- */
  const renderValues: AutocompleteRenderProps = {
    isOpen: overlay.isOpen,
    isDisabled,
    isInvalid,
    isRequired,
    isFocused: fieldFocused,
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
      .filter(
        (part): part is string => typeof part === "string" && part.length > 0,
      )
      .join(" "),
  );

  const stateFacade: AutocompleteStateFacade = {
    // Plain members as upstream, each a tracked getter: a tree that reads one
    // where it binds follows the field.
    get selectedItems() {
      return selectedItems();
    },
    get selectedKeys() {
      return selectionManager()?.selectedKeys() ?? new Set<string>();
    },
    get selectionMode() {
      return selectionMode();
    },
    get isOpen() {
      return overlay.isOpen();
    },
    get isDisabled() {
      return isDisabled();
    },
    get isInvalid() {
      return isInvalid();
    },
    get isRequired() {
      return isRequired();
    },
  };

  const filterSource: AutocompleteFilterSource = {
    inputValue: () => local.inputValue,
    defaultInputValue: () => local.defaultInputValue,
    onInputChange: (value) => local.onInputChange?.(value),
    filter: () => local.filter,
    disableAutoFocusFirst: () => local.disableAutoFocusFirst ?? false,
    items: () => local.items as Iterable<unknown> | undefined,
  };

  const contextValue: AutocompleteContextValue = {
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
    inputFocused,
    setInputFocused,
    isKeyboard: modality.isKeyboard,
    notePointer: () => modality.setPointerModality(),
    noteKeyboard: () => modality.setKeyboardModality(),
    noteFocus: () => modality.onFocus(),
    focusTrigger,
    filterSource,
    registerFilter,
    shouldMountPopover,
    openFocusStrategy: selectState.focusStrategy,
    state: stateFacade,
  };

  const fieldState: FieldState = {
    isRequired,
    isDisabled,
    isInvalid,
    registerLabel: (read) => registerInto(labelSources, read),
    // A press on a `<label for>` focuses the field's control. Upstream the
    // control is the trigger button while the field is closed; its press is
    // not part of the label's.
    focusField: () => focusTrigger(),
  };

  const descriptionState: DescriptionContextValue = {
    registerDescription: (read) => registerInto(descriptionSources, read),
    // The autocomplete stylesheet carries no `[data-invalid] [data-slot=
    // "description"] { hidden }` rule (unlike the select one), so the
    // description stays visible in an invalid field.
    partClass: () => undefined,
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
        (children as (values: AutocompleteRenderProps) => JSX.Element)(
          renderValues,
        ),
      ) as JSX.Element;
    }

    return renderChildren(children as JSX.Element);
  };

  return (
    <OverlayTriggerContext.Provider value={overlay.context}>
      <AutocompleteContext.Provider value={contextValue}>
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
      </AutocompleteContext.Provider>
    </OverlayTriggerContext.Provider>
  );
}
