import { describe, expect, open, test } from "nsh/test";
import type { App, OpenOptions } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import {
  fieldChanges,
  lastSegment,
  lastSegmentProps,
  rootRecord,
} from "../../testers/date-input-group";

/*
 * Headless mobile assertions for the DateInputGroup adapt unit — the rows
 * of adapt-sheets/date-input-group.md §4 that need a capability only the
 * headless engine has: M-013 / M-014 (`open({platform:"ios"})` host
 * derivation — `--target web` rejects a `platform` option outright), the
 * headless half of M-010's commit boundary (a pointer press moves focus on
 * the windows driver where web's does not; the Tab half is the web file's),
 * and the `app.hover` rows — M-003 and M-010's hover half — that a phone
 * has no mouse for (moved from `date-input-group.mobile.test.tsx`).
 *
 * The fixture is `harness/date-input-group.fixtures.tsx`; `host.params`:
 * `case`, `testInput`, `granularity`. The ios opens pin no desktop
 * platform — the phone-sized host deriving `input == "touch"` is the
 * subject (the list-box headless convention).
 */

function openDig(
  caseName: string,
  params: Record<string, string> = {},
  options: Pick<OpenOptions, "platform" | "width" | "height"> = {},
): Promise<App> {
  return open("../../../date-input-group.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    locale: "en-US",
    ...options,
    host: { params: { case: caseName, ...params } },
  });
}

function openIos(caseName: string, params: Record<string, string> = {}): Promise<App> {
  return openDig(caseName, params, { platform: "ios", width: 390, height: 844 });
}

// The last `segment-props` record per type decides: earlier renders still
// carry the previous `isFocused`, so "focused" means the latest render says so.
function focusedTypes(app: App, name = "segment-props"): string[] {
  const last = new Map<string, boolean>();
  for (const c of callsOf(app, name)) {
    const r = c[0] as { type: string; isFocused: boolean };
    last.set(r.type, r.isFocused);
  }
  return [...last.entries()].filter(([, focused]) => focused).map(([type]) => type);
}

async function waitFocused(app: App, type: string, name = "segment-props"): Promise<void> {
  await app.waitUntil(() => focusedTypes(app, name).includes(type));
}

type HoverEventEntry = { source: string; type: string; kind: string; isHovering?: boolean };
type InputPropsEntry = {
  isHovered: boolean;
  isFocusWithin: boolean;
  isFocusVisible: boolean;
  isDisabled: boolean;
  isInvalid: boolean;
};

function hoverEvents(app: App): HoverEventEntry[] {
  return callsOf(app, "hover-events").map((c) => c[0] as HoverEventEntry);
}

function inputRecord(app: App): InputPropsEntry {
  const found = callsOf(app, "input-props").at(-1)?.[0] as InputPropsEntry | undefined;
  if (found === undefined) throw new Error("the fixture recorded no input-props call");
  return found;
}

