import type { Accessor, Bounds, JSX, Size, StyleProp, ViewRef, ViewStyle } from "nsh";
import { cleanup, computed, effect, signal, split, untracked, View } from "nsh";

import { createSingleSelectListState } from "../../primitives/list";
import { renderChildren } from "./children";
import {
  TabsContext,
  type TabsAlign,
  type TabsContextValue,
  type TabsKeyboardActivation,
  type TabsOrientation,
  type TabsSlots,
  type TabsTabDescriptor,
  type TabsVariant,
} from "./tabs-context";
import { type TabsKey, decodeTabKey, encodeTabKey } from "./tabs-key";
import { tabsVariants } from "./tabs.styles";

/* -------------------------------------------------------------------------------------------------
 * Props
 * -----------------------------------------------------------------------------------------------*/

/** The values HeroUI's `Tabs` hands a function child (React Aria's `TabsRenderProps`). */
export interface TabsRootRenderProps {
  /** The list's orientation. */
  orientation: Accessor<TabsOrientation>;

  /**
   * React Aria's default content. NSH has no collection to build it from, so
   * it is always `undefined`; a function child that ignores it renders the
   * same tree it would render inline (port sheet §1).
   */
  defaultChildren: JSX.Element | undefined;
}

/**
 * The props of `Tabs.Root`: HeroUI 3.2.7's `TabsRootProps`, which is React Aria
 * Components' `Tabs` props plus `TabsVariants`.
 *
 * The DOM-only members upstream (the global DOM attributes, `render`, `slot`,
 * pointer and wheel events) are accepted so code written against HeroUI keeps
 * compiling; port sheet §1 and §8 say what each can and cannot do. `ref` is a
 * callback because NSH forwards refs that way (`_common` §46).
 */
export interface TabsRootProps {
  /** The tab list and the panels, or a one-argument render function called once. */
  children?: JSX.Element | ((values: TabsRootRenderProps) => JSX.Element);

  /** Appended after the base slot classes; later classes win. */
  className?: string;

  /** Style of the root; `dir` lands here as `direction`. */
  style?: StyleProp<ViewStyle>;

  /** The axis the tabs run along. @default "horizontal" */
  orientation?: TabsOrientation;

  /** The look: a filled pill (`primary`) or an underline (`secondary`). @default "primary" */
  variant?: TabsVariant;

  /** Where the tab content sits inside its tab. @default "center" */
  align?: TabsAlign;

  /** The selected key, controlled. `null` counts as absent, as in Kobalte. */
  selectedKey?: TabsKey | null;

  /** The key selected before the user interacts, uncontrolled. */
  defaultSelectedKey?: TabsKey;

  /** Called with the decoded key whenever the selection changes. */
  onSelectionChange?: (key: TabsKey) => void;

  /** Keys that cannot be selected or reached by the arrow keys. */
  disabledKeys?: Iterable<TabsKey>;

  /** Disables every tab in the group. @default false */
  isDisabled?: boolean;

  /**
   * `automatic` selects while the arrow keys move the focus; `manual` waits for
   * Return / Space on the focused tab. @default "automatic"
   */
  keyboardActivation?: TabsKeyboardActivation;

  /**
   * The layout direction (a DOM attribute upstream). NSH can set it but cannot
   * read an inherited one, so this is also what flips the horizontal arrows and
   * the scroll buttons' step; `"auto"` leaves it unknown (port sheet §8).
   */
  dir?: "ltr" | "rtl" | "auto";

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** The name other elements refer to. */
  nativeID?: string;

  /** An identifier for UI tests. */
  testID?: string;

  /** NSH's accessible name for the root. */
  accessibilityLabel?: string;

  /** Hides the root from assistive technologies. */
  accessibilityElementsHidden?: boolean;

  /** Accepted: NSH's accessible name through the DOM spelling. */
  "aria-label"?: string;

  /** Accepted, no effect: NSH has no DOM visibility attribute. */
  hidden?: boolean;

  /** Accepted, no effect: NSH has no inert subtree flag. */
  inert?: boolean;

  /** Accepted, no effect: NSH derives direction from the platform / root. */
  lang?: string;

  /** Accepted, no effect: NSH cannot replace the host element. */
  render?: unknown;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect: a view reports presses, not DOM clicks. */
  onClick?: unknown;

