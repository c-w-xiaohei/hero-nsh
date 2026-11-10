import * as nshRuntime from "nsh";
import { computed, cleanup, effect, keymap, signal, split, untracked, View, windowSize } from "nsh";
import { createKeymapScope as createKeymapScopePrimitive } from "../../primitives";
import { Spinner } from "../spinner";
import { renderChildren, type ToastRenderValues } from "./children";
import { resolveClassName, resolveStyle } from "./class-names";
import type { AriaProps, DataProps, GlobalDomProps } from "./toast-dom-props";
import { viewProps } from "./toast-dom-props";
import { ToastContent } from "./toast-content";
import { ToastActionButton } from "./toast-action-button";
import { ToastCloseButton } from "./toast-close-button";
import { ToastContext, type ToastContextValue, type ToastPlacement, type ToastSlots } from "./toast-context";
import { ToastDescription } from "./toast-description";
import { ToastIndicator } from "./toast-indicator";
import { ToastRoot } from "./toast-root";
import { ToastTitle } from "./toast-title";
import { toastVariants } from "./toast.styles";
import {
  DEFAULT_GAP,
  DEFAULT_HOTKEY,
  DEFAULT_MAX_VISIBLE_TOAST,
  DEFAULT_SCALE_FACTOR,
  DEFAULT_TOAST_WIDTH,
  toastQueue as defaultToastQueue,
  type ToastContentValue,
  type ToastEntry,
  type ToastQueue,
} from "./toast-queue";
import type { Accessor, Bounds, JSX, StyleProp, ViewProps, ViewRef, ViewStyle } from "nsh";

/* -------------------------------------------------------------------------------------------------
 * Toast Provider (region)
 * -----------------------------------------------------------------------------------------------*/

/**
 * What the children function receives per toast: the row's entry and its
 * loading state. Both are the row's current values, as upstream's React render
 * props are plain objects; the row itself is kept by `Each`, so a custom layout
 * that reads `item.content.title` keeps the value it was built with (the
 * default layout reads the entry through bindings and does follow updates).
 */
export interface ToastRegionRenderValues<T extends object = ToastContentValue> {
  /** The entry of this row. */
  toast: ToastEntry<T>;

  /** Whether the entry draws a spinner instead of its indicator. */
  isLoading: boolean;
}

/**
 * The props of `Toast.Provider` (= `ToastProvider`): HeroUI 3.2.7's
 * `ToastProviderProps<T>`, which is React Aria Components' region props minus
 * `queue` / `children`, plus the HeroUI additions.
 */
export interface ToastProviderProps<T extends object = ToastContentValue>
  extends Omit<ViewProps, "children" | "class" | "role" | "style" | "ref" | "onLayout">,
    AriaProps,
    DataProps,
    GlobalDomProps {
  /**
   * The region's content: nothing (the default layout), a static element, or a
   * function called once per toast with that toast's entry. Upstream's render
   * props are plain values; per D17 ours are accessors, so `toast()` is the
   * entry and is re-read as the queue updates it.
   */
  children?: JSX.Element | ((values: ToastRegionRenderValues<T>) => JSX.Element);

  /** Appended after the region slot classes; a function gets the defaults. */
  className?: string | ((values: ToastRenderValues) => string);

  /** NSH style keys; the region's `minWidth` merges first, the caller's last. */
  style?: StyleProp<ViewStyle> | ((values: ToastRenderValues) => StyleProp<ViewStyle>);

  /**
   * The gap between toasts in points.
   * @default 12
   */
  gap?: number;

  /**
   * Keeps the stack expanded instead of expanding on hover or keyboard focus.
   * Forced expansion does not pause timers.
   * @default false
   */
  isExpanded?: boolean;

  /**
   * The maximum number of toasts to display at a time (visual only).
   * @default 3
   */
  maxVisibleToasts?: number;

  /**
   * The hotkey that focuses the region: `KeyboardEvent` boolean names first,
   * then an `event.code`. Modifiers left out have to be up. `[]` disables it.
   * @default ["altKey", "KeyT"]
   */
  hotkey?: string[];

  /**
   * How much each toast behind the front one scales down.
   * @default 0.05
   */
  scaleFactor?: number;

  /**
   * Where the stack sits.
   * @default "bottom"
   */
  placement?: ToastPlacement;

  /** A queue instance; the shared `toastQueue` when omitted. */
  queue?: ToastQueue<T>;

  /**
   * The toast width; a number is points.
   * @default 460
   */
  width?: number | string;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** The region's accessible name; defaults to the notification count. */
  "aria-label"?: string;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;

  /** Measured for the caller; the region itself uses no layout. */
  onLayout?: (event: { bounds: Bounds }) => void;

  /** Forwarded to the region `View` as a callback, never as a ref store. */
  ref?: (node: ViewRef) => void;
}