describe("date-input-group mobile (headless)", () => {
  // adapt-sheets/date-input-group.md M-013 (A-005, A-006): `platform:"ios"`
  // with no `EnvironmentScope` — the host derives `input()==="touch"` on its
  // own, so the channels mount and `app.type` drives `field.type` exactly as
  // the injected half (M-005) does.
  test("M-013 ios host derivation: channels mount and type edits without a scope", async () => {
    const app = await openIos("default");

    expect(app.count("id:dig-seg-month")).toBe(1);
    expect(app.count("id:dig-seg-day")).toBe(1);
    expect(app.count("id:dig-seg-year")).toBe(1);

    await app.type("id:dig-seg-month", "12");
    await app.waitUntil(() => lastSegment(app, "month").text === "12");
    await waitFocused(app, "day");
  }, 120_000);

  // adapt-sheets/date-input-group.md M-014 (A-005): on ios the channel's
  // `onKeyPress` letters reach a `dayPeriod` segment the way the keymap's
  // a-z bindings do — "p" resolves PM, "a" resolves AM (the field's own
  // am/pm inference, unchanged).
  test("M-014 ios: channel letters drive the dayPeriod segment like the keymap", async () => {
    const app = await openIos("edit-gate", { granularity: "minute" });

    expect(app.count("id:dig-seg-dayPeriod")).toBe(1);

    await app.type("id:dig-seg-dayPeriod", "p");
    await app.waitUntil(() => {
      const all = callsOf(app, "segments").map(
        (c) => c[0] as { type: string; text: string },
      );
      return all.some((r) => r.type === "dayPeriod" && r.text === "PM");
    });

    const am = await openIos("edit-gate", { granularity: "minute" });
    await am.type("id:dig-seg-dayPeriod", "a");
    await am.waitUntil(() => {
      const all = callsOf(am, "segments").map(
        (c) => c[0] as { type: string; text: string },
      );
      return all.some((r) => r.type === "dayPeriod" && r.text === "AM");
    });
  }, 120_000);

  // adapt-sheets/date-input-group.md M-010 headless half (基线): the group's
  // commit boundary under the pointer environment, exercised the way the
  // windows driver moves focus — a press on a focusable view outside the
  // group. (The Tab path is `date-input-group.mobile.web.test.tsx`'s half;
  // headless windows has no Tab focus.)
  test("M-010 headless: leaving the group by press commits the clamped value once", async () => {
    const app = await openDig("trigger-focus");

    await app.press("label:trigger-date >> text:mm");
    await waitFocused(app, "month");

    // February 30th stays uncommitted while editing (the X-005 semantics).
    for (const key of ["0", "2", "3", "0", "2", "0", "2", "6"]) {
      await app.keyboard.press(key);
    }
    expect(lastSegment(app, "month").text).toBe("2");
    expect(lastSegment(app, "day").text).toBe("30");
    expect(fieldChanges(app)).toHaveLength(0);

    await app.press("id:outside");
    await app.waitUntil(() => fieldChanges(app).length > 0);

    expect(fieldChanges(app)).toEqual(["2026-2-28"]);
    expect(lastSegmentProps(app, "year").isFocused).toBe(false);
  }, 120_000);

  // adapt-sheets/date-input-group.md M-003 (A-002, A-003, A-004): under
  // touch the hover writes stay off on the Root, the Input and the Segment
  // — `isHovered` render props stay false and no `onHover*` callback
  // records, even after a press (the web sticky hover cannot pin the
  // group). The pointer environment keeps the hover round-trip.
  test("M-003 injected touch suppresses hover everywhere, pointer keeps it", async () => {
    const touch = await openDig("default", { testInput: "touch" });

    await touch.hover("label:date");
    await touch.hover("label:date >> text:mm");
    await touch.press("id:dig-seg-month");
    await touch.wait(50);

    expect(rootRecord(touch).isHovered).toBe(false);
    expect(inputRecord(touch).isHovered).toBe(false);
    expect(lastSegmentProps(touch, "month").isHovered).toBe(false);
    expect(hoverEvents(touch)).toHaveLength(0);

    const pointer = await openDig("default", { testInput: "pointer" });
    await pointer.hover("label:date >> text:mm");
    await pointer.wait(50);

    expect(rootRecord(pointer).isHovered).toBe(true);
    expect(inputRecord(pointer).isHovered).toBe(true);
    expect(lastSegmentProps(pointer, "month").isHovered).toBe(true);
    const kinds = hoverEvents(pointer).map((e) => `${e.source}:${e.kind}`);
    expect(kinds).toContain("root:start");
    expect(kinds).toContain("segment:start");

    // Moving to the next segment ends the first one's hover.
    await pointer.hover("label:date >> text:dd");
    await pointer.wait(50);
    const ends = hoverEvents(pointer).filter(
      (e) => e.source === "segment" && e.type === "month" && e.kind === "end",
    );
    expect(ends.length).toBeGreaterThan(0);
    expect(lastSegmentProps(pointer, "month").isHovered).toBe(false);
    expect(lastSegmentProps(pointer, "day").isHovered).toBe(true);
  }, 120_000);

  // adapt-sheets/date-input-group.md M-010's hover half (基线): under the
  // pointer environment a hover on a segment raises `isHovered` and the
  // `segment:start` hover event — the rest of M-010's baseline stays in
  // the shared file.
  test("M-010 pointer baseline: segment hover raises isHovered and the hover event", async () => {
    const app = await openDig("default", { testInput: "pointer" });

    await app.hover("label:date >> role:spinbutton >> nth=0");
    await app.wait(50);
    expect(lastSegmentProps(app, "month").isHovered).toBe(true);
    expect(hoverEvents(app).some((e) => e.source === "segment" && e.kind === "start")).toBe(true);
  }, 120_000);
});
