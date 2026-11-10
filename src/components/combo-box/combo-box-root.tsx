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
  keymap,
  signal,
  split,
  untracked,
  View,
} from "nsh";

import {
  createInteractionModality,
  createOverlayTrigger,
  createSelectState,
  getItemCount,
  type ListOwner,
  ListOwnerContext,
  type ListOwnerListControls,
  type ListState,
  OverlayTriggerContext,
  type SelectionManager,
  type SelectionMode,
} from "../../primitives";
import { createControllableSignal } from "../../primitives/create-controllable-signal";
import { renderChildren } from "../list-box/children";
import { DescriptionContext } from "../description/context";
import type { DescriptionContextValue } from "../description/context";
import { FieldErrorContext } from "../field-error/context";
import type { FieldErrorState } from "../field-error/context";
import { FieldContext } from "../label/context";
import type { FieldState } from "../label/context";
import {
  TextFieldContext,
  type TextFieldContextValue,
} from "../textfield/textfield-context";
import {
  ComboBoxContext,
  type ComboBoxContextValue,
  type ComboBoxMenuTrigger,
  type ComboBoxSelectedItem,
  type ComboBoxStateFacade,
} from "./combo-box-context";
import { comboBoxVariants, type ComboBoxVariants } from "./combo-box.styles";
import { createComboBoxFilterState } from "./create-combo-box-state";
import { formatComboBoxListText } from "./combo-box-list-format";

/* -------------------------------------------------------------------------------------------------
 * Render props
 * -----------------------------------------------------------------------------------------------*/

/**
 * What a `children` function receives (HeroUI's `ComboBoxRenderProps`). React
 * Aria puts exactly these five in it (`ComboBox.tsx:277-286`); the focus flags
 * are the trigger's, not the field's, so they are not part of this set.
 */
export interface ComboBoxRenderProps {
  isOpen: Accessor<boolean>;
  isDisabled: Accessor<boolean>;
  isInvalid: Accessor<boolean>;
  isRequired: Accessor<boolean>;
  isReadOnly: Accessor<boolean>;
}

/* -------------------------------------------------------------------------------------------------
 * Root
 * -----------------------------------------------------------------------------------------------*/

/**
 * The selection payload `onChange` receives: a key or `null` in single mode,
 * the keys in selection order in multiple mode.
 */
export type ComboBoxSelection =
  | string
  | number
  | null
  | (string | number)[];

/**
 * The props of `ComboBox.Root`: HeroUI 3.2.7's `ComboBoxRootProps`, which is
 * React Aria Components' `ComboBox` plus `variant`, expressed with NSH host
 * props.
 *
 * Both selection spellings are accepted: the official `value` / `defaultValue`
 * / `onChange` and the deprecated single-select `selectedKey` /
 * `defaultSelectedKey` / `onSelectionChange`. The official name wins when both
 * are present, as React Aria's `useControlledState` does
 * (`useComboBoxState.ts:216-221`).
 */
export interface ComboBoxRootProps<T = unknown> extends ComboBoxVariants {
  /**
   * The variant dimension (`"primary"` by default). HeroUI 3.2.7's variant
   * table and CSS carry no `secondary` branch, so it makes no class; it is
   * accepted and handed to the parts through the context (port sheet §1).
   */
  variant?: "primary" | "secondary";

  /** The field's parts; a one-parameter function is a render prop (D17). */
  children?: JSX.Element | ((values: ComboBoxRenderProps) => JSX.Element);

  /** Appended after the variant classes; function form gets the same accessors. */
  className?: string | ((values: ComboBoxRenderProps) => string);

  style?:
    | StyleProp<ViewStyle>
    | ((values: ComboBoxRenderProps) => StyleProp<ViewStyle>);

  /** The root view, as `ComponentPropsWithRef` gives upstream. */
  ref?: (node: ViewRef) => void;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;
  nativeID?: string;
  testID?: string;
  tooltip?: JSX.Element;

  /** The dynamic collection, or the initial one through `defaultItems`. */
  items?: Iterable<T>;
  defaultItems?: Iterable<T>;

  /** `"single"` by default; it decides the value's text and the close rule. */
  selectionMode?: "single" | "multiple";

