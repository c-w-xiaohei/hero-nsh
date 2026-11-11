import { expect, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";
import {
  advance,
  closeToast,
  DEFAULT_TOAST_TIMEOUT,
  openToast,
  settleExit,
  showToast,
} from "../../testers/toast";

/*
 * HeroUI 3.2.7 and Kobalte 0.13.14 regression cases for Toast, per port sheet
 * 4b (T-001 … T-019, T-025, T-026, T-030, T-034, T-041, T-045 … T-047,
 * T-049 … T-055, T-059 … T-062). Every file:line above a test is the upstream
 * location.
 *
 * The queue is an instance, so a case needs a particular queue state at a
 * particular moment. Those shapes live in `harness/toast.fixtures.tsx`, opened
 * by case name through the tester; the shared scenarios carry the cases whose
 * JSX is the upstream fixture's own (T-034) and the ones a screenshot compares.
 *
 * Deleted in the port sheet, not tested here: T-003 … T-006, T-008, T-019,
 * T-024, T-027, T-028, T-035 … T-040, T-042 … T-044, T-048, T-056 …
 * T-058 (computed styles / CSS custom properties, BEM and data-slot assertions,
 * react-stately internals, Kobalte-only props, geometry). The keyboard cases
 * live in toast.keyboard.web.test.tsx. X-001 … X-003 at the end are round-2
 * implementation regressions, written to the required behaviour.
 */

/* Resolved on the harness theme (theme/hero-nsh.theme.json):
 * success-soft-foreground #2b7745ff.
 */
const SUCCESS_SOFT_FOREGROUND = "#2b7745ff";

// heroui/packages/react/tests/components/toast/toast.test.tsx:36
test("T-001 renders nothing until a toast is queued", async () => {
  const app = await openToast("empty");

  expect(app.shows("role:region")).toBe(false);
});

// heroui/packages/react/tests/components/toast/toast.test.tsx:44
// Partial port (port sheet T-002): the upstream `data-slot="toast-region"`
// assertion is dropped with the data attribute API (D18). The accessible
// notification-count label stays.
test("T-002 renders the region with an accessible notification count label", async () => {
  const app = await openToast("count");

  expect(app.shows("label:1 notification.")).toBe(true);
});

// heroui/packages/react/tests/components/toast/toast.test.tsx:124
// Partial port (port sheet T-007): the two `data-slot` / `data-frontmost`
// assertions are dropped (D18), and the `toast--success` class assertion is
// replaced by its visible effect, the title's success-soft-foreground color.
// The other six upstream assertions stay.
test("T-007 renders default children with alert role, title, description, and close button", async () => {
  const app = await openToast("success");

  expect(app.shows("role:alert")).toBe(true);
  expect(app.shows("text:Saved")).toBe(true);
  expect(app.shows("text:Your changes have been saved.")).toBe(true);
  expect(app.shows("id:icon-success")).toBe(true);
  expect(app.shows("role:button[Close]")).toBe(true);
  expect(app.spanStyle("text:Saved").color).toBe(SUCCESS_SOFT_FOREGROUND);
});

// heroui/packages/react/tests/components/toast/toast.test.tsx:161
test("T-009 supports a custom close label over the localized slot label", async () => {
  const app = await openToast("custom-close-label");

  expect(app.shows("label:Dismiss notification")).toBe(true);
});

// heroui/packages/react/tests/components/toast/toast.test.tsx:186
// Rewritten port (port sheet T-010): upstream asserts no
// `data-slot="toast-indicator"` element. The visible result of a missing
// indicator is a missing default icon: with no indicator the default variant
// would otherwise draw InfoIcon.
test("T-010 renders no indicator when indicator is null", async () => {
  const app = await openToast("no-indicator");

  expect(app.count("id:icon-info")).toBe(0);
});

// heroui/packages/react/tests/components/toast/toast.test.tsx:198
test("T-011 renders a custom indicator instead of the default icon", async () => {
  const app = await openToast("custom-indicator");

  expect(app.shows("id:custom-indicator")).toBe(true);
  expect(app.count("id:icon-info")).toBe(0);
});

// heroui/packages/react/tests/components/toast/toast.test.tsx:211
// Partial port (port sheet T-012): the upstream `document.body` focus assertion
// is dropped — NSH has no activeElement and a pointer press does not focus a
// view. onClose still fires at dismissal, before the exit animation ends.
test("T-012 calls onClose when the close button is pressed", async () => {
  const app = await openToast("close-onclose");

  expect(app.shows("role:alert")).toBe(true);

  await closeToast(app);

  expect(callsOf(app, "onClose")).toHaveLength(1);

  await settleExit(app);

  expect(callsOf(app, "onClose")).toHaveLength(1);
  expect(app.count("role:alert")).toBe(0);
});

// heroui/packages/react/tests/components/toast/toast.test.tsx:237
// Ported (port sheet T-013): upstream sees the toast vanish at the timeout
// because it is aria-hidden; here the toast stays mounted for the 300ms exit
// hold, so the same contract is asserted across both steps.
test("T-013 supports auto-dismiss after the default timeout", async () => {
  const app = await openToast("timeout-default");

  expect(app.shows("role:alert")).toBe(true);

  await advance(app, DEFAULT_TOAST_TIMEOUT);

  expect(app.shows("role:alert")).toBe(true);

  await settleExit(app);

  expect(app.count("role:alert")).toBe(0);
});

// heroui/packages/react/tests/components/toast/toast.test.tsx:255
test("T-014 supports updating a persistent toast without starting a countdown", async () => {
  const app = await openToast("persistent-update");

  await showToast(app, "Add");
  await showToast(app, "Update");
  await advance(app, DEFAULT_TOAST_TIMEOUT * 2);

  expect(app.shows("text:Saved")).toBe(true);
});

// heroui/packages/react/tests/components/toast/toast.test.tsx:280
test("T-015 calls the original onClose when an update omits it", async () => {
  const app = await openToast("onclose-update");

  await showToast(app, "Add");
  await showToast(app, "Update");
  await showToast(app, "Close toast");

  expect(callsOf(app, "onClose")).toHaveLength(1);
});

// heroui/packages/react/tests/components/toast/toast.test.tsx:304
test("T-016 supports auto-dismiss once a promise toast settles", async () => {
  const app = await openToast("promise");

  await showToast(app, "Promise");

  expect(app.shows("text:Uploaded")).toBe(true);

  await advance(app, DEFAULT_TOAST_TIMEOUT);
  await settleExit(app);

  expect(app.count("role:alert")).toBe(0);
});

// heroui/packages/react/tests/components/toast/toast.test.tsx:325
// Rewritten port (port sheet T-017): upstream reaches into
// `queue.getQueue().visibleToasts[0].timer.reset(4000)`, a react-stately
// internal shape. The public contract — reset restarts instead of stacking,
// and the toast still closes — is driven through `update(id, …, {timeout})`.
test("T-017 supports restarting a running timer through reset", async () => {
  const app = await openToast("timer-reset");

  await showToast(app, "Add");
  await advance(app, 500);
  await showToast(app, "Update");

  await advance(app, 1000);

  expect(app.shows("role:alert")).toBe(true);

  await advance(app, DEFAULT_TOAST_TIMEOUT);
  await settleExit(app);

  expect(app.count("role:alert")).toBe(0);
});

// heroui/packages/react/tests/components/toast/toast.test.tsx:359
// Partial port (port sheet T-018): the `data-exiting="true"` assertion is
// dropped (D18). Both onClose callbacks fire once at dismissal, both toasts
// stay mounted during the exit hold, then all leave and the handlers do not
// fire again.
test("T-018 calls each onClose at dismissal and removes all toasts after clear", async () => {
  const app = await openToast("clear-two");

  await showToast(app, "Clear");

  expect(callsOf(app, "onCloseA")).toHaveLength(1);
  expect(callsOf(app, "onCloseB")).toHaveLength(1);
  expect(app.count("role:alert")).toBe(2);

  await settleExit(app);

  expect(app.count("role:alert")).toBe(0);
  expect(callsOf(app, "onCloseA")).toHaveLength(1);
  expect(callsOf(app, "onCloseB")).toHaveLength(1);
});

// heroui/packages/react/tests/components/toast/toast.test.tsx:525
// Rewritten port (port sheet T-025): upstream asserts `data-swapped` on the
// indicator. The visible contract is the icon swap itself: no default icon
// while loading, the success icon after the update, and the new title.
test("T-025 exposes data-swapped on the indicator after a promise-style update", async () => {
  const app = await openToast("swapped");

  await showToast(app, "Add");

  expect(app.count("id:icon-success")).toBe(0);

  await showToast(app, "Update");

  expect(app.shows("id:icon-success")).toBe(true);
  expect(app.shows("text:Uploaded")).toBe(true);
});

// heroui/packages/react/tests/components/toast/toast.test.tsx:548
test("T-026 supports custom render children via Toast.Provider function-as-children", async () => {
  const app = await openToast("custom-layout");

  expect(app.shows("id:custom-toast")).toBe(true);
  expect(app.shows("text:Custom layout")).toBe(true);
});

// heroui/packages/react/tests/components/toast/toast.test.tsx:635
test("T-030 supports a custom aria-label for the toast region", async () => {
  const app = await openToast("region-label");

  expect(app.shows("label:Notifications")).toBe(true);
});

// heroui/packages/react/tests/components/toast/toast.browser.test.tsx:23
// Ported (port sheet T-034): upstream writes all four assertions with
// `expect.element`, which the port sheet counts as 0 `expect(` calls; all four
// are kept here. The toast is persistent, as in the upstream fixture.
test("T-034 shows a toast in the region and dismisses it via Close", async () => {
  const app = await openScenario("toast/default", { clock: {} });

  await showToast(app, "Show toast");

  expect(app.shows("role:alert")).toBe(true);
  expect(app.shows("role:region")).toBe(true);
  expect(app.shows("text:Saved")).toBe(true);

  await closeToast(app);
  await settleExit(app);

  expect(app.count("role:alert")).toBe(0);
});

// kobalte/packages/core/src/toast/toast.test.tsx:46
// Rewritten port (port sheet T-041): Kobalte's `role="status"` becomes HeroUI's
// `role="alert"` (NSH's AccessibilityRole has no `alertdialog`).
test("T-041 renders correctly", async () => {
  const app = await openToast("count");

  expect(app.shows("role:alert")).toBe(true);
});

// kobalte/packages/core/src/toast/toast.test.tsx:130
// Rewritten port (port sheet T-045): NSH has no aria-labelledby; the root
// registers the title as its accessibilityLabel, which is the same screen
// reader result.
test("T-045 should be labelled by its toast title", async () => {
  const app = await openToast("labelled");

  expect(app.shows("label:Title")).toBe(true);
});

// kobalte/packages/core/src/toast/toast.test.tsx:151
// Rewritten port (port sheet T-046): no aria-describedby either; the
// description joins the root's label ("Title, Description"), a registered
// shape difference (port sheet section 8).
test("T-046 should be described by its toast description", async () => {
  const app = await openToast("labelled");

  expect(app.shows("label:/Title, Description/")).toBe(true);
});

// kobalte/packages/core/src/toast/toast.test.tsx:172
// Ported (port sheet T-047): upstream's two `expect` calls are the live "still
// there" and a commented-out "gone"; both are live here, with the exit hold
// between them.
test("T-047 should close after duration", async () => {
  const app = await openToast("timed");

  expect(app.shows("role:alert")).toBe(true);

  await advance(app, 1000);

  expect(app.shows("role:alert")).toBe(true);

  await settleExit(app);

  expect(app.count("role:alert")).toBe(0);
});

// kobalte/packages/core/src/toast/toast.test.tsx:226
// Ported (port sheet T-049): Kobalte's `persistent` becomes HeroUI's
// `{timeout: 0}`.
test("T-049 should not close after duration if persistent", async () => {
  const app = await openToast("persistent");

  expect(app.shows("role:alert")).toBe(true);

  await advance(app, 1000);

  expect(app.shows("role:alert")).toBe(true);
});

// kobalte/packages/core/src/toast/toast.test.tsx:255
// Ported (port sheet T-050): the commented-out "gone" assertion is live here.
test("T-050 should close when clicking the toast close button", async () => {
  const app = await openToast("close-onclose");

  expect(app.shows("role:alert")).toBe(true);

  await closeToast(app);
  await settleExit(app);

  expect(app.count("role:alert")).toBe(0);
});

// kobalte/packages/core/src/toast/toast.test.tsx:278
// Ported (port sheet T-051): the toaster's dismiss becomes `toast.close(key)`.
test("T-051 should close when using toaster dismiss method", async () => {
  const app = await openToast("close-key");

  await showToast(app, "Show");

  expect(app.shows("role:alert")).toBe(true);

  await closeToast(app, "Close toast");
  await settleExit(app);

  expect(app.count("role:alert")).toBe(0);
});

// kobalte/packages/core/src/toast/toast.test.tsx:301
// Ported (port sheet T-052): the toaster's update becomes `toast.update`.
test("T-052 can be updated with the toaster", async () => {
  const app = await openToast("update-text");

  await showToast(app, "Show");

  expect(app.shows("text:Initial")).toBe(true);

  await showToast(app, "Update");

  expect(app.shows("text:Updated")).toBe(true);
});

// kobalte/packages/core/src/toast/toast.test.tsx:343
// Ported (port sheet T-053): upstream skips on CI over Solid presence; the
// queue here has no such limit, so the resolved state and its data are read.
test("T-053 supports promise resolve", async () => {
  const app = await openToast("promise-resolve");

  await showToast(app, "Promise");

  expect(app.shows("text:pending")).toBe(true);

  await advance(app, 1000);

  expect(app.shows("text:fulfilled - data")).toBe(true);
});

// kobalte/packages/core/src/toast/toast.test.tsx:386
// Ported (port sheet T-054): upstream's `it.skip` says implicit rejection knows
// no test channel; the queue reports the rejected branch directly.
test("T-054 supports promise reject", async () => {
  const app = await openToast("promise-reject");

  await showToast(app, "Promise");

  expect(app.shows("text:pending")).toBe(true);

  await advance(app, 1000);

  expect(app.shows("text:rejected - error")).toBe(true);
});

// kobalte/packages/core/src/toast/toast.test.tsx:430
// Ported (port sheet T-055): the region exists (with a toast queued — HeroUI
// renders no region while the queue is empty, which T-001 pins down).
test("T-055 renders correctly", async () => {
  const app = await openToast("count");

  expect(app.shows("role:region")).toBe(true);
});

// kobalte/packages/core/src/toast/toast.test.tsx:482
// Rewritten port (port sheet T-059): Kobalte's `limit` hides nothing, HeroUI
// renders everything and hides only what is past maxVisibleToasts, so four
// toasts stay in the tree.
test("T-059 should not show more toasts than the limit at the same time", async () => {
  const app = await openToast("maxvisible-three");

  expect(app.count("role:alert")).toBe(4);
});

// kobalte/packages/core/src/toast/toast.test.tsx:510
// Ported (port sheet T-060): a dismissed toast leaves the list once its exit
// hold ends, and the next one is counted fresh.
test("T-060 should not use dismissed toasts for list", async () => {
  const app = await openToast("dismissed-list");

  await showToast(app, "Show");
  await showToast(app, "Dismiss");
  await settleExit(app);

  expect(app.count("role:alert")).toBe(0);

  await showToast(app, "Show");

  expect(app.count("role:alert")).toBe(1);
});

// kobalte/packages/core/src/toast/toast.test.tsx:556
// Rewritten port (port sheet T-061): Kobalte's `region` option becomes two
// Providers with their own queue instances; each region counts its own toasts.
test("T-061 should render multiple regions simultaneously", async () => {
  const app = await openToast("two-regions");

  expect(app.count("label:Region A >> role:alert")).toBe(3);
  expect(app.count("label:Region B >> role:alert")).toBe(2);
});

// kobalte/packages/core/src/toast/toast.test.tsx:604
// Ported (port sheet T-062): HeroUI pauses on interaction unconditionally, so
// hovering the stack holds the countdown and leaving resumes it.
test("T-062 pauses timers on pointer move and resumes on pointer leave", async () => {
  const app = await openToast("hover-pause");

  expect(app.shows("text:Pausing")).toBe(true);

  await app.hover("role:alert");
  await advance(app, 1000);

  expect(app.shows("text:Pausing")).toBe(true);

  await app.hover("role:button[Outside]");
  await advance(app, 1100);
  await settleExit(app);

  expect(app.count("text:Pausing")).toBe(0);
});

/* T-063 lives in toast.keyboard.web.test.tsx: it needs Tab focus movement. */

/*
 * Round-2 regressions. Both are implementation findings handed to the fixer:
 * these cases state the required behaviour and may stay red until that fix
 * lands.
 */

// Regression, evidence: src/components/toast/toast-queue.ts:365-387 — the
// `exitDuration === 0` branch returned before running the entry's `onClose`.
// Upstream fires the callback on every close path:
// tmp/vendor/heroui/packages/react/src/components/toast/toast-queue.ts:283-285
// delegates to `super.close`, and its early-callback path at :289-314 keeps
// `onClose` at the moment of dismissal, not after an exit.
test("X-001 calls onClose exactly once when exitDuration is 0", async () => {
  const app = await openToast("close-immediate");

  expect(app.shows("role:alert")).toBe(true);

  await closeToast(app);

  expect(callsOf(app, "onClose")).toHaveLength(1);

  await advance(app, 20);

  expect(app.count("role:alert")).toBe(0);
  expect(callsOf(app, "onClose")).toHaveLength(1);
});

// Regression, same finding as X-001: reduced motion takes the immediate-removal
// path (port sheet §2, "退场后移除"), and the entry's `onClose` must still run
// once. Upstream makes the same `canAnimate` choice in one branch, so both
// conditions share the dismissal callback.
test("X-002 calls onClose exactly once under reduced motion", async () => {
  const app = await openToast("close-onclose", { reducedMotion: true });

  expect(app.shows("role:alert")).toBe(true);

  await closeToast(app);

  expect(callsOf(app, "onClose")).toHaveLength(1);

  await advance(app, 20);

  expect(app.count("role:alert")).toBe(0);
  expect(callsOf(app, "onClose")).toHaveLength(1);
});

// Regression, evidence: src/components/toast/toast-provider.tsx:765-784 — the
// function child read a frozen `entry` snapshot taken when the row was created,
// so an in-place update never reached the custom layout. Upstream renders the
// function child from the current Toast props
// (tmp/vendor/heroui/packages/react/src/components/toast/toast.tsx:320-337),
// so a queued update re-renders the custom layout with the new content while
// the row keeps its identity.
test("X-003 updates the function-as-children layout when a queued toast changes", async () => {
  const app = await openToast("custom-layout-update");

  await showToast(app, "Add");

  expect(app.count("id:custom-toast")).toBe(1);
  expect(app.shows("text:Draft")).toBe(true);

  await showToast(app, "Update");

  expect(app.count("id:custom-toast")).toBe(1);
  expect(app.shows("text:Published")).toBe(true);
  expect(app.count("text:Draft")).toBe(0);
});
