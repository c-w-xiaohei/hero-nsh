/*
 * Toast's data layer: the queue instance, its timers, its exit window and the
 * `toast()` helper.
 *
 * HeroUI 3.2.7 stacks three things here (port sheet §2 and §5):
 *
 * - react-stately's `ToastQueue` owns what is queued, the per-toast timeout and
 *   the pause/resume bookkeeping;
 * - React Aria's `ToastRegion` subscribes to that queue through
 *   `useSyncExternalStore`;
 * - HeroUI's `ExitAwareToastQueue` wraps it so a closing toast stays mounted
 *   for `exitDuration` while its exit transition plays, `onClose` fires when
 *   the close *starts*, and `clear()` notifies once for the whole batch.
 *
 * NSH has no react-stately, so this file rewrites the queue as a plain class:
 * an array of entries, a map of running timers, a set of suspensions, an exit
 * map and a listener set. It is deliberately not a module-level store: the
 * default instance `toastQueue` exists because upstream exports one, and a
 * `<Toast.Provider queue={...}>` may carry its own. Every region subscribes;
 * every single toast is a pure function of the entries it reads.
 *
 * Kobalte's `toast-store.ts` (port sheet §5) keeps one global numeric-id store
 * and filters it per region; that shape loses the `queue` prop, multi-region
 * support and in-place updates, so only its timer arithmetic is reused: pause
 * subtracts the elapsed part, resume schedules the remainder, reset pauses
 * before it re-schedules (Kobalte `startTimer` / `pauseTimer` / `resumeTimer`,
 * `toast-root.tsx:203-227`).
 */

import { reduceMotion, type JSX } from "nsh";

import type { ButtonRootProps } from "../button";

/* -------------------------------------------------------------------------------------------------
 * Constants
 * -----------------------------------------------------------------------------------------------*/

/** Gap between toasts in pixels. */
export const DEFAULT_GAP = 12;

/** Visual cap on rendered toasts; older ones fade out but keep their timers running. */
export const DEFAULT_MAX_VISIBLE_TOAST = 3;

/** How much each toast behind the front one scales down. */
export const DEFAULT_SCALE_FACTOR = 0.05;

/** Toast width in pixels. */
export const DEFAULT_TOAST_WIDTH = 460;

/** Auto-dismiss timeout in milliseconds. */
export const DEFAULT_TOAST_TIMEOUT = 4000;

/**
 * How long a closing toast stays mounted for its exit transition, in
 * milliseconds. At least the longest exit transition in HeroUI's stylesheet
 * (the frontmost toast's 250ms).
 */
export const DEFAULT_EXIT_DURATION = 300;

/** Modifiers match `KeyboardEvent` boolean props; other entries match `event.code`. */
export const DEFAULT_HOTKEY: string[] = ["altKey", "KeyT"];

/** The variant dimension, upstream's inline literal union. */
export type ToastVariant = "default" | "accent" | "success" | "warning" | "danger";

/**
 * The default shape of a queued toast's content (`ToastContentValue`).
 * `maxVisibleToasts` is a queue option upstream, not a content field.
 */
export interface ToastContentValue {
  /** `null` hides the indicator; a node replaces the default icon. */
  indicator?: JSX.Element;

  /** The title line; a string is wrapped in `Text` by `Toast.Title`. */
  title?: JSX.Element;

  /** The description line below the title. */
  description?: JSX.Element;

  /** The variant, carried to `Toast` and `Toast.Indicator`. */
  variant?: ToastVariant;

  /** Props forwarded to the default `Toast.ActionButton`. */
  actionProps?: ToastActionProps;

  /** Shows a `Spinner` in place of the indicator. */
  isLoading?: boolean;
}

/** What `actionProps` takes: HeroUI's `Button` props, as the ported Button's type. */
export type ToastActionProps = ButtonRootProps;

