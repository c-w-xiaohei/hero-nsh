import { expect, open, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * The group's own focus callbacks. Web only: this file walks the keyboard focus
 * with Tab, which NSH 0.4.0's Win32 host does not do on a real window (the
 * registered Windows keyboard focus gap, _common.md:52). The group root is not
 * focusable itself; `useFocusWithin` reports the group as focused while any
 * radio in it is focused, so every assertion here is about the aggregate.
 *
 * harness/radio.fixtures.tsx `case=group-focus` renders Plan (Basic / Premium)
 * with the group's onFocus / onBlur / onFocusChange recorded, the per-item
 * onFocus / onBlur recorded as before, and a focusable `after` view past the
 * group for the focus to leave to.
 */

function openCase() {
  return open("../../../radio.fixtures.tsx", {
    platform: "web",
    width: 1024,
    height: 768,
    host: { params: { case: "group-focus" } },
  });
}

// react-aria/packages/@react-aria/radio/src/useRadioGroup.ts:82-91
// useFocusWithin('s contract as the port sheet section 2 states it: the first
// radio to take the focus enters the group, and only the last one to leave it
// reports the blur. An arrow move hands the focus from one radio to the next
// inside the same container, so it must not produce a blur / onFocusChange(false)
// pair in between.
test("reports the group focus once on entry, never between its radios, and once on the real leave", async () => {
  const app = await openCase();

  await app.keyboard.press("tab");
  expect(callsOf(app, "groupFocus")).toEqual([["group"]]);
  expect(callsOf(app, "groupBlur")).toHaveLength(0);
  expect(callsOf(app, "groupFocusChange")).toEqual([[true]]);

  await app.keyboard.press("arrowdown");
  await app.keyboard.press("arrowup");
  expect(callsOf(app, "onFocus")).toEqual([["a"], ["b"], ["a"]]);
  expect(callsOf(app, "groupFocus")).toEqual([["group"]]);
  expect(callsOf(app, "groupBlur")).toHaveLength(0);
  expect(callsOf(app, "groupFocusChange")).toEqual([[true]]);

  await app.keyboard.press("tab");
  expect(callsOf(app, "groupBlur")).toEqual([["group"]]);
  expect(callsOf(app, "groupFocusChange")).toEqual([[true], [false]]);
  expect(callsOf(app, "groupFocus")).toEqual([["group"]]);
});

// Regression X-001: the arrow handoff cleared the focused set before the next
// radio registered, so every arrow move fired onBlur and a re-entering onFocus
// / onFocusChange(true) on the group.
// react-aria/packages/@react-aria/radio/src/useRadioGroup.ts:82-91
// port sheet section 2: first item enters -> onFocus / onFocusChange(true), last
// item leaves -> onBlur / onFocusChange(false)
// src/components/radio-group/radio-group.tsx:341-396 (setItemFocused; the
// focusHandoff set at :300 and :428, cleared at :357)
test("X-001 keeps the group focused while the arrows move between its radios", async () => {
  const app = await openCase();

  await app.keyboard.press("tab");
  await app.keyboard.press("arrowdown");

  expect(callsOf(app, "onFocus")).toEqual([["a"], ["b"]]);
  expect(callsOf(app, "groupBlur")).toHaveLength(0);
  expect(callsOf(app, "groupFocus")).toEqual([["group"]]);
  expect(callsOf(app, "groupFocusChange")).toEqual([[true]]);
});