  /** The selection in controlled mode: a key or `null`, or the keys. */
  value?: string | number | null | Iterable<string | number>;

  /** The initial selection in uncontrolled mode. */
  defaultValue?: string | number | null | Iterable<string | number>;

  /** The selection changed (the payload is `ComboBoxSelection`). */
  onChange?: (selection: ComboBoxSelection) => void;

  /** HeroUI's deprecated single-select controlled key. */
  selectedKey?: string | number | null;

  /** HeroUI's deprecated single-select initial key. */
  defaultSelectedKey?: string | number | null;

  /** HeroUI's deprecated single-select change callback. */
  onSelectionChange?: (key: string | number | null) => void;

  /** Options that cannot be selected; the list receives them through the owner. */
  disabledKeys?: Iterable<string | number>;

  /** A text that matches no option still commits as a custom value (§2). */
  allowsCustomValue?: boolean;

  /** Keep the list open when the filter matches nothing. */
  allowsEmptyCollection?: boolean;

  /** What opens the list: focus, typing, or only the trigger and the arrows. */
  menuTrigger?: ComboBoxMenuTrigger;

  /** The input's text in controlled mode: the display value and the filter. */
  inputValue?: string;

  /** The input's initial text in uncontrolled mode. */
  defaultInputValue?: string;

  /** The text changed (`useComboBoxState.ts:104`). */
  onInputChange?: (value: string) => void;

  /** The caller's filter; the language-aware `contains` when absent. */
  defaultFilter?: (textValue: string, inputValue: string) => boolean;

  /** Wraps the keyboard focus at either end of the list. */
  shouldFocusWrap?: boolean;

  /** The list opened or closed; `menuTrigger` is the mode, as upstream. */
  onOpenChange?: (isOpen: boolean, menuTrigger?: ComboBoxMenuTrigger) => void;

  isDisabled?: boolean;
  isRequired?: boolean;
  isInvalid?: boolean;

  /** The input refuses edits and the trigger cannot open the list. */
  isReadOnly?: boolean;

  /** Accepted, no effect: `isInvalid` is the only validation source (port sheet §8). */
  validationBehavior?: "native" | "aria";

  /** Accepted, no effect: there is no form validation flow to run it in. */
  validate?: (value: unknown) => string | readonly string[] | null | undefined;

  /** The error messages `FieldError` falls back to. */
  validationErrors?: readonly string[];

  /** Accepted, no effect: NSH has no form submission or hidden field. */
  name?: string;
  form?: string;
  formValue?: string;

  /** The input's autofill hint. */
  autoComplete?: string;

  /** Focuses the input after mount (macOS and the web move view focus). */
  autoFocus?: boolean;

  /** Accepted, no effect: NSH has no tab index, only `focusable`. */
  excludeFromTabOrder?: boolean;

  /** The input took the focus. */
  onFocus?: () => void;

  /** The input lost the focus. */
  onBlur?: () => void;

  /** Either focus transition. */
  onFocusChange?: (isFocused: boolean) => void;

  /** Names the input and the list; wins over a registered Label's text. */
  "aria-label"?: string;

  /** Accepted, no effect: NSH resolves no accessible names from ids. */
  "aria-labelledby"?: string;

  /** Accepted, no effect: NSH resolves no descriptions from ids. */
  "aria-describedby"?: string;

  "aria-details"?: string;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect: NSH cannot replace the host element. */
  render?: unknown;

  /** Accepted, no effect: the accessible state is composed from the field state. */
  accessibilityState?: AccessibilityState;

  onLayout?: (e: { bounds: Bounds }) => void;
}

/** `"all"` stays a sentinel; an iterable becomes the string-keyed set. */
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
 * ComboBox.Root / ComboBoxRoot: the field container, the text and open states,
 * the six contexts and the keymap scope. HeroUI's root is React Aria's
 * `ComboBox`, a plain `<div>` with no role; Kobalte's `role="group"` is not
 * HeroUI's contract and is not carried (port sheet §3).
 */