/** The options `toast()` and `queue.add()` take. */
export interface HeroUIToastOptions {
  description?: JSX.Element;
  /** `null` hides the indicator. */
  indicator?: JSX.Element;
  variant?: ToastVariant;
  actionProps?: ToastActionProps;
  isLoading?: boolean;
  /**
   * Auto-dismiss timeout in milliseconds; 0 keeps the toast open.
   * @default 4000
   */
  timeout?: number;
  /** Called when the toast is dismissed; the exit transition may still be playing. */
  onClose?: () => void;
}

/** `toast.promise`'s three states. */
export interface ToastPromiseOptions<T = unknown> {
  loading: JSX.Element;
  success: ((data: T) => JSX.Element) | JSX.Element;
  error: ((error: Error) => JSX.Element) | JSX.Element;
}

/** `ToastQueue`'s constructor options. */
export interface ToastQueueOptions {
  /**
   * How long a closing toast stays mounted for its exit transition, in
   * milliseconds. Set to 0 to remove toasts immediately.
   * @default 300
   */
  exitDuration?: number;

  /**
   * The maximum number of toasts to display at a time (visual only).
   * @default 3
   */
  maxVisibleToasts?: number;

  /**
   * Wraps the queue's own notifications, as upstream wraps state updates.
   * Accepted for API parity; NSH has no `document.startViewTransition`, so a
   * caller's wrapper runs around the notification and nothing else (port
   * sheet §8).
   */
  wrapUpdate?: (fn: () => void) => void;
}

/**
 * One entry of the queue, and the public shape of `Toast`'s `toast` prop.
 * Upstream this is react-stately's `QueuedToast<T>`; the members are the ones
 * the public API exposes (port sheet §1), without the stately internals
 * (`timer`, `animation`, `updateVisibleToasts`).
 */
export interface ToastEntry<T extends object = ToastContentValue> {
  key: string;
  content: T;
  timeout?: number;
  onClose?: () => void;
}

/** One toast's timer: a delay that can pause, resume, restart and stop. */
class ToastTimer {
  private remaining: number;
  private handle: number | undefined;
  private startedAt: number | undefined;
  private stopped = false;

  constructor(
    private readonly callback: () => void,
    delay: number,
  ) {
    this.remaining = delay;
  }

  /** Milliseconds since the JS context started, so wall-clock jumps cannot fire a toast early. */
  private static now(): number {
    return typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now()
      : Date.now();
  }

  get isRunning(): boolean {
    return this.handle !== undefined;
  }

  pause(): void {
    if (this.handle === undefined) {
      return;
    }

    clearTimeout(this.handle);
    this.handle = undefined;
    this.remaining -= ToastTimer.now() - (this.startedAt ?? ToastTimer.now());
    this.startedAt = undefined;

    if (this.remaining < 0) {
      this.remaining = 0;
    }
  }

  resume(): void {
    // A resume while the timeout already runs would orphan a second one
    // (upstream `guardTimer` compensates for exactly this, toast-queue.ts).
    if (this.stopped || this.handle !== undefined || this.remaining <= 0) {
      return;
    }

    this.startedAt = ToastTimer.now();
    this.handle = setTimeout(() => {
      this.handle = undefined;
      this.remaining = 0;
      this.callback();
    }, this.remaining);
  }

  /** Restarts the countdown on `delay` in every state: pause first, or a running timeout would survive. */
  reset(delay: number): void {
    this.pause();
    this.remaining = delay;
    this.startedAt = undefined;
    this.resume();
  }

  /** Ends the timer for good; a paused queue must not bring it back. */
  stop(): void {
    this.stopped = true;
    this.handle = undefined;
    this.remaining = 0;
  }
}

/* -------------------------------------------------------------------------------------------------
 * Queue
 * -----------------------------------------------------------------------------------------------*/

/**
 * Toast's queue: creates, updates, pauses and dismisses toast entries and
 * notifies its subscribers. One instance per queue (the default one included);
 * a region subscribes and mirrors the snapshot into signals.
 *
 * The entry array is newest first, as react-stately's `visibleToasts`.
 */
export class ToastQueue<T extends object = ToastContentValue> {
  readonly maxVisibleToasts?: number;