/** `event.code` values the code path cannot derive from a letter or a digit. */
const NAMED_CODES: Record<string, string> = {
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "up",
  Backquote: "`",
  Backslash: "\\",
  Backspace: "backspace",
  BracketLeft: "[",
  BracketRight: "]",
  Comma: ",",
  Delete: "delete",
  End: "end",
  Enter: "enter",
  Equal: "equal",
  Escape: "escape",
  Home: "home",
  Insert: "insert",
  Minus: "minus",
  PageDown: "pagedown",
  PageUp: "pageup",
  Period: ".",
  Quote: "'",
  Semicolon: ";",
  Slash: "/",
  Space: "space",
  Tab: "tab",
};

const MODIFIER_NAMES: Record<string, string> = {
  altKey: "alt",
  ctrlKey: "ctrl",
  metaKey: "cmd",
  shiftKey: "shift",
};

/**
 * `lifecycle()` reports whether the app is in use. NSH 0.4.0's web runtime
 * leaves the name out of its `nsh` facade, and importing a missing export fails
 * the whole page on that target ("does not provide an export named
 * `lifecycle`"), so it is read off the module namespace: the headless and
 * desktop hosts have it, and the web target simply skips the visibility pause.
 */
const lifecycleAccessor = (
  nshRuntime as { lifecycle?: Accessor<"active" | "inactive" | "background"> }
).lifecycle;

/**
 * The keystroke `keymap` takes for a HeroUI hotkey array, or `undefined` when
 * the array names nothing bindable. `alt+t` for the default `["altKey","KeyT"]`.
 */
function hotkeyKeystroke(hotkey: readonly string[]): string | undefined {
  const parts: string[] = [];

  for (const entry of hotkey) {
    const modifier = MODIFIER_NAMES[entry];

    if (modifier) {
      parts.push(modifier);

      continue;
    }

    if (NAMED_CODES[entry]) {
      parts.push(NAMED_CODES[entry]);

      continue;
    }

    if (/^Key[A-Z]$/.test(entry)) {
      parts.push(entry.slice(3).toLowerCase());

      continue;
    }

    if (/^Digit[0-9]$/.test(entry)) {
      parts.push(entry.slice(5));

      continue;
    }

    if (/^F([1-9]|1[0-9]|2[0-4])$/.test(entry)) {
      parts.push(entry.toLowerCase());

      continue;
    }

    return undefined;
  }

  return parts.length > 0 ? parts.join("+") : undefined;
}

/** A `width` prop as a `minWidth`: points, a percentage, `rem` (16 points) or `px` / `pt`; anything else is dropped. */
function toMinWidth(width: number | string): number | `${number}%` | undefined {
  if (typeof width === "number") {
    return width;
  }

  const value = width.trim();
  const percent = /^([\d.]+)%$/.exec(value);

  if (percent) {
    return `${percent[1]}%` as `${number}%`;
  }

  const points = /^([\d.]+)(?:px|pt)?$/.exec(value);

  if (points) {
    return Number(points[1]);
  }

  const rems = /^([\d.]+)rem$/.exec(value);

  if (rems) {
    return Number(rems[1]) * 16;
  }

  return undefined;
}