export function ComboBoxRoot<T>(props: ComboBoxRootProps<T>): JSX.Element {
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
    "defaultItems",
    "selectionMode",
    "value",
    "defaultValue",
    "onChange",
    "selectedKey",
    "defaultSelectedKey",
    "onSelectionChange",
    "disabledKeys",
    "allowsCustomValue",
    "allowsEmptyCollection",
    "menuTrigger",
    "inputValue",
    "defaultInputValue",
    "onInputChange",
    "defaultFilter",
    "shouldFocusWrap",
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
    "formValue",
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
    "slot",
    "render",
    "accessibilityState",
    "onLayout",
    "variant",
    "fullWidth",
  ] as const);

  const variant = () => local.variant ?? "primary";
  const fullWidth = () => local.fullWidth ?? false;
  const slots = computed(() => comboBoxVariants({ fullWidth: fullWidth() }));

  const selectionMode = (): SelectionMode => local.selectionMode ?? "single";
  const isMultiple = () => selectionMode() === "multiple";
  const menuTrigger = (): ComboBoxMenuTrigger => local.menuTrigger ?? "focus";

  /* -------------------------------------------------------------------------------------------
   * Field state
   * ----------------------------------------------------------------------------------------- */
  const isDisabled = () => local.isDisabled ?? false;
  const isRequired = () => local.isRequired ?? false;
  const isInvalid = () => local.isInvalid ?? false;
  const isReadOnly = () => local.isReadOnly ?? false;

  /* -------------------------------------------------------------------------------------------
   * The text: a display value and the filter at once
   * ----------------------------------------------------------------------------------------- */
  const [controlledText, setInputText] = createControllableSignal<string>({
    value: () => local.inputValue,
    defaultValue: () => local.defaultInputValue ?? "",
    onChange: (next) => local.onInputChange?.(next),
  });

  const text = () => controlledText() ?? "";

  /** The root's collection: `items ?? defaultItems` (port sheet §1). */
  const items = computed<Iterable<T> | undefined>(
    () => local.items ?? local.defaultItems,
  );

  const itemList = computed<readonly T[] | undefined>(() => {
    const source = items();

    return source === undefined ? undefined : Array.from(source);
  });

  /* -------------------------------------------------------------------------------------------
   * Open state and the list registry (port sheet §5, first and third changes)
   * ----------------------------------------------------------------------------------------- */
  const overlay = createOverlayTrigger({
    onOpenChange: (open) => local.onOpenChange?.(open, menuTrigger()),
  });

  // The field's focus handle, registered by the `Input` inside the field; the
  // list never takes the view focus (port sheet §5: `focusTarget`).
  let inputFocus: (() => void) | undefined;
  const focusInput = () => inputFocus?.();

  const selectState = createSelectState({
    isOpen: overlay.isOpen,
    setIsOpen: overlay.setIsOpen,
    collection: () => selectState.list()?.collection(),
    selectionManager: () => selectState.list()?.selectionManager(),
    focusTarget: () => focusInput(),
  });

  const {
    list,
    controls: listControls,
    open,
    close,
  } = selectState;

  const selectionManager: Accessor<SelectionManager | undefined> = () =>
    list()?.selectionManager();

  const focusedKey = computed(() => selectionManager()?.focusedKey());

  /* -------------------------------------------------------------------------------------------
   * Selection: HeroUI's official and deprecated spellings, normalized
   * ----------------------------------------------------------------------------------------- */
  const controlledKeys = computed<"all" | Set<string> | undefined>(() => {
    if (isMultiple()) {
      if (local.value === undefined) {
        return undefined;
      }

      return local.value === null
        ? new Set<string>()
        : toKeySet(local.value as "all" | Iterable<string | number>);
    }

    const key =
      local.value !== undefined ? local.value : local.selectedKey;

    if (key === undefined) {
      return undefined;
    }

    return key === null
      ? new Set<string>()
      : new Set<string>([String(key)]);
  });

  const defaultKeys = computed<"all" | Set<string> | undefined>(() => {
    if (isMultiple()) {
      if (local.defaultValue === undefined) {
        return undefined;
      }

      return local.defaultValue === null
        ? new Set<string>()
        : toKeySet(local.defaultValue as "all" | Iterable<string | number>);
    }

    const key =
      local.defaultValue !== undefined
        ? local.defaultValue
        : local.defaultSelectedKey;

    if (key === undefined) {
      return undefined;
    }

    return key === null
      ? new Set<string>()
      : new Set<string>([String(key)]);
  });

  /** React Aria's `resetInputValue`: the chosen text, or nothing in multiple mode. */
  const resetInputValue = (keys: "all" | Set<string>) => {
    if (isMultiple()) {
      setInputText("");

      return;
    }

    const key = keys === "all" ? undefined : keys.values().next().value;
    const textValue =
      key == null ? undefined : listControls()?.findItem(key)?.textValue();

    setInputText(textValue ?? "");
  };

  const emitSelection = (keys: "all" | Set<string>) => {    // React Aria's `resetInputValue` runs inside the selection change handler,
    // not in an effect: a single selection writes the chosen item's text, a
    // multiple one clears the input (`useComboBoxState.ts:526-560`). Doing it
    // here is what keeps a later registry refresh from overwriting the text the
    // user is typing.
    resetInputValue(keys);

    if (isMultiple()) {
      local.onChange?.(keys === "all" ? [] : Array.from(keys));

      return;
    }

    const key = keys === "all" ? null : (keys.values().next().value ?? null);

    local.onChange?.(key);
    // React Aria keeps calling the deprecated single-select callback as well.
    local.onSelectionChange?.(key);
  };

  const selectedKeys = computed<Set<string>>(() => {
    const keys = selectionManager()?.selectedKeys();

    return keys instanceof Set ? keys : new Set<string>();
  });

  const isSelectionEmpty = computed(() => selectedKeys().size === 0);

  const selectedItems = computed<readonly ComboBoxSelectedItem[]>(() => {
    const entries = itemList();
    const controls = listControls();
    const result: ComboBoxSelectedItem[] = [];

    // The selection set keeps insertion order, which is the order the user
    // chose the entries in.
    for (const key of selectedKeys()) {
      const value = entries?.find(
        (entry, index) =>
          String((entry as { id?: string | number } | undefined)?.id ?? index) ===
          key,
      );
      const registered = controls?.findItem(key)?.textValue();
      const fallback = (value as { textValue?: string; name?: string } | undefined);
      const textValue =
        registered ?? fallback?.textValue ?? fallback?.name;

      result.push({
        key,
        value,
        textValue: typeof textValue === "string" ? textValue : undefined,
      });
    }

    return result;
  });

  const selectedText = computed<string | undefined>(() => {
    const texts = selectedItems()
      .map((item) => item.textValue ?? "")
      .filter((value) => value.length > 0);

    if (texts.length === 0) {
      return undefined;
    }

    // `useListFormatter()`'s default: `Intl.ListFormat(locale, {})`, i.e. the
    // conjunction — `"One and Three"`, not `"One, Three"` (ComboBox.tsx:424).
    return isMultiple() ? formatComboBoxListText(texts) : texts[0];
  });

  // A `defaultValue` / controlled `value` selects before the list has
  // registered, so its text can only resolve once the list reports its options.
  // Upstream's initial text is the selected item's, unless the caller gave an
  // explicit `defaultInputValue`.
  let resolvedInitial = false;

  effect(() => {
    const keys = selectedKeys();
    const controls = listControls();

    if (
      resolvedInitial ||
      !controls ||
      keys.size === 0 ||
      local.defaultInputValue !== undefined ||
      local.inputValue !== undefined
    ) {
      return;
    }

    resolvedInitial = true;

    if (!isMultiple()) {
      setInputText(selectedText() ?? "");
    }
  });

  /* -------------------------------------------------------------------------------------------
   * Text, filter and the commits (port sheet §2, side effects)
   * ----------------------------------------------------------------------------------------- */
  const filter = createComboBoxFilterState({
    isOpen: overlay.isOpen,
    inputValue: text,
    // The default filter only runs when the root owns no collection
    // (`useComboBoxState.ts:298-306`).
    items,
  });

  const hasVisibleOptions = () => {
    const collection = list()?.collection();

    if (!collection) {
      return true;
    }

    return getItemCount(collection) > 0;
  };

  const commitSelection = () => setInputText(selectedText() ?? "");

  const commitCustomValue = () => {
    // RAC's `commitCustomValue`: a single selection is cleared, a multiple one
    // keeps its selection and only the text stays (useComboBoxState.ts:541-560).
    if (!isMultiple()) {
      // Clearing the selection runs `resetInputValue`; the custom text is put
      // back immediately, as React Aria's own `setInputValue` does.
      const typed = text();

      selectionManager()?.setSelectedKeys(new Set<string>());
      setInputText(typed);
    }
  };

  const commitValue = () => {
    if (local.allowsCustomValue && text() !== (selectedText() ?? "")) {
      commitCustomValue();
    } else {
      commitSelection();
    }
  };

  const revert = () => {
    if (local.allowsCustomValue && isSelectionEmpty()) {
      commitCustomValue();
    } else {
      commitSelection();
    }

    close();
  };

  const commitFocused = () => {
    const key = focusedKey();
    const manager = selectionManager();

    if (key != null && manager) {
      // An already-selected single option is committed without a second
      // selection event (`useComboBoxState.ts:551-568`; Kobalte's T-047).
      if (isMultiple() || !manager.isSelected(key)) {
        manager.select(key);
      }
    }

    if (!isMultiple()) {
      commitSelection();
      close();
    }
  };

  /**
   * The input's own text change: the field writes the text, then decides
   * whether it opens or closes by the same rules as `useComboBoxState.ts:415-438`.
   */
  const setValue = (next: string) => {
    const previous = text();

    setInputText(next);
    // The filter follows the new text in this same turn, so the decision below
    // sees the collection this text produces.
    filter.noteText(next);

    if (next === previous) {
      return;
    }

    filter.noteInput();

    const canShowEmpty = local.allowsEmptyCollection === true;
    const visible = hasVisibleOptions();

    if (overlay.isOpen() && !canShowEmpty && !visible) {
      close();

      return;
    }

    if (overlay.isOpen()) {
      return;
    }

    // `input` mode opens on the first text that really changed; `manual` only
    // filters while typing (`useComboBoxState.ts:415-425`).
    if (
      inputFocused() &&
      menuTrigger() !== "manual" &&
      (visible || canShowEmpty)
    ) {
      open();
    }
  };

  /* -------------------------------------------------------------------------------------------
   * Trigger and anchor registrations (port sheet §4, R-005 and R-037)
   * ----------------------------------------------------------------------------------------- */
  const triggerCount = signal(0);
  const hasTrigger = computed(() => triggerCount() > 0);

  const registerTrigger = () => {
    triggerCount.update((count) => count + 1);

    return () => triggerCount.update((count) => count - 1);
  };

  const anchorRef = signal<ViewRef | undefined>(undefined);

  const registerAnchor = (node: ViewRef) => {
    anchorRef.set(node);

    return () => {
      if (anchorRef() === node) {
        anchorRef.set(undefined);
      }
    };
  };

  /* -------------------------------------------------------------------------------------------
   * Focus and modality
   * ----------------------------------------------------------------------------------------- */
  const inputFocused = signal(false);
  const modality = createInteractionModality();

  cleanup(() => modality.reset());

  const isFocused = () => inputFocused();
  const isKeyboard = modality.isKeyboard;

  const registerInputFocus = (focus: () => void) => {
    inputFocus = focus;

    return () => {
      if (inputFocus === focus) {
        inputFocus = undefined;
      }
    };
  };

  const openManually = (strategy: "first" | "last" | boolean) => {
    // The trigger and the arrow keys show every option; the first typed
    // character clears that window (`useComboBoxState.ts:338`, `:364`).
    filter.showAllOptions();
    open(strategy);
  };

  const handleInputFocus = () => {
    inputFocused.set(true);
    modality.onFocus();
    local.onFocusChange?.(true);
    local.onFocus?.();

    if (!isReadOnly() && menuTrigger() === "focus" && !overlay.isOpen()) {
      open();
    }
  };

  const handleInputBlur = () => {
    inputFocused.set(false);
    local.onFocusChange?.(false);
    local.onBlur?.();

    if (!overlay.isOpen()) {
      return;
    }

    // Tab commits the highlighted option and closes (`useComboBox.ts:218-235`).
    // NSH has no Tab hook a component can observe before the focus moves (a
    // keymap binding would consume the key and stop the move), so the commit
    // runs on the blur the Tab causes; with no highlight the text is committed
    // and the list closes (port sheet §6 deviation).
    if (focusedKey() != null) {
      commitFocused();

      return;
    }

    commitValue();
    close();
  };

  const handleInputKeyPress = (event: { key: string }) => {
    if (event.key !== "Enter" || !overlay.isOpen()) {
      return;
    }

    if (focusedKey() != null) {
      commitFocused();

      return;
    }

    commitValue();
  };

  /* -------------------------------------------------------------------------------------------
   * Keyboard while the input holds the focus (virtual focus)
   *
   * The arrows move the input's caret, so Keymap's default rules would leave
   * them to the input and the list would never see one. A ComboBox consumes
   * them on purpose (React Aria's `useComboBox` handles ArrowDown / ArrowUp on
   * the combobox input), so these scopes ask for `when: "always"`. Home, End,
   * PageUp and PageDown stay unbound while the field is closed, where they are
   * the caret's. No list key is bound globally: each scope lives only while the
   * input has the focus (`_common` "NSH component rules").
   * ----------------------------------------------------------------------------------------- */
  const runListKey = (key: string) => {
    if (!overlay.isOpen()) {
      return;
    }

    listControls()?.handleKeyDown?.({ key });
  };

  effect(() => {
    if (!inputFocused()) {
      return;
    }

    return keymap.bind(
      {
        down: () => {
          if (overlay.isOpen()) {
            runListKey("down");
          } else {
            openManually("first");
          }
        },
        up: () => {
          if (overlay.isOpen()) {
            runListKey("up");
          } else {
            openManually("last");
          }
        },
        escape: () => revert(),
      },
      { when: "always", repeat: true },
    );
  });

  effect(() => {
    if (!inputFocused() || !overlay.isOpen()) {
      return;
    }

    return keymap.bind(
      {
        home: () => runListKey("home"),
        end: () => runListKey("end"),
        pageup: () => runListKey("pageup"),
        pagedown: () => runListKey("pagedown"),
      },
      { when: "always", repeat: true },
    );
  });

  const toggle = () => {
    if (overlay.isOpen()) {
      close();

      return;
    }

    // A manual open (the trigger) shows every option and highlights the
    // selected one, else the first (`useComboBoxState.open(strategy, 'manual')`).
    openManually("first");
  };

  const commitClose = () => {
    commitValue();
    close();
  };

  /* -------------------------------------------------------------------------------------------
   * Registered texts: the label names the input, the description and the error
   * message become its hint (the stand-in for aria-describedby).
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
   * The owner contract the ListBox inside the popover reads.
   * ----------------------------------------------------------------------------------------- */
  const owner: ListOwner = {
    selectionMode,
    selectedKeys: controlledKeys,
    defaultSelectedKeys: defaultKeys,
    onSelectionChange: emitSelection,
    // `useComboBoxState.ts:255`: a repeated selection still reports a change.
    allowDuplicateSelectionEvents: () => true,
    // `useComboBoxState.ts:253`: single selection can never be emptied.
    disallowEmptySelection: () => !isMultiple(),
    disabledKeys: () => local.disabledKeys,
    shouldFocusOnHover: () => true,
    shouldSelectOnPressUp: () => true,
    escape: () => revert(),
    closeOnSelection: () => !isMultiple(),
    close,
    isActive: overlay.isOpen,
    registerList: (state: ListState, controls: ListOwnerListControls) =>
      selectState.registerList(state, controls),
    filterText: filter.filterText,
    defaultFilter: () => local.defaultFilter,
    // The list is a virtual-focus collection: the input is the only Tab stop.
    isTabStop: () => false,
    items,
  };

  /* -------------------------------------------------------------------------------------------
   * The input's side of the field context (port sheet §5, second change)
   * ----------------------------------------------------------------------------------------- */
  const inputPartClass = computed(() => {
    // R-004: `.combo-box [data-slot="input"]` → `min-w-0 flex-1`.
    // R-005: `:has(+ .combo-box__trigger)` → `pe-7`, through the trigger's
    // registration (upstream's adjacent sibling has no selector here).
    return ["min-w-0 flex-1", hasTrigger() ? "pe-7" : undefined]
      .filter((part): part is string => typeof part === "string")
      .join(" ");
  });

  const accessibilityLabel = computed(
    () => local["aria-label"] ?? labelText(),
  );

  const textField: TextFieldContextValue = {
    variant: () =>
      variant() === "secondary" ? "secondary" : "primary",
    // R-039 / R-040 put `w-full` on the root and the input group only; the
    // input stretches with `flex-1` inside the group.
    fullWidth: () => false,
    value: text,
    setValue,
    isDisabled,
    isReadOnly,
    isRequired,
    isInvalid,
    accessibilityLabel,
    accessibilityHint: computed(() => joinedText([descriptionText, errorText])),
    type: () => undefined,
    inputMode: () => undefined,
    enterKeyHint: () => undefined,
    autoComplete: () => local.autoComplete,
    autoCorrect: () => undefined,
    maxLength: () => undefined,
    autoFocus: () => local.autoFocus,
    handleFocus: handleInputFocus,
    handleBlur: handleInputBlur,
    registerInputFocus,
    focusInput,
    onPaste: undefined,
    onCompositionChange: undefined,
    onSelectionChange: undefined,
    inputPartClass,
    onKeyPress: handleInputKeyPress,
    // The input is the `combobox` itself; `aria-expanded` rides on it upstream.
    role: () => "combobox",
    accessibilityState: () => ({ expanded: overlay.isOpen() }),
  };

  /* -------------------------------------------------------------------------------------------
   * Render values and the context
   * ----------------------------------------------------------------------------------------- */
  const renderValues: ComboBoxRenderProps = {
    isOpen: overlay.isOpen,
    isDisabled,
    isInvalid,
    isRequired,
    isReadOnly,
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

  const stateFacade: ComboBoxStateFacade = {
    get selectedItems() {
      return selectedItems();
    },
    get selectedKeys() {
      return selectedKeys();
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
    get isReadOnly() {
      return isReadOnly();
    },
    get inputValue() {
      return text();
    },
  };

  const contextValue: ComboBoxContextValue = {
    slots,
    variant: () => (variant() === "secondary" ? "secondary" : "primary"),
    isOpen: overlay.isOpen,
    open,
    close,
    commitClose,
    toggle,
    menuTrigger,
    selectionMode,
    selectedKeys,
    selectedItems,
    selectedText,
    isSelectionEmpty,
    inputValue: text,
    setInputValue: setValue,
    filterText: filter.filterText,
    defaultFilter: () => local.defaultFilter,
    items,
    allowsCustomValue: () => local.allowsCustomValue === true,
    allowsEmptyCollection: () => local.allowsEmptyCollection === true,
    isDisabled,
    isRequired,
    isInvalid,
    isReadOnly,
    isFocused,
    setInputFocused: (focused) => inputFocused.set(focused),
    isKeyboard,
    notePointer: () => modality.setPointerModality(),
    noteKeyboard: () => modality.setKeyboardModality(),
    inputPartClass,
    handleInputKeyPress,
    registerTrigger,
    hasTrigger,
    registerAnchor,
    anchorRef,
    list,
    listControls,
    selectionManager,
    focusedKey,
    commitFocused,
    commitValue,
    revert,
    labelText,
    ariaLabel: () => local["aria-label"],
    descriptionText,
    errorText,
    focusInput,
    state: stateFacade,
  };

  const fieldState: FieldState = {
    isRequired,
    isDisabled,
    isInvalid,
    registerLabel: (read) => registerInto(labelSources, read),
    // A press on a `<label for>` focuses the field's control: the input.
    focusField: () => focusInput(),
  };

  const descriptionState: DescriptionContextValue = {
    registerDescription: (read) => registerInto(descriptionSources, read),
    // R-002: `.combo-box[data-invalid] [data-slot="description"] { hidden }`.
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
        (children as (values: ComboBoxRenderProps) => JSX.Element)(
          renderValues,
        ),
      ) as JSX.Element;
    }

    return renderChildren(children as JSX.Element);
  };

  return (
    <OverlayTriggerContext.Provider value={overlay.context}>
      <ComboBoxContext.Provider value={contextValue}>
        <TextFieldContext.Provider value={textField}>
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
        </TextFieldContext.Provider>
      </ComboBoxContext.Provider>
    </OverlayTriggerContext.Provider>
  );
}