  private readonly exitDuration: number;
  private readonly wrapUpdate?: (fn: () => void) => void;
  private readonly entries: ToastEntry<T>[] = [];
  private readonly timers = new Map<string, ToastTimer>();
  private readonly exitTimers = new Map<string, number>();
  private readonly suspensions = new Set<string>();
  private readonly listeners = new Set<() => void>();
  private exitingSnapshot: ReadonlySet<string> = new Set();
  private counter = 0;
  private batching = false;

  constructor(options?: ToastQueueOptions) {
    this.maxVisibleToasts = options?.maxVisibleToasts;
    this.exitDuration = options?.exitDuration ?? DEFAULT_EXIT_DURATION;
    this.wrapUpdate = options?.wrapUpdate;
  }

  /** The currently rendered toasts, newest first. */
  get visibleToasts(): readonly ToastEntry<T>[] {
    return this.entries;
  }

  /** A stable snapshot of the keys currently playing their exit transition. */
  getExitingKeys(): ReadonlySet<string> {
    return this.exitingSnapshot;
  }

  /** Subscribes to entry and exit changes; returns the unsubscribe. */
  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);

    return () => {
      this.listeners.delete(fn);
    };
  }

  /**
   * Adds a toast and returns its key. `timeout: 0` keeps it open; an omitted
   * timeout takes the default 4000ms, as upstream's wrapper does.
   */
  add(content: T, options?: { timeout?: number; onClose?: () => void }): string {
    const key = `toast-${++this.counter}`;
    const timeout = options?.timeout ?? DEFAULT_TOAST_TIMEOUT;
    const entry: ToastEntry<T> = { content, key, onClose: options?.onClose, timeout };

    this.entries.unshift(entry);
    this.startTimer(key, timeout);
    this.notify();

    return key;
  }

  /**
   * Replaces a toast's content in place: same key, same row, same stack
   * position. `timeout` restarts the countdown (0 keeps it open); omitting it
   * keeps the running countdown, and omitting `onClose` keeps the handler.
   * Returns false for an unknown key or a toast already animating out.
   */
  update(
    key: string,
    content: T,
    options?: { onClose?: () => void; timeout?: number },
  ): boolean {
    if (this.exitTimers.has(key)) {
      return false;
    }

    const entry = this.entries.find((candidate) => candidate.key === key);

    if (!entry) {
      return false;
    }

    entry.content = content;

    if (options && "onClose" in options) {
      entry.onClose = options.onClose;
    }

    if (options?.timeout !== undefined) {
      // The old timer must not survive the restart: the countdown begins again
      // on the new delay, as upstream's fresh timer identity does.
      this.timers.get(key)?.stop();
      this.timers.delete(key);
      entry.timeout = options.timeout;
      this.startTimer(key, options.timeout);
    }

    this.notify();

    return true;
  }

  /**
   * Dismisses a toast. `onClose` fires now, at the dismissal, as upstream's
   * `ExitAwareToastQueue.close` does; the entry is removed after
   * `exitDuration` so its exit transition can play. With exit duration 0 or a
   * reduced-motion preference the removal is immediate.
   */
  close(key: string): void {
    const entry = this.entries.find((candidate) => candidate.key === key);

    // Already exiting or already removed.
    if (this.exitTimers.has(key) || !entry) {
      return;
    }

    this.timers.get(key)?.stop();
    this.timers.delete(key);

    const onClose = entry.onClose;

    // The callback belongs to this dismissal only; a later removal must not
    // fire it a second time.
    entry.onClose = undefined;

    const canAnimate = this.exitDuration > 0 && !reduceMotion();

    if (!canAnimate) {
      this.remove(key);
      this.flushExiting();

      return;
    }

    this.exitTimers.set(
      key,
      setTimeout(() => {
        // Rebuild the snapshot before the removal notifies, so no subscriber
        // sees a toast as both exiting and gone.
        this.exitTimers.delete(key);
        this.remove(key);
        this.flushExiting();
      }, this.exitDuration),
    );

    this.flushExiting();
    onClose?.();
  }

  /** Closes every toast; each animates out and fires its own `onClose`. */
  clear(): void {
    // Batched so the whole drain produces one snapshot and one notification,
    // as upstream's `isBatchingExits` does.
    this.batching = true;

    try {
      for (const entry of [...this.entries]) {
        this.close(entry.key);
      }
    } finally {
      this.batching = false;
      this.exitingSnapshot = new Set(this.exitTimers.keys());
      this.notify();
      this.notifyExiting();
    }
  }

  /** Pauses every timer; sources form a set, so one call per source is enough. */
  suspendTimers(source: string): void {
    const wasEmpty = this.suspensions.size === 0;

    this.suspensions.add(source);

    if (!wasEmpty) {
      return;
    }

    for (const timer of this.timers.values()) {
      timer.pause();
    }
  }

  /** Removes a suspension; the last one out resumes every timer. */
  resumeTimers(source: string): void {
    const wasSuspended = this.suspensions.size > 0;

    this.suspensions.delete(source);

    if (!wasSuspended || this.suspensions.size > 0) {
      return;
    }

    for (const timer of this.timers.values()) {
      timer.resume();
    }
  }

  /** `pauseAll()` / `resumeAll()` are the userland pair over the same set, as upstream's `external` source. */
  pauseAll(): void {
    this.suspendTimers("external");
  }

  resumeAll(): void {
    this.resumeTimers("external");
  }

  /**
   * The queue itself. Upstream returns the react-stately queue behind the
   * wrapper, which carries `updateVisibleToasts` and the timer objects; our
   * handle has the same entry point so provider code written against the
   * public API keeps working (port sheet §8).
   */
  getQueue(): ToastQueue<T> {
    return this;
  }

  /**
   * Releases pending exit timeouts, subscriptions and running timers, for HMR
   * and test teardown. The queue stays usable, as upstream's `destroy` does.
   */
  destroy(): void {
    for (const timeoutId of this.exitTimers.values()) {
      clearTimeout(timeoutId);
    }

    this.exitTimers.clear();
    this.exitingSnapshot = new Set();
    this.listeners.clear();
    this.suspensions.clear();

    for (const timer of this.timers.values()) {
      timer.stop();
    }

    this.timers.clear();
  }

  private startTimer(key: string, timeout: number): void {
    if (!(timeout > 0)) {
      return;
    }

    const timer = new ToastTimer(() => this.close(key), timeout);

    this.timers.set(key, timer);

    if (this.suspensions.size === 0) {
      timer.resume();
    }
  }

  private remove(key: string): void {
    const index = this.entries.findIndex((candidate) => candidate.key === key);

    if (index >= 0) {
      this.entries.splice(index, 1);
    }

    this.timers.get(key)?.stop();
    this.timers.delete(key);
  }

  private flushExiting(): void {
    this.exitingSnapshot = new Set(this.exitTimers.keys());

    if (this.batching) {
      return;
    }

    this.notify();
    this.notifyExiting();
  }

  private notify(): void {
    if (this.batching) {
      return;
    }

    const run = () => {
      for (const fn of [...this.listeners]) {
        fn();
      }
    };

    if (this.wrapUpdate) {
      this.wrapUpdate(run);
    } else {
      run();
    }
  }

  private notifyExiting(): void {
    // The same subscriber reads both snapshots in the region, so the exit
    // notification is the entry notification; kept separate for parity with
    // upstream's two subscriptions.
  }
}

