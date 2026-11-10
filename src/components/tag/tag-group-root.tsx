import type {
  AccessibilityState,
  Bounds,
  JSX,
  Signal,
  StyleProp,
  ViewRef,
  ViewStyle,
} from "nsh";
import { cleanup, computed, signal, split, View } from "nsh";

import {
  createInteractionModality,
  createListState,
  type SelectionBehavior,
  type SelectionMode,
  type SelectionValue,
} from "../../primitives";
import { DescriptionContext } from "../description/context";
import type { DescriptionContextValue } from "../description/context";
import { FieldErrorContext } from "../field-error/context";
import type { FieldErrorState } from "../field-error/context";
import { FieldContext } from "../label/context";
import type { FieldState } from "../label/context";
import {
  findTagDescriptor,
  sortByRenderedOrder,
  TagGroupContext,
  type TagDescriptor,
  type TagGroupContextValue,
} from "./tag-context";
import { tagGroupVariants } from "./tag.styles";

/* -------------------------------------------------------------------------------------------------
 * Props
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `TagGroup.Root` (`TagGroup`): HeroUI 3.2.7's
 * `TagGroupRootProps`, which is React Aria Components' `TagGroup` plus the two
 * variant dimensions it passes down to every `Tag`.
 *
 * The DOM-only members are accepted so code written against HeroUI keeps
 * compiling; port sheet §1.2 and §8 list what they do here.
 */
export interface TagGroupRootProps {
  /** Label / List / Description / ErrorMessage, placed by the caller. */
  children?: JSX.Element;

  /** Appended after the variant classes; later classes win. */
  className?: string;

  style?: StyleProp<ViewStyle>;

  /** A DOM id upstream; here the view's `nativeID`. */
  id?: string;

  nativeID?: string;

  testID?: string;

  tooltip?: JSX.Element;

  /** The tags' size; the group itself paints no dimension. */
  size?: "sm" | "md" | "lg";

  /** The tags' variant; the group itself paints no color. */
  variant?: "default" | "surface";

  /** `"none"` by default, as React Aria's TagGroup. */
  selectionMode?: SelectionMode;

  /** `"toggle"` by default. */
  selectionBehavior?: SelectionBehavior;

  /** The selected keys in controlled mode, or `"all"`. */
  selectedKeys?: "all" | Iterable<string | number>;

  /** The initial selected keys in uncontrolled mode, or `"all"`. */
  defaultSelectedKeys?: "all" | Iterable<string | number>;

  /** Called whenever the selection changes; a `Set` (keys are strings here). */
  onSelectionChange?: (keys: "all" | Set<string>) => void;

  /** Whether the last selected tag can be deselected again (`false` by default). */
  disallowEmptySelection?: boolean;

  /** `false` by default: a pointer press selects on press down. */
  shouldSelectOnPressUp?: boolean;

  /** Keys that cannot be selected, added to each tag's own `isDisabled`. */
  disabledKeys?: Iterable<string | number>;

  /** Called with the keys a delete gesture removes; also enables removal. */
  onRemove?: (keys: Set<string>) => void;

  /** Called when a tag is activated while the group allows no selection. */
  onAction?: (key: string) => void;

  /** `"clearSelection"` by default; `"none"` leaves Escape alone. */
  escapeKeyBehavior?: "clearSelection" | "none";

  "aria-label"?: string;

  /** Accepted, no effect: NSH has no cross-element references (a `Label` registers its text instead). */
  "aria-labelledby"?: string;

  /** Accepted, no effect: a `Description` registers its text instead. */
  "aria-describedby"?: string;

  /** Maps to `accessibilityElementsHidden`. */
  "aria-hidden"?: boolean;

  dir?: "ltr" | "rtl" | "auto";
  lang?: string;
  hidden?: boolean;
  inert?: boolean;
  translate?: "yes" | "no";
  suppressHydrationWarning?: boolean;

