import { describe, expect, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import {
  advance,
  closeToast,
  DEFAULT_TOAST_TIMEOUT,
  lastCall,
  openToast,
  settleExit,
  showToast,
} from "../../testers/toast";

/*
 * Web-target half of the toast M-008 baseline: the rows that need
 * `app.hover` (the CloseButton reveal and the hover-pause channel) and the
 * Tab focus handoff — all desktop/web-only channels ios/android reject.
 * `openToast`'s `platform:"windows"` pin is legal here, matching the
 * tooltip.mobile.web.test.tsx convention; `scope` params keep injecting the
 * environment halves the way the shared file does.
 */

describe("toast mobile (web)", () => {
  // adapt-sheets/toast.md M-008 (基线): the existing behaviours are
  // unchanged in both environments — the default pointer side and the
  // injected touch side answer identically. Sequential opens exhaust the
  // web target's browser pool (the M3 gate run proved it, the same host
  // count color-input-group hit), so the queue behaviours replay as phases
  // over the fixture's single `baseline` mount — one open per scope.
  test("M-008 baseline: queue, close, timeout, hover and cap semantics hold in both environments", async () => {
    for (const scope of [undefined, "touch"] as const) {
      const params: Record<string, string | number | boolean> = scope
        ? { scope }
        : {};
      const app = await openToast("baseline", { params });

      // T-049: `timeout: 0` never counts down — the seeded Persistent toast
      // is still there well past the default timeout's span.
      expect(app.shows("text:Persistent")).toBe(true);
      await advance(app, 1500);
      expect(app.shows("role:alert")).toBe(true);

      // T-012/T-050: the CloseButton closes through the queue, onClose once.
      await closeToast(app);
      expect(callsOf(app, "onCloseP")).toHaveLength(1);
      // Move the pointer off the stack so no interaction suspension survives.
      await app.hover("role:button[Outside]");
      await settleExit(app);
      expect(app.count("role:alert")).toBe(0);

      // T-051: queue.close(key) through the queue.
      await showToast(app, "Show");
      await showToast(app, "Close toast");
      expect(callsOf(app, "onCloseK")).toHaveLength(1);
      await settleExit(app);
      expect(app.count("role:alert")).toBe(0);

      // T-013: the default timeout expires on schedule.
      await showToast(app, "Show Timed");
      await advance(app, DEFAULT_TOAST_TIMEOUT);
      await settleExit(app);
      expect(app.count("role:alert")).toBe(0);

      // T-062: hovering the stack suspends the countdown, leaving resumes.
      await showToast(app, "Show Hover");
      await app.hover("role:alert");
      await advance(app, 1000);
      expect(app.shows("text:Hoverable")).toBe(true);
      await app.hover("role:button[Outside]");
      await advance(app, 1100);
      await settleExit(app);
      expect(app.count("text:Hoverable")).toBe(0);

      // T-059: toasts past maxVisibleToasts stay mounted and hidden.
      await showToast(app, "Show Cap");
      expect(app.count("role:alert")).toBe(4);

      // T-018: queue.clear() closes every toast, each onClose once.
      await showToast(app, "Clear");
      expect(callsOf(app, "onCloseCap")).toHaveLength(4);
      await settleExit(app);
      expect(app.count("role:alert")).toBe(0);
    }
  }, 120_000);

  // adapt-sheets/toast.md M-008 (基线), focus half — T-020/T-022: the focus
  // handoff — Tab reaches region → frontmost toast → its close button;
  // closing the focused toast moves focus to the remaining one.
  // `platform: "web"` is the focus-capable host (the same channel
  // tabs.mobile.test.tsx uses); `scope` still injects the environment, so
  // the touch half runs the identical keyboard path. Each environment gets
  // its own page, NOT one mount for both: on the web host the keyboard's
  // focus record dies with the provider's programmatic handoff once the
  // tree around it changes (measured on `focus-dual`: every Tab after the
  // unmount produced nothing), so a second environment can only ever be
  // asserted in a fresh page.
  test("M-008 baseline: focus handoff holds in both environments", async () => {
    for (const scope of [undefined, "touch"] as const) {
      const app = await openToast("focus-stack", {
        params: { count: 2, ...(scope ? { scope } : {}) },
        platform: "web",
      });

      await app.keyboard.press("tab");
      await app.keyboard.press("tab");
      expect(lastCall(app, "toast-focus-")).toBe("toast-focus-Second");

      await app.keyboard.press("tab");
      await app.keyboard.press("enter");
      expect(lastCall(app, "toast-focus-")).toBe("toast-focus-First");

      await settleExit(app);
      expect(app.shows("text:Second")).toBe(false);
    }
  }, 120_000);
});