/* -------------------------------------------------------------------------------------------------
 * Toast helper
 * -----------------------------------------------------------------------------------------------*/

/** The `toast` function and its variant shortcuts. */
export interface ToastFunction {
  (message: JSX.Element, options?: HeroUIToastOptions): string;
  success(message: JSX.Element, options?: Omit<HeroUIToastOptions, "variant">): string;
  danger(message: JSX.Element, options?: Omit<HeroUIToastOptions, "variant">): string;
  /** Maps to the accent variant. */
  info(message: JSX.Element, options?: Omit<HeroUIToastOptions, "variant">): string;
  warning(message: JSX.Element, options?: Omit<HeroUIToastOptions, "variant">): string;
  update(id: string, message: JSX.Element, options?: HeroUIToastOptions): string;
  promise<T>(
    promise: Promise<T> | (() => Promise<T>),
    options: ToastPromiseOptions<T>,
  ): string;
  getQueue(): ToastQueue<ToastContentValue>;
  close(key: string): void;
  pauseAll(): void;
  resumeAll(): void;
  clear(): void;
}

function createToastFunction(queue: ToastQueue<ToastContentValue>): ToastFunction {
  const createContent = (
    message: JSX.Element,
    options?: HeroUIToastOptions,
  ): ToastContentValue => ({
    actionProps: options?.actionProps,
    description: options?.description,
    indicator: options?.indicator,
    isLoading: options?.isLoading,
    title: message,
    variant: options?.variant || "default",
  });

  const createAddOptions = (options?: HeroUIToastOptions) => ({
    onClose: options?.onClose,
    timeout: options?.timeout ?? DEFAULT_TOAST_TIMEOUT,
  });

  // `update` tells an absent key from an explicit `undefined`: it keeps the
  // current countdown and the current handler for anything the caller left
  // out, so only keys that were passed travel.
  const createUpdateOptions = (options?: HeroUIToastOptions) => ({
    ...(options && "onClose" in options ? { onClose: options.onClose } : null),
    ...(options && "timeout" in options ? { timeout: options.timeout } : null),
  });

  const toastFn = ((message: JSX.Element, options?: HeroUIToastOptions): string =>
    queue.add(createContent(message, options), createAddOptions(options))) as ToastFunction;

  toastFn.success = (message, options) => toastFn(message, { ...options, variant: "success" });
  toastFn.danger = (message, options) => toastFn(message, { ...options, variant: "danger" });
  toastFn.info = (message, options) => toastFn(message, { ...options, variant: "accent" });
  toastFn.warning = (message, options) => toastFn(message, { ...options, variant: "warning" });

  // In-place update keeps the key and the stack position; an unknown key falls
  // back to a new toast, which resolves its own defaults.
  toastFn.update = (id, message, options) => {
    const content = createContent(message, options);

    if (queue.update(id, content, createUpdateOptions(options))) {
      return id;
    }

    return queue.add(content, createAddOptions(options));
  };

  // A loading toast is added persistent; settling starts the countdown itself,
  // because an omitted timeout is inherited by `update`.
  toastFn.promise = <T,>(
    promise: Promise<T> | (() => Promise<T>),
    options: ToastPromiseOptions<T>,
  ): string => {
    const pending = typeof promise === "function" ? promise() : promise;
    const loadingId = queue.add(createContent(options.loading, { isLoading: true }), {
      timeout: 0,
    });

    pending
      .then((data) => {
        const message =
          typeof options.success === "function" ? options.success(data) : options.success;

        return toastFn.update(loadingId, message, {
          isLoading: false,
          timeout: DEFAULT_TOAST_TIMEOUT,
          variant: "success",
        });
      })
      .catch((error: Error) => {
        const message =
          typeof options.error === "function" ? options.error(error) : options.error;

        return toastFn.update(loadingId, message, {
          isLoading: false,
          timeout: DEFAULT_TOAST_TIMEOUT,
          variant: "danger",
        });
      });

    return loadingId;
  };

  toastFn.getQueue = () => queue.getQueue();
  toastFn.close = (key: string) => queue.close(key);
  toastFn.pauseAll = () => queue.pauseAll();
  toastFn.resumeAll = () => queue.resumeAll();
  toastFn.clear = () => queue.clear();

  return toastFn;
}

/* -------------------------------------------------------------------------------------------------
 * The default instance
 * -----------------------------------------------------------------------------------------------*/

/**
 * The default queue, as upstream's module-level constant: `<Toast.Provider>`
 * uses it when it gets no `queue` prop, and `toast()` is bound to it.
 */
const toastQueue = new ToastQueue<ToastContentValue>();

/** Shows a toast on the default queue. */
export const toast = createToastFunction(toastQueue);

export { toastQueue };