  accessibilityLabel?: string;

  accessibilityState?: AccessibilityState;

  accessibilityElementsHidden?: boolean;

  /** Replaces the host element upstream: accepted, no effect. */
  render?: unknown;

  /** A slot collection name upstream: accepted, no effect. */
  slot?: string;

  onFocus?: () => void;
  onBlur?: () => void;

  /** A DOM key event upstream; keys arrive through the list's `keymap` here. */
  onKeyDown?: unknown;
  onKeyUp?: unknown;
  onKeyDownCapture?: unknown;
  onKeyUpCapture?: unknown;

  onLayout?: (event: { bounds: Bounds }) => void;

  /** Reaches the root `View`; a callback, as NSH forwards refs. */
  ref?: (node: ViewRef) => void;
}

/* -------------------------------------------------------------------------------------------------
 * Helpers
 * -----------------------------------------------------------------------------------------------*/

/** `"all"` stays the sentinel; an iterable becomes the string-keyed set. */
function normalizeSelection(
  value: "all" | Iterable<string | number> | undefined,
): SelectionValue | undefined {
  if (value == null) {
    return undefined;
  }

  if (value === "all") {
    return "all";
  }

  const keys = new Set<string>();

  for (const key of value) {
    keys.add(String(key));
  }

  return keys;
}

/** Joins the texts the parts registered, in the order they mounted. */
function joinRegistered(
  parts: readonly (() => string | undefined)[],
): string | undefined {
  const texts = parts
    .map((read) => read())
    .filter((text): text is string => typeof text === "string" && text.length > 0);

  return texts.length > 0 ? texts.join(" ") : undefined;
}

/* -------------------------------------------------------------------------------------------------
 * Root
 * -----------------------------------------------------------------------------------------------*/

/**
 * TagGroup.Root / TagGroupRoot: the four field contexts and the `TagGroup`
 * context, the collection registry every `Tag` joins, and the selection state
 * HeroUI reaches through React Stately. It paints only `tag-group`'s own box
 * (`relative flex flex-col gap-1`, R-028); the grid and its focus live in
 * `TagGroup.List`.
 */
