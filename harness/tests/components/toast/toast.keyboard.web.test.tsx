import { expect, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { advance, lastCall, openToast, settleExit } from "../../testers/toast";

/*
 * HeroUI 3.2.7 and Kobalte 0.13.14 keyboard regression cases for Toast, per
 * port sheet 4b (T-020 … T-023, T-029, T-031 … T-033, T-063).
 *
 * Why this file is `.web.`: every case moves keyboard focus with Tab and closes
 * with Return. NSH 0.4.0's Win32 host gives keyboard focus only to an Input —
 * Tab walks text fields, a click focuses only an Input, `ref.focus()` on a view
 * is a no-op and Return / Space do not activate a focused view
 * (`crates/nsh-platform-windows/src/input.rs:997-1053`, `mount.rs:440`;
 * `crates/nsh-core/src/props.rs:365`). Approved difference "Windows keyboard
 * focus and activation (NSH 0.4.0 host gap)", port sheet section 8.
 *
 * Tab order in `focus-stack`: the region itself is a Tab stop (HeroUI's region
 * is `tabIndex=-1`, a registered difference), then the frontmost toast root,
 * then its close button. The upstream cases start from the toast root, so the
 * extra first Tab is the region. Focus is read back through the fixture's
 * public `onFocus` probes (`@scenario/probe`), never from the implementation.
 */

// heroui/packages/react/tests/components/toast/toast.test.tsx:417
// Rewritten port (port sheet T-020): `data-frontmost` and the internal index
// are replaced by the observable result — the newest toast is the one Tab
// reaches — plus the count and the region's notification label.
test("T-020 exposes stacked toasts with newest frontmost and indexed", async () => {
  const app = await openToast("focus-stack", { params: { count: 2 }, platform: "web" });

  expect(app.count("role:alert")).toBe(2);
  expect(app.shows("label:2 notifications.")).toBe(true);

  await app.keyboard.press("tab");
  await app.keyboard.press("tab");

  expect(lastCall(app, "toast-focus-")).toBe("toast-focus-Second");
});

// heroui/packages/react/tests/components/toast/toast.test.tsx:439
// Partial port (port sheet T-021): the `inert` assertions are dropped (NSH has
// no inert, so a hidden toast's controls stay in the Tab order — registered in
// section 8). HeroUI renders past maxVisibleToasts and hides, so both toasts
// stay in the tree with their texts; Tab still reaches only the frontmost one.
test("T-021 exposes data-hidden on toasts beyond maxVisibleToasts", async () => {
  const app = await openToast("focus-stack", {
    params: { count: 2, maxVisible: 1 },
    platform: "web",
  });

  expect(app.count("role:alert")).toBe(2);
  expect(app.shows("text:First")).toBe(true);
  expect(app.shows("text:Second")).toBe(true);

  await app.keyboard.press("tab");
  await app.keyboard.press("tab");

  expect(lastCall(app, "toast-focus-")).toBe("toast-focus-Second");
});

// heroui/packages/react/tests/components/toast/toast.test.tsx:465
test("T-022 moves keyboard focus to the remaining toast when the focused toast closes", async () => {
  const app = await openToast("focus-stack", { params: { count: 2 }, platform: "web" });

  await app.keyboard.press("tab");
  await app.keyboard.press("tab");

  expect(lastCall(app, "toast-focus-")).toBe("toast-focus-Second");

  await app.keyboard.press("tab");
  await app.keyboard.press("enter");

  expect(lastCall(app, "toast-focus-")).toBe("toast-focus-First");

  await settleExit(app);

  expect(app.shows("text:Second")).toBe(false);
});

// heroui/packages/react/tests/components/toast/toast.test.tsx:490
// Partial port (port sheet T-023): `data-expanded` is dropped (D18); expansion
// only changes opacity, which `shows` still sees. The focus contract stays:
// Alt+T focuses the region, Escape blurs it and it stays blurred.
test("T-023 supports Alt+T to focus and expand the stack and Escape to collapse it", async () => {
  const app = await openToast("focus-stack", { params: { count: 2 }, platform: "web" });

  await app.keyboard.press("alt+t");

  expect(callsOf(app, "region-focus")).toHaveLength(1);

  await app.keyboard.press("escape");

  expect(lastCall(app, "region-")).toBe("region-blur");
  expect(callsOf(app, "region-focus")).toHaveLength(1);
});

// heroui/packages/react/tests/components/toast/toast.test.tsx:615
test("T-029 supports keyboard close of the frontmost toast", async () => {
  const app = await openToast("focus-stack", { params: { count: 1 }, platform: "web" });

  await app.keyboard.press("tab");
  await app.keyboard.press("tab");

  expect(lastCall(app, "toast-focus-")).toBe("toast-focus-First");

  await app.keyboard.press("tab");

  expect(lastCall(app, "close-focus")).toBe("close-focus");

  await app.keyboard.press("enter");
  await settleExit(app);

  expect(app.count("role:alert")).toBe(0);
});

// heroui/packages/react/tests/components/toast/toast.test.tsx:647
// Partial port (port sheet T-031): `data-expanded` is dropped (D18). The
// default hotkey is replaced, so Alt+T no longer focuses and Ctrl+N does.
test("T-031 supports a configurable hotkey", async () => {
  const app = await openToast("focus-stack", {
    params: { count: 2, hotkey: "custom" },
    platform: "web",
  });

  await app.keyboard.press("alt+t");

  expect(callsOf(app, "region-focus")).toHaveLength(0);

  await app.keyboard.press("ctrl+n");

  expect(callsOf(app, "region-focus")).toHaveLength(1);
});

// heroui/packages/react/tests/components/toast/toast.test.tsx:666
test("T-032 does not focus the region when extra modifiers are held", async () => {
  const app = await openToast("focus-stack", { params: { count: 2 }, platform: "web" });

  await app.keyboard.press("ctrl+alt+t");

  expect(callsOf(app, "region-focus")).toHaveLength(0);

  await app.keyboard.press("shift+alt+t");

  expect(callsOf(app, "region-focus")).toHaveLength(0);

  await app.keyboard.press("alt+t");

  expect(callsOf(app, "region-focus")).toHaveLength(1);
});

// heroui/packages/react/tests/components/toast/toast.test.tsx:686
test("T-033 does not focus the region when the hotkey is disabled", async () => {
  const app = await openToast("focus-stack", {
    params: { count: 2, hotkey: "none" },
    platform: "web",
  });

  await app.keyboard.press("alt+t");

  expect(callsOf(app, "region-focus")).toHaveLength(0);
});

// kobalte/packages/core/src/toast/toast.test.tsx:660
// Ported (port sheet T-063): upstream focuses the list and then leaves it; here
// Tab reaches the region (focus-within), holds the countdown, and the next Tabs
// leave it for the outside button. The commented-out "gone" assertion is live.
test("T-063 pauses timers on focus in and resumes on focus out", async () => {
  const app = await openToast("focus-pause", { platform: "web" });

  expect(app.shows("text:Pausing")).toBe(true);

  await app.keyboard.press("tab");
  await advance(app, 1000);

  expect(app.shows("text:Pausing")).toBe(true);

  await app.keyboard.press("tab");
  await app.keyboard.press("tab");
  await advance(app, 1100);
  await settleExit(app);

  expect(app.count("text:Pausing")).toBe(0);
});