/**
 * `Toast.Provider` / `ToastProvider`: the region and the queue's subscriber.
 *
 * Nothing here is a module-level store: the queue is an instance (the default
 * one when `queue` is omitted), the region mirrors its snapshots into signals
 * through `subscribe`, and each toast is rendered from the row's entry. The
 * region also owns the three interactions HeroUI attaches to its DOM node:
 * hover/focus expansion with timer suspension (port sheet §2), the global
 * hotkey, and Escape while the region holds the focus.
 *
 * The region renders only while the queue is non-empty (port sheet §3).
 */
export function ToastProvider<T extends object = ToastContentValue>(
  props: ToastProviderProps<T>,
): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "gap",
    "isExpanded",
    "maxVisibleToasts",
    "hotkey",
    "scaleFactor",
    "placement",
    "queue",
    "width",
    "id",
    "nativeID",
    "aria-label",
    "accessibilityLabel",
    "render",
    "dir",
    "lang",
    "hidden",
    "inert",
    "translate",
    "focusable",
    "testID",
    "tooltip",
    "onLayout",
    "onMouseEnter",
    "onMouseMove",
    "onMouseLeave",
    "onFocus",
    "onBlur",
  ] as const);

  /** The queue this region reads; a change of the prop resubscribes. */
  const queue = computed<ToastQueue<T>>(
    () => local.queue ?? (defaultToastQueue as unknown as ToastQueue<T>),
  );

  /* -------------------------------------------------------------------------------------------
   * The queue mirror
   * ----------------------------------------------------------------------------------------- */

  const visibleToasts = signal<readonly ToastEntry<T>[]>(
    queue().visibleToasts.slice() as ToastEntry<T>[],
  );
  const exitingKeys = signal<ReadonlySet<string>>(queue().getExitingKeys());

  /**
   * Which toast holds the keyboard focus. Upstream reads
   * `document.activeElement`; NSH reports focus per view, so the toast roots
   * report it here. The value is deliberately sticky over a blur inside the
   * same toast (focus moving from the root to its close button), because only
   * the element that takes focus reports it.
   */
  const focusedKey = signal<string | null>(null);

  effect(() => {
    const source = queue();
    const sync = () => {
      visibleToasts.set(source.visibleToasts.slice() as ToastEntry<T>[]);
      exitingKeys.set(source.getExitingKeys());
    };

    // The queue may already hold toasts when the region mounts (a toast queued
    // before the provider did), so the first snapshot is pushed here too.
    sync();

    return source.subscribe(sync);
  });

  const hasToasts = computed(() => visibleToasts().length > 0);

  const activeToastCount = computed(() => visibleToasts().length - exitingKeys().size);

  // Upstream resets the pointer/focus state when the region unmounts, so the
  // next batch starts collapsed. The region view goes with the last toast and
  // no `mouseleave` follows, so the provider resets it here; otherwise the next
  // toast would mount expanded with every timer suspended.
  effect(() => {
    if (hasToasts()) {
      return;
    }

    pointerWithin = false;
    regionFocused.set(false);
    isPointerOrFocusWithin.set(false);
    cancelCollapse();
  });

  /* -------------------------------------------------------------------------------------------
   * Geometry
   * ----------------------------------------------------------------------------------------- */

  const gap = computed(() => local.gap ?? DEFAULT_GAP);
  const scaleFactor = computed(() => local.scaleFactor ?? DEFAULT_SCALE_FACTOR);
  const placement = computed<ToastPlacement>(() => local.placement ?? "bottom");
  const maxVisibleToasts = computed(
    () => local.maxVisibleToasts ?? queue().maxVisibleToasts ?? DEFAULT_MAX_VISIBLE_TOAST,
  );

  // R-006 … R-011: the region's corner and the toast's stacking side share one
  // table, so every part reads the same instance from the context.
  const slots = computed<ToastSlots>(() => toastVariants({ placement: placement() }));

  const toastHeights = signal<Record<string, number>>({});

  const registerHeight = (key: string, height: number) => {
    const heights = toastHeights();

    if (heights[key] === height) {
      return;
    }

    toastHeights.set({ ...heights, [key]: height });
  };

  const removeHeight = (key: string) => {
    const heights = toastHeights();

    if (!(key in heights)) {
      return;
    }

    const next = { ...heights };

    delete next[key];
    toastHeights.set(next);
  };

  /* -------------------------------------------------------------------------------------------
   * Expansion: pointer and focus within, with the deferred collapse of R-022
   * ----------------------------------------------------------------------------------------- */

  const isPointerOrFocusWithin = signal(false);
  const regionFocused = signal(false);
  let pointerWithin = false;
  let collapseFrame: number | undefined;

  const cancelCollapse = () => {
    if (collapseFrame === undefined) {
      return;
    }

    cancelAnimationFrame(collapseFrame);
    collapseFrame = undefined;
  };

  cleanup(cancelCollapse);

  const pointerEnter = () => {
    cancelCollapse();
    pointerWithin = true;
    isPointerOrFocusWithin.set(true);
  };

  /**
   * R-022: upstream bridges the gap between two toasts with an `::after` hit
   * area, so crossing it never leaves the region. NSH has no pseudo-elements;
   * the collapse is deferred one frame and a sibling's enter cancels it, so
   * crossing a gap does not collapse the stack under a moving pointer.
   */
  const pointerLeave = () => {
    pointerWithin = false;

    if (regionFocused()) {
      return;
    }

    cancelCollapse();
    collapseFrame = requestAnimationFrame(() => {
      collapseFrame = undefined;

      if (!pointerWithin && !regionFocused()) {
        isPointerOrFocusWithin.set(false);
      }
    });
  };

  const handleRegionFocus = () => {
    cancelCollapse();
    regionFocused.set(true);
    isPointerOrFocusWithin.set(true);
    // The region took the focus from a toast; upstream's `activeElement` check
    // would then find no toast to hand on from.
    focusedKey.set(null);
  };

  const handleRegionBlur = () => {
    regionFocused.set(false);

    if (!pointerWithin) {
      isPointerOrFocusWithin.set(false);
    }
  };

  /** A single remaining toast never expands; exiting toasts do not count. */
  const isExpanded = computed(
    () => (local.isExpanded === true || isPointerOrFocusWithin()) && activeToastCount() > 1,
  );

  /* -------------------------------------------------------------------------------------------
   * Timers: interaction pause and page visibility
   * ----------------------------------------------------------------------------------------- */

  effect(() => {
    const source = queue();

    if (!isPointerOrFocusWithin()) {
      return;
    }

    source.suspendTimers("interaction");

    return () => source.resumeTimers("interaction");
  });

  effect(() => {
    if (!lifecycleAccessor) {
      return;
    }

    const source = queue();
    const state = lifecycleAccessor();

    if (state === "background") {
      source.suspendTimers("visibility");

      return;
    }

    source.resumeTimers("visibility");
  });

  cleanup(() => queue().resumeTimers("visibility"));

  /* -------------------------------------------------------------------------------------------
   * Hotkey and Escape
   * ----------------------------------------------------------------------------------------- */

  let regionNode: ViewRef | undefined;

  const hotkey = computed(() => local.hotkey ?? DEFAULT_HOTKEY);

  effect(() => {
    if (!hasToasts()) {
      return;
    }

    const keystroke = hotkeyKeystroke(hotkey());

    if (!keystroke) {
      return;
    }

    return keymap.bind(keystroke, () => regionNode?.focus(), { when: "notEditing" });
  });

  // Escape folds the stack and releases the focus, only while the region has
  // it: upstream binds the listener on the region node, and NSH's `Overlay`
  // would take Escape from every other layer (port sheet §3, B3).
  createKeymapScopePrimitive({
    bindings: {
      escape: () => {
        regionNode?.blur();
        pointerWithin = false;
        regionFocused.set(false);
        isPointerOrFocusWithin.set(false);
      },
    },
    isActive: () => regionFocused(),
  });

  /* -------------------------------------------------------------------------------------------
   * Focus handoff
   * ----------------------------------------------------------------------------------------- */

  const focusables = new Map<string, () => ViewRef | undefined>();

  const registerFocusable = (key: string, node: () => ViewRef | undefined): (() => void) => {
    focusables.set(key, node);

    return () => {
      focusables.delete(key);
    };
  };

  /**
   * Upstream reads `document.activeElement` and moves the focus to the nearest
   * remaining toast: newer first (earlier in the newest-first list), then
   * older. NSH has neither `activeElement` nor sibling queries, so the region
   * keeps the registered refs and the focus key the toast roots report.
   */
  const moveFocusFrom = (key: string) => {
    const layout = visibleToasts().filter((candidate) => !exitingKeys().has(candidate.key));
    const position = layout.findIndex((candidate) => candidate.key === key);
    const candidates: string[] = [];

    if (position > 0) {
      candidates.push(layout[position - 1]!.key);
    }

    if (position >= 0 && position + 1 < layout.length) {
      candidates.push(layout[position + 1]!.key);
    }

    for (const candidate of candidates) {
      const index = layout.findIndex((item) => item.key === candidate);

      if (index < 0 || index >= maxVisibleToasts()) {
        continue;
      }

      const node = focusables.get(candidate)?.();

      if (node) {
        node.focus();
        focusedKey.set(candidate);

        return;
      }
    }

    focusables.get(key)?.()?.blur();
    focusedKey.set(null);
  };

  /* -------------------------------------------------------------------------------------------
   * Region size, label and render values
   * ----------------------------------------------------------------------------------------- */

  // R-002: below `sm` the region is `calc(100vw - 2rem)`. NSH has no `calc()`
  // length, so the number comes from `windowSize()` (the root view's width,
  // which is what the fixed box is laid out in) and is written inline.
  // R-003: `sm:min-w-(--toast-width)` has no breakpoint equivalent inline, so
  // the width only reaches `minWidth` at 640 points and wider.
  const regionWidth = computed(() => {
    const viewport = windowSize().width;

    return viewport < 640 ? Math.max(0, viewport - 32) : undefined;
  });

  const regionMinWidth = computed(() => {
    if (windowSize().width < 640) {
      return undefined;
    }

    return toMinWidth(local.width ?? DEFAULT_TOAST_WIDTH);
  });

  /**
   * The region has no height of its own: its children are absolutely positioned
   * (`R-013`), so upstream's DOM box collapses to zero. NSH selectors (and
   * assistive technology) skip a view without an area, which made the region
   * itself, and every element matched through it, invisible to `nsh/test`
   * (T-002, T-030, T-055, T-061). The box therefore takes the stack's height:
   * it grows away from the anchored edge (up from `bottom-4`, down from
   * `top-4`), which leaves every toast exactly where it was.
   */
  const regionHeight = computed(() => {
    const heights = toastHeights();
    const list = visibleToasts().filter((entry) => !exitingKeys().has(entry.key));

    if (list.length === 0) {
      return undefined;
    }

    const frontHeight = heights[list[0]!.key] ?? 0;

    if (!isExpanded()) {
      const height = frontHeight + (list.length - 1) * gap();

      return height > 0 ? height : undefined;
    }

    let total = 0;

    for (const entry of list) {
      total += heights[entry.key] ?? frontHeight;
    }

    total += (list.length - 1) * gap();

    return total > 0 ? total : undefined;
  });

  const regionStyle = (): ViewStyle => {
    const style: ViewStyle = {};
    const width = regionWidth();
    const minWidth = regionMinWidth();
    const height = regionHeight();

    if (width !== undefined) {
      style.width = width;
    }

    if (minWidth !== undefined) {
      style.minWidth = minWidth;
    }

    if (height !== undefined) {
      style.height = height;
    }

    return style;
  };

  const notificationCount = computed(() => visibleToasts().length);

  const regionLabel = computed(() => {
    const count = notificationCount();

    return (
      local["aria-label"] ??
      local.accessibilityLabel ??
      `${count} notification${count === 1 ? "" : "s"}.`
    );
  });

  const regionRenderValues = (): ToastRenderValues => ({
    defaultClassName: slots().region(),
    toast: undefined,
  });

  const regionClasses = computed(() =>
    resolveClassName(local.className as ToastProviderProps<T>["className"], regionRenderValues()),
  );

  /* -------------------------------------------------------------------------------------------
   * Children
   * ----------------------------------------------------------------------------------------- */

  const contentOf = (entry: ToastEntry<T>): ToastContentValue =>
    entry.content as ToastContentValue;

  // Upstream's `{!!title && …}`: a `0` or `""` title draws nothing.
  const truthy = (node: unknown): boolean => Boolean(node);

  /** The default layout of one toast, upstream's `getDefaultChildren`. */
  const defaultChildren = (item: Accessor<ToastEntry<T>>): JSX.Element => {
    const content = () => contentOf(item());
    const variant = computed(() => content().variant);
    const isLoading = computed(() => content().isLoading === true);

    return (
      <ToastRoot
        placement={placement()}
        scaleFactor={scaleFactor()}
        toast={item()}
        variant={variant()}
      >
        {content().indicator !== null ? (
          <ToastIndicator variant={variant()}>
            {isLoading() ? <Spinner size="sm" color="current" /> : renderChildren(content().indicator)}
          </ToastIndicator>
        ) : null}
        <ToastContent>
          {truthy(content().title) ? <ToastTitle>{content().title}</ToastTitle> : null}
          {truthy(content().description) ? (
            <ToastDescription>{content().description}</ToastDescription>
          ) : null}
        </ToastContent>
        {truthy(content().actionProps?.children) ? (
          <ToastActionButton {...content().actionProps} />
        ) : null}
        <ToastCloseButton />
      </ToastRoot>
    );
  };

  /**
   * One row. The function child is the only thing that sees the entry; a
   * static element is rendered per row from the placement's own read, so each
   * row builds its own views.
   */
  const renderRow = (item: Accessor<ToastEntry<T>>): JSX.Element => {
    const children = local.children;

    if (typeof children === "function" && children.length >= 1) {
      const entry = item();
      const values: ToastRegionRenderValues<T> = {
        isLoading: contentOf(entry).isLoading === true,
        toast: entry,
      };

      return renderChildren(
        untracked(() => (children as (values: ToastRegionRenderValues<T>) => JSX.Element)(values)),
      );
    }

    if (children === undefined) {
      return defaultChildren(item);
    }

    return renderChildren(children as JSX.Element);
  };

  const contextValue: ToastContextValue = {
    close: (key: string) => queue().close(key),
    exitingKeys,
    focusedKey,
    gap,
    heightsByKey: toastHeights,
    isExpanded,
    maxVisibleToasts,
    moveFocusFrom,
    placement,
    pointerEnter,
    pointerLeave,
    registerFocusable,
    registerHeight,
    removeHeight,
    scaleFactor,
    setFocusedKey: (key: string | null) => focusedKey.set(key),
    slots,
    visibleToasts: visibleToasts as unknown as Accessor<readonly ToastEntry[]>,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      <If when={hasToasts()}>
        <View
          {...viewProps(rest)}
          ref={(next) => {
            regionNode = next;
            local.ref?.(next);
          }}
          testID={local.testID}
          nativeID={local.id ?? local.nativeID}
          tooltip={local.tooltip}
          role="region"
          accessibilityLabel={regionLabel()}
          // Upstream the region is `tabIndex=-1`: programmatically focusable
          // only. NSH has no such distinction, so the region is also a Tab
          // stop (port sheet §8).
          focusable={local.focusable ?? true}
          class={regionClasses()}
          style={[regionStyle(), resolveStyle(local.style as ToastProviderProps<T>["style"], regionRenderValues())]}
          onMouseEnter={(event) => {
            pointerEnter();
            local.onMouseEnter?.(event);
          }}
          onMouseMove={(event) => {
            pointerEnter();
            local.onMouseMove?.(event);
          }}
          onMouseLeave={(event) => {
            pointerLeave();
            local.onMouseLeave?.(event);
          }}
          onFocus={() => {
            handleRegionFocus();
            local.onFocus?.();
          }}
          onBlur={() => {
            handleRegionBlur();
            local.onBlur?.();
          }}
          onLayout={local.onLayout}
        >
          <Each of={visibleToasts()} key={(entry) => entry.key}>
            {(item) => renderRow(item)}
          </Each>
        </View>
      </If>
    </ToastContext.Provider>
  );
}