  /** Accepted, no effect: a view reports presses, not pointer events. */
  onPointerDown?: unknown;
  onPointerUp?: unknown;
  onPointerMove?: unknown;

  /** Accepted, no effect: NSH has no wheel event. */
  onWheel?: unknown;

  /** Accepted, no effect (D18: no data attributes). */
  [key: `data-${string}`]: unknown;

  /** The root view; a callback, as NSH forwards refs. */
  ref?: (node: ViewRef) => void;
}

/* -------------------------------------------------------------------------------------------------
 * Root
 * -----------------------------------------------------------------------------------------------*/

/**
 * `Tabs.Root` / `TabsRoot`: the group that owns the selection, the tab
 * registry and the indicator state, and provides them to every part.
 *
 * RAC's `Tabs` gives RAC's own collection and selection manager; here the
 * collection is built by `createSingleSelectListState` from the tabs that
 * register themselves (research 4.2), which is Kobalte's `createDomCollection`
 * with the DOM query replaced by the registry (port sheet §2).
 */
export function TabsRoot(props: TabsRootProps): JSX.Element {
  const [local] = split(props, [
    "children",
    "className",
    "style",
    "orientation",
    "variant",
    "align",
    "selectedKey",
    "defaultSelectedKey",
    "onSelectionChange",
    "disabledKeys",
    "isDisabled",
    "keyboardActivation",
    "dir",
    "id",
    "nativeID",
    "testID",
    "accessibilityLabel",
    "accessibilityElementsHidden",
    "aria-label",
    "hidden",
    "inert",
    "lang",
    "render",
    "slot",
    "onClick",
    "onPointerDown",
    "onPointerUp",
    "onPointerMove",
    "onWheel",
    "ref",
  ] as const);

  /* -------------------------------------------------------------------------------------------
   * Read-only inputs (research 4.1: the body runs once, so every value is an
   * accessor read where it is used).
   * ----------------------------------------------------------------------------------------- */
  const orientation = computed<TabsOrientation>(() => local.orientation ?? "horizontal");
  const variant = computed<TabsVariant>(() => local.variant ?? "primary");
  const align = computed<TabsAlign>(() => local.align ?? "center");
  const isDisabled = computed(() => local.isDisabled ?? false);
  const keyboardActivation = computed<TabsKeyboardActivation>(
    () => local.keyboardActivation ?? "automatic",
  );
  const dir = computed<"ltr" | "rtl" | undefined>(() => {
    const value = local.dir;

    return value === "ltr" || value === "rtl" ? value : undefined;
  });

  // R-042: upstream scopes alignment with `.tabs--align-* > :is(…)`; here the
  // variant table is resolved per instance and handed to every part through
  // the context, so a Tabs nested in a panel keeps its own slots.
  const slots = computed<TabsSlots>(() =>
    tabsVariants({
      align: align(),
      variant: variant(),
      orientation: orientation(),
    }),
  );

  /* -------------------------------------------------------------------------------------------
   * Registry: tabs register themselves in creation order, which is the written
   * order for static children (research 4.2).
   * ----------------------------------------------------------------------------------------- */
  const registry = signal<readonly TabsTabDescriptor[]>([]);

  const registerTab = (descriptor: TabsTabDescriptor) => {
    registry.update((current) =>
      current.some((entry) => entry.key === descriptor.key)
        ? current.map((entry) => (entry.key === descriptor.key ? descriptor : entry))
        : [...current, descriptor],
    );

    return () => {
      registry.update((current) =>
        current.filter((entry) => entry.key !== descriptor.key),
      );
    };
  };

  // A `Tabs.Tab` written without `id` still needs a stable key. The NUL prefix
  // keeps it from ever colliding with a key a caller made up.
  let generatedKeyCount = 0;

  const createTabKey = () => `\u0000nsh-tab:${generatedKeyCount++}`;

  const disabledKeySet = computed<ReadonlySet<string>>(() => {
    const keys = local.disabledKeys;
    const set = new Set<string>();

    if (keys != null) {
      for (const key of keys) {
        set.add(encodeTabKey(key));
      }
    }

    return set;
  });

  // The collection's items: each tab's own flag folded with the root's two
  // flags. Reading the descriptor accessors here is what makes a `disabledKeys`
  // change rebuild the collection, so the keyboard delegate skips the new key.
  const dataSource = computed(() =>
    registry().map((entry) => ({
      key: entry.key,
      disabled: entry.isDisabled() || isDisabled() || disabledKeySet().has(entry.key),
    })),
  );

  /**
   * Picking the first usable tab when no key is selected is initialization, not
   * a selection: RAC's `useTabListState` defaults silently, so `onSelectionChange`
   * stays quiet (port sheet 4b T-005, T-016). The all-disabled rescue below is a
   * real state write and reports once, as Kobalte's `tabs-root.tsx:141-147` does
   * (T-021). Only the effect sets this flag, and only around that first write.
   */
  let resolvingDefault = false;

  const listState = createSingleSelectListState({
    selectedKey: () => {
      const key = local.selectedKey;

      return key == null ? undefined : encodeTabKey(key);
    },
    defaultSelectedKey: () => {
      const key = local.defaultSelectedKey;

      return key == null ? undefined : encodeTabKey(key);
    },
    onSelectionChange: (key) => {
      if (resolvingDefault) {
        return;
      }

      local.onSelectionChange?.(decodeTabKey(key));
    },
    dataSource,
    getKey: () => "key",
    getDisabled: () => "disabled",
  });

  const collection = listState.collection;
  const selectionManager = listState.selectionManager;

  /* -------------------------------------------------------------------------------------------
   * Default selection and focus (Kobalte `tabs-root.tsx:110-167`).
   *
   * The fallback goes through `setSelectedKey`, so it reports one
   * `onSelectionChange` like upstream. Everything runs in an effect: NSH must
   * not write state during a render (research 4.6).
   * ----------------------------------------------------------------------------------------- */
  let lastSelected = untracked(() => listState.selectedKey());

  /**
   * The key selected before the current one, for the indicator's starting
   * place (R-056). Written in the same effect as the selection, which runs
   * before the parts' effects, so a freshly mounted indicator reads it before
   * it can be overwritten by the next selection.
   */
  const transitionSource = signal<string | undefined>(undefined);

  effect(() => {
    const list = collection();
    const manager = selectionManager();
    let current = listState.selectedKey();

    let currentItem = current != null ? list.getItem(current) : undefined;

    if (current == null || currentItem == null || currentItem.disabled) {
      const firstKey = list.getFirstKey();
      let fallback = firstKey;
      let fallbackItem = fallback != null ? list.getItem(fallback) : undefined;

      // Step over disabled tabs, as Kobalte does; when every tab is disabled
      // it selects the first one rather than the last.
      while (fallbackItem?.disabled && fallback !== list.getLastKey()) {
        fallback = list.getKeyAfter(fallback ?? "");
        fallbackItem = fallback != null ? list.getItem(fallback) : undefined;
      }

      // Every tab disabled: fall back to the first one anyway (Kobalte
      // `tabs-root.tsx:141-147`). This branch keeps its `onSelectionChange`.
      const everyTabDisabled = fallbackItem?.disabled === true;

      if (everyTabDisabled) {
        fallback = firstKey;
      }

      if (fallback != null && fallback !== current) {
        const isDefault = current == null && !everyTabDisabled;

        if (isDefault) {
          resolvingDefault = true;
        }

        try {
          listState.setSelectedKey(fallback);
        } finally {
          resolvingDefault = false;
        }
      }

      current = fallback;
    }

    if (current !== lastSelected) {
      transitionSource.set(lastSelected);
      lastSelected = current;
    }

    // RAC's roving focus: the selected tab holds the focused key whenever the
    // list is not being navigated by the keyboard.
    if (
      manager.focusedKey() == null ||
      (!manager.isFocused() && current !== undefined && current !== manager.focusedKey())
    ) {
      manager.setFocusedKey(current);
    }
  });

  /* -------------------------------------------------------------------------------------------
   * R-035: the separator of a tab is hidden when the tab before it is
   * selected. Upstream is the sibling selector `[data-selected] & +
   * .tabs__tab .tabs__separator`; here the registry order says which tab is
   * before which.
   * ----------------------------------------------------------------------------------------- */
  const isPreviousTabSelected = (key: string) => {
    const keys = registry().map((entry) => entry.key);
    const index = keys.indexOf(key);

    if (index <= 0) {
      return false;
    }

    return listState.selectedKey() === keys[index - 1];
  };

  /* -------------------------------------------------------------------------------------------
   * Frames: every tab reports its own box, which is the only geometry the
   * indicator can use (the DOM reads `offsetLeft` / `offsetWidth` upstream).
   * ----------------------------------------------------------------------------------------- */
  const frames = signal<ReadonlyMap<string, Bounds>>(new Map());

  const registerBounds = (key: string, bounds: Bounds) => {
    frames.update((current) => {
      const previous = current.get(key);

      if (
        previous != null &&
        previous.origin.x === bounds.origin.x &&
        previous.origin.y === bounds.origin.y &&
        previous.size.width === bounds.size.width &&
        previous.size.height === bounds.size.height
      ) {
        return current;
      }

      const next = new Map(current);
      next.set(key, bounds);

      return next;
    });
  };

  const unregisterBounds = (key: string) => {
    frames.update((current) => {
      if (!current.has(key)) {
        return current;
      }

      const next = new Map(current);
      next.delete(key);

      return next;
    });
  };

  const bounds = (key: string) => frames().get(key);

  /* -------------------------------------------------------------------------------------------
   * R-055: HeroUI waits one frame before letting the indicator animate, so a
   * first render (or a replayed layout effect) cannot keep an initial offset.
   * ----------------------------------------------------------------------------------------- */
  const isIndicatorReady = signal(false);
  const readyFrame = requestAnimationFrame(() => isIndicatorReady.set(true));

  cleanup(() => cancelAnimationFrame(readyFrame));

  /* -------------------------------------------------------------------------------------------
   * Scrolling: the list reports its own frame; the list container owns the
   * scroller and registers the "bring this tab into view" function.
   * ----------------------------------------------------------------------------------------- */
  const contentSize = signal<Size>({ width: 0, height: 0 });
  const viewportSize = signal<Size>({ width: 0, height: 0 });
  const scrollToKeyRegistration = signal<((key: string) => void) | undefined>(undefined);

  const registerScrollToKey = (scrollToKey: ((key: string) => void) | undefined) => {
    scrollToKeyRegistration.set(scrollToKey);
  };

  const scrollToKey = (key: string) => {
    scrollToKeyRegistration()?.(key);
  };

  /* -------------------------------------------------------------------------------------------
   * Context and output
   * ----------------------------------------------------------------------------------------- */
  const contextValue: TabsContextValue = {
    slots,
    orientation,
    variant,
    align,
    dir,
    isDisabled,
    keyboardActivation,
    selectedKey: listState.selectedKey,
    setSelectedKey: listState.setSelectedKey,
    isPreviousTabSelected,
    collection,
    selectionManager,
    registerTab,
    createTabKey,
    bounds,
    registerBounds,
    unregisterBounds,
    transitionSource,
    isIndicatorReady,
    contentSize,
    setContentSize: (size) => contentSize.set(size),
    viewportSize,
    setViewportSize: (size) => viewportSize.set(size),
    registerScrollToKey,
    scrollToKey,
  };

  const classes = computed(() => [slots().base(), local.className].filter(Boolean).join(" "));

  // `dir` is the one global attribute with a visible effect: it becomes the
  // root's `direction`, which the parts' `start` / `end` classes follow.
  const style = computed<StyleProp<ViewStyle>>(() => {
    const direction = dir();

    return [direction != null ? { direction } : undefined, local.style];
  });

  const renderProps: TabsRootRenderProps = {
    orientation,
    defaultChildren: undefined,
  };

  const content = () => {
    // The single read of `props.children`, inside the provider at the
    // placement (`_common` §41): a one-argument function is the render prop and
    // runs once; anything else is content.
    const children = local.children;

    if (typeof children === "function" && children.length >= 1) {
      return renderChildren(
        untracked(() => (children as (values: TabsRootRenderProps) => JSX.Element)(renderProps)),
      );
    }

    return renderChildren(children as JSX.Element);
  };

  return (
    <TabsContext.Provider value={contextValue}>
      <View
        ref={(node) => local.ref?.(node)}
        nativeID={local.id ?? local.nativeID}
        testID={local.testID}
        accessibilityLabel={local["aria-label"] ?? local.accessibilityLabel}
        accessibilityElementsHidden={local.accessibilityElementsHidden}
        class={classes()}
        style={style()}
      >
        {content()}
      </View>
    </TabsContext.Provider>
  );
}