export function TagGroupRoot(props: TagGroupRootProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "id",
    "nativeID",
    "testID",
    "tooltip",
    "size",
    "variant",
    "selectionMode",
    "selectionBehavior",
    "selectedKeys",
    "defaultSelectedKeys",
    "onSelectionChange",
    "disallowEmptySelection",
    "shouldSelectOnPressUp",
    "disabledKeys",
    "onRemove",
    "onAction",
    "escapeKeyBehavior",
    "aria-label",
    "aria-labelledby",
    "aria-describedby",
    "aria-hidden",
    "dir",
    "lang",
    "hidden",
    "inert",
    "translate",
    "suppressHydrationWarning",
    "accessibilityLabel",
    "accessibilityState",
    "accessibilityElementsHidden",
    "render",
    "slot",
    "onFocus",
    "onBlur",
    "onKeyDown",
    "onKeyUp",
    "onKeyDownCapture",
    "onKeyUpCapture",
    "onLayout",
    "ref",
  ] as const);

  /* --- Registered text (the stand-in for label for / aria-describedby) ----- */
  const labelTexts = signal<readonly (() => string | undefined)[]>([]);
  const descriptionTexts = signal<readonly (() => string | undefined)[]>([]);
  const errorTexts = signal<readonly (() => string | undefined)[]>([]);

  const registerInto = (
    store: Signal<readonly (() => string | undefined)[]>,
    read: () => string | undefined,
  ) => {
    store.update((current) => [...current, read]);

    return () => {
      store.update((current) => current.filter((entry) => entry !== read));
    };
  };

  const registerLabel = (read: () => string | undefined) =>
    registerInto(labelTexts, read);
  const registerDescription = (read: () => string | undefined) =>
    registerInto(descriptionTexts, read);
  const registerErrorMessage = (read: () => string | undefined) =>
    registerInto(errorTexts, read);

  const labelText = computed(() => joinRegistered(labelTexts()));
  const descriptionText = computed(() => joinRegistered(descriptionTexts()));
  const errorText = computed(() => joinRegistered(errorTexts()));

  /* --- Selection ----------------------------------------------------------- */
  const selectionMode = (): SelectionMode => local.selectionMode ?? "none";
  const selectionBehavior = (): SelectionBehavior =>
    local.selectionBehavior ?? "toggle";
  const shouldSelectOnPressUp = () => local.shouldSelectOnPressUp ?? false;
  const disallowEmptySelection = () => local.disallowEmptySelection ?? false;
  const escapeKeyBehavior = () =>
    local.escapeKeyBehavior ?? "clearSelection";
  const allowsRemoving = () => local.onRemove != null;

  // Research 4.2: tags register themselves with the nearest group, and the
  // registry becomes the primitive's data source. Registration order is
  // creation order, so a dynamic collection is sorted back into data order
  // through each row's `order` accessor.
  const descriptors = signal<readonly TagDescriptor[]>([]);

  const register = (descriptor: TagDescriptor) => {
    descriptors.set([...descriptors(), descriptor]);

    return () => {
      descriptors.set(descriptors().filter((current) => current !== descriptor));
    };
  };

  const dataSource = computed(() =>
    sortByRenderedOrder(descriptors()).map((descriptor) => ({
      key: descriptor.key,
      textValue: descriptor.textValue(),
      disabled: descriptor.disabled(),
    })),
  );

  // A tag without an `id` still needs a key: React Aria derives one from the
  // item's position. The group hands out one per tag, prefixed with a NUL byte
  // so it can never take a caller's key (the ListBox convention).
  let generatedKeyCount = 0;

  const createKey = () => `\u0000nsh-tag:${generatedKeyCount++}`;

  const isDisabledKey = (key: string) => {
    const keys = local.disabledKeys;

    if (keys == null) {
      return false;
    }

    for (const candidate of keys) {
      if (String(candidate) === key) {
        return true;
      }
    }

    return false;
  };

  const list = createListState({
    dataSource,
    getKey: () => "key",
    getTextValue: () => "textValue",
    getDisabled: () => "disabled",
    selectionMode,
    selectionBehavior,
    selectedKeys: computed(() => normalizeSelection(local.selectedKeys)),
    defaultSelectedKeys: computed(() =>
      normalizeSelection(local.defaultSelectedKeys),
    ),
    onSelectionChange: (keys) => local.onSelectionChange?.(keys),
    disallowEmptySelection,
  });

  const manager = () => list.selectionManager();

  /* --- Focus and modality (state owned here, events from the list) --------- */
  const rootFocused = signal(false);
  const keyboardPressedKey = signal<string | undefined>(undefined);
  const modality = createInteractionModality();

  cleanup(() => modality.reset());

  let focusTarget:
    | { focus: () => void; focusFromPointer: () => void }
    | undefined;

  const registerFocusTarget = (target: {
    focus: () => void;
    focusFromPointer: () => void;
  }) => {
    focusTarget = target;

    return () => {
      if (focusTarget === target) {
        focusTarget = undefined;
      }
    };
  };

  const focusList = (fromPointer: boolean) => {
    if (fromPointer) {
      focusTarget?.focusFromPointer();
    } else {
      focusTarget?.focus();
    }
  };

  const noteFocus = (fromPointer: boolean) => {
    rootFocused.set(true);

    if (!fromPointer) {
      modality.onFocus();
    }
  };

  const noteBlur = () => rootFocused.set(false);

  /* --- Removal and action (RAC's useTagGroup rules) ------------------------ */
  const removeKeys = (key: string) => {
    const onRemove = local.onRemove;

    if (!onRemove) {
      return;
    }

    const selection = manager();

    // The focused tag removes every selected key when it is itself selected;
    // otherwise it removes only itself (react-aria's `useTag`).
    if (selection.selectionMode() !== "none" && selection.isSelected(key)) {
      onRemove(new Set(selection.selectedKeys()));

      return;
    }

    onRemove(new Set([key]));
  };

  // RAC's `useTag`: a remove button's press removes only its own tag, while the
  // Delete / Backspace gesture on a selected tag removes the whole selection.
  const removeTag = (key: string) => {
    local.onRemove?.(new Set([key]));
  };

  const fireAction = (key: string) => {
    local.onAction?.(key);
  };

  /* --- Context ------------------------------------------------------------- */
  const contextValue: TagGroupContextValue = {
    list,
    selectionManager: () => manager(),
    selectionMode,
    selectionBehavior,
    shouldSelectOnPressUp,
    escapeKeyBehavior,
    size: () => local.size,
    variant: () => local.variant,
    isFocused: rootFocused,
    isKeyboard: modality.isKeyboard,
    focusedKey: () => manager().focusedKey(),
    register,
    isDisabledKey,
    disallowEmptySelection,
    allowsRemoving,
    removeKeys,
    removeTag,
    fireAction,
    createKey,
    findDescriptor: (key) => findTagDescriptor(descriptors(), key),
    focusList,
    registerFocusTarget,
    noteFocus,
    noteBlur,
    notePointer: () => modality.setPointerModality(),
    noteKeyboard: () => modality.setKeyboardModality(),
    keyboardPressedKey,
    labelText,
    descriptionText,
    errorText,
    accessibilityLabel: () => local["aria-label"] ?? local.accessibilityLabel,
  };

  /* --- Field contexts (R-030's `p-1` channel) ------------------------------ */
  const fieldState: FieldState = {
    registerLabel,
  };

  // R-030: `.tag-group [slot="description"]` → `p-1`, through the channel the
  // Description already offers, since NSH has no descendant selector.
  const descriptionState: DescriptionContextValue = {
    registerDescription,
    partClass: () => "p-1",
  };

  // R-030: the error message's own `p-1`, through the same kind of channel.
  const fieldErrorState: FieldErrorState = {
    registerErrorMessage,
    partClass: () => "p-1",
  };

  /* --- Classes ------------------------------------------------------------- */
  const classes = computed(() =>
    [tagGroupVariants().base(), local.className]
      .filter((part): part is string => typeof part === "string" && part.length > 0)
      .join(" "),
  );

  // R-027: the root is a plain View. RAC's `FieldSlotsGate` only delayed the
  // mounting of Description / ErrorMessage; here both register themselves with
  // the contexts above, so there is nothing to wait for.
  //
  // R-025 pattern: the row itself is a core `View`; `data-slot` is dropped
  // (D18) and a test identifies a part with `testID`.
  //
  // The group provides four contexts, so `props.children` is read at the
  // placement inside them, exactly once (common rules' provider exception).
  return (
    <TagGroupContext.Provider value={contextValue}>
      <FieldContext.Provider value={fieldState}>
        <DescriptionContext.Provider value={descriptionState}>
          <FieldErrorContext.Provider value={fieldErrorState}>
            <View
              {...rest}
              ref={(node) => local.ref?.(node)}
              testID={local.testID}
              nativeID={local.id ?? local.nativeID}
              tooltip={local.tooltip}
              accessibilityLabel={local.accessibilityLabel}
              accessibilityState={local.accessibilityState}
              accessibilityElementsHidden={
                local["aria-hidden"] ?? local.accessibilityElementsHidden
              }
              class={classes()}
              style={local.style}
              onFocus={local.onFocus}
              onBlur={local.onBlur}
              onLayout={local.onLayout}
            >
              {local.children}
            </View>
          </FieldErrorContext.Provider>
        </DescriptionContext.Provider>
      </FieldContext.Provider>
    </TagGroupContext.Provider>
  );
}
