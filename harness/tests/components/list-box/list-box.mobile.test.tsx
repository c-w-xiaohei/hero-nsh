import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * adapt-sheets/f-collection.md §4 (A-010): the f-collection seam's
 * mobile-layer assertions (M-001 … M-012), run against
 * `harness/list-box.fixtures.tsx`
 * `m-*` cases. Each case wraps the ListBox in `OwnerShim`, a Select-like
 * `ListOwner` that captures the registered `ListState` +
 * `ListOwnerListControls` and drives them through `testID` buttons — the
 * same contract a virtual-focus field uses — because a headless run cannot
 * give the root view focus and these assertions cover the seam, not focus.
 *
 * The seam is environment-agnostic by design: M-012 re-runs the M-001/M-002
 * scenario under `EnvironmentScope input="touch"` (`scope=touch` param) and
 * must read identically. Both file halves run headless and on `--target web`.
 */

function openMobile(
  caseName: string,
  params: Record<string, string> = {},
  scope?: "touch",
): Promise<App> {
  return open("../../../list-box.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    host: {
      params: {
        case: caseName,
        ...params,
        ...(scope ? { scope } : {}),
      },
    },
  });
}

function lastCall<T>(app: App, name: string): T {
  const calls = callsOf(app, name);
  return calls[calls.length - 1][0] as T;
}

async function pressProbe(app: App, id: string, probeName: string): Promise<void> {
  const before = callsOf(app, probeName).length;
  await app.press(`id:${id}`);
  await app.waitUntil(() => callsOf(app, probeName).length > before);
}

async function selectionChange(app: App): Promise<unknown[]> {
  const before = callsOf(app, "selectionChange").length;
  await app.press("id:activate");
  await app.waitUntil(
    () => callsOf(app, "selectionChange").length > before,
    { timeout: 4000 },
  );
  return callsOf(app, "selectionChange")[callsOf(app, "selectionChange").length - 1];
}

describe("f-collection", () => {
  // adapt-sheets/f-collection.md M-001: with `hide=delta` the "4" row never mounts, yet typeahead still
  // lands on its key — the data side holds the complete collection.
  test("M-001 typeahead hits an unmounted option's key", async () => {
    const app = await openMobile("m-items", { hide: "4", probekey: "4" });

    expect(app.count("role:option")).toBe(4);
    await app.press("id:nav-d");
    await pressProbe(app, "focused", "focusedKey");
    expect(lastCall<string | null>(app, "focusedKey")).toBe("4");
  });

  // adapt-sheets/f-collection.md M-002: keyboard activation of an unmounted key selects it through the
  // manager fallback (Enter on focusedKey → onSelectionChange contains it).
  test("M-002 Enter on an unmounted focused key selects it (activation fallback)", async () => {
    const app = await openMobile("m-multi", { hide: "4", probekey: "4" });

    await pressProbe(app, "focus-4", "focusKey");
    const change = await selectionChange(app);
    expect(change[0]).toEqual(["4"]);
  });

  // adapt-sheets/f-collection.md M-003 (负断言): mounted presence is not collection truth. A row that
  // never mounted (`hide=4` at mount) leaves no handle in the row registry,
  // yet its key sits in the collection — and mounting it later registers the
  // handle while the collection answer never changed.
  test("M-003 absent row has no registry handle while its key stays in the collection", async () => {
    const app = await openMobile("m-items", {
      hide: "4",
      probekey: "4",
      toggle: "4",
    });

    await pressProbe(app, "hasrow", "hasRow");
    expect(lastCall<boolean>(app, "hasRow")).toBe(false);

    await app.press("id:keys");
    await app.waitUntil(() => callsOf(app, "keys").length > 0);
    expect(lastCall<string[]>(app, "keys")).toEqual(["1", "2", "3", "4", "5"]);

    // Mounting the row later registers its handle; the collection answer is
    // byte-identical (mounted presence only adds interaction fields).
    const before = callsOf(app, "keys").length;
    await pressProbe(app, "toggle", "toggle");
    await pressProbe(app, "hasrow", "hasRow");
    expect(lastCall<boolean>(app, "hasRow")).toBe(true);
    await app.press("id:keys");
    await app.waitUntil(() => callsOf(app, "keys").length > before);
    expect(lastCall<string[]>(app, "keys")).toEqual(["1", "2", "3", "4", "5"]);
  });

  // adapt-sheets/f-collection.md M-004: the mounted row's textValue wins typeahead; with the row absent
  // the datum's own field answers (`""` here — the data names nothing) while
  // the key stays in the collection.
  test("M-004 row textValue override merges; absent row falls back to the datum", async () => {
    const mounted = await openMobile("m-override", { probekey: "x" });

    await mounted.press("id:nav-x");
    await pressProbe(mounted, "focused", "focusedKey");
    expect(lastCall<string | null>(mounted, "focusedKey")).toBe("x");
    await pressProbe(mounted, "find-x", "findItem");
    expect(lastCall<{ textValue: string }>(mounted, "findItem").textValue).toBe(
      "Xray",
    );

    // The row never mounts: its key stays in the collection and the node's
    // textValue falls back to the datum's own (empty) value — the override
    // was mounted state, not data.
    const unmounted = await openMobile("m-override", {
      hide: "x",
      probekey: "x",
    });

    await pressProbe(unmounted, "node-x", "node");
    expect(lastCall<{ textValue: string }>(unmounted, "node").textValue).toBe(
      "",
    );
    await unmounted.press("id:keys");
    await unmounted.waitUntil(() => callsOf(unmounted, "keys").length > 0);
    expect(lastCall<string[]>(unmounted, "keys")).toEqual(["x", "y"]);
  });

  // adapt-sheets/f-collection.md M-005: a rendered row whose `id` matches no datum is appended to the
  // collection tail (RAC's row-id override contract) and selects normally.
  test("M-005 orphan row joins the collection and selects", async () => {
    const app = await openMobile("m-orphan", { probekey: "orphan" });

    await app.press("id:keys");
    await app.waitUntil(() => callsOf(app, "keys").length > 0);
    // Data order first (both unclaimed datums), the orphan appended.
    expect(lastCall<string[]>(app, "keys")).toEqual(["1", "2", "orphan"]);

    await pressProbe(app, "focus-orphan", "focusKey");
    const change = await selectionChange(app);
    expect(change[0]).toEqual(["orphan"]);
  });

  // adapt-sheets/f-collection.md M-006: a row without `id` resolves the same positional key its datum
  // normalized to — row and data converge on "0".
  test("M-006 keyless rows align with the datum's derived key", async () => {
    const app = await openMobile("m-nokey", { probekey: "0" });

    await app.press("id:keys");
    await app.waitUntil(() => callsOf(app, "keys").length > 0);
    expect(lastCall<string[]>(app, "keys")).toEqual(["0", "1"]);

    await pressProbe(app, "find-0", "findItem");
    expect(
      lastCall<{ key: string; textValue: string; hasChildren: boolean }>(
        app,
        "findItem",
      ),
    ).toEqual({ key: "0", textValue: "Plain A", hasChildren: true });
  });

  // adapt-sheets/f-collection.md M-007: `items ?? children` expands data sections; keyless sections get
  // the generated `__nsh:section:{level}:{index}` key, and findItem reaches
  // inside a section.
  test("M-007 data sections expand, generated section keys, items resolve", async () => {
    const app = await openMobile("m-section", { probekey: "d" });

    await app.press("id:keys");
    await app.waitUntil(() => callsOf(app, "keys").length > 0);
    expect(lastCall<string[]>(app, "keys")).toEqual([
      "__nsh:section:0:0",
      "a",
      "b",
      "__nsh:section:0:3",
      "c",
      "d",
    ]);

    await pressProbe(app, "find-d", "findItem");
    expect(lastCall<{ key: string; textValue: string }>(app, "findItem")).toEqual({
      key: "d",
      textValue: "Daikon",
      hasChildren: true,
    });
  });

  // adapt-sheets/f-collection.md M-008: a row's `isDisabled` merges into its datum (node.disabled true →
  // navigation skips it, selection refused); `disabledKeys` unions on top.
  test("M-008 row isDisabled and disabledKeys merge into the node", async () => {
    const app = await openMobile("m-disabled", { probekey: "1" });

    await pressProbe(app, "node-1", "node");
    expect(lastCall<{ disabled: boolean }>(app, "node").disabled).toBe(true);

    // First navigation lands on "3": "1" (row-disabled) and "2" (disabledKeys)
    // are both skipped by the merged node flags.
    await app.press("id:nav-down");
    await pressProbe(app, "focused", "focusedKey");
    expect(lastCall<string | null>(app, "focusedKey")).toBe("3");

    // Activating the disabled key produces no selectionChange at all; the
    // settle comes from a following probe press, which runs after the same
    // turn's writes are stored.
    await pressProbe(app, "focus-1", "focusKey");
    await app.press("id:activate");
    await pressProbe(app, "focused", "focusedKey");
    expect(callsOf(app, "selectionChange")).toHaveLength(0);
  });

  // adapt-sheets/f-collection.md M-009: `itemCount` reports the unfiltered data side; a live owner filter
  // cuts the collection but not the count.
  test("M-009 itemCount is the unfiltered data count", async () => {
    const app = await openMobile("m-filter", { filter: "e" });

    await pressProbe(app, "itemcount", "itemCount");
    expect(lastCall<number>(app, "itemCount")).toBe(5);

    await pressProbe(app, "filter", "filterSet");
    await app.press("id:keys");
    await app.waitUntil(() => callsOf(app, "keys").length > 0);
    expect(lastCall<string[]>(app, "keys")).toHaveLength(3);

    await pressProbe(app, "itemcount", "itemCount");
    expect(lastCall<number>(app, "itemCount")).toBe(5);
  });

  // adapt-sheets/f-collection.md M-010: page keys on a collection with unmounted rows neither crash nor
  // leave the collection's bounds; a mounted section's frame still composes.
  test("M-010 page keys stay bounded with unmounted rows", async () => {
    const app = await openMobile("m-paged", { probekey: "1" });

    await pressProbe(app, "focus-1", "focusKey");
    await app.press("id:nav-pagedown");
    await pressProbe(app, "focused", "focusedKey");

    const afterDown = lastCall<string | null>(app, "focusedKey");
    expect(afterDown).not.toBeNull();
    await app.press("id:keys");
    await app.waitUntil(() => callsOf(app, "keys").length > 0);
    expect(lastCall<string[]>(app, "keys")).toContain(afterDown);

    // And back up: the focused key never leaves the collection.
    await app.press("id:nav-pageup");
    await pressProbe(app, "focused", "focusedKey");
    const afterUp = lastCall<string | null>(app, "focusedKey");
    expect(lastCall<string[]>(app, "keys")).toContain(afterUp);
  });

  // adapt-sheets/f-collection.md M-012: the same scenario under `EnvironmentScope input="touch"` — the
  // collection seam is environment-agnostic, so every observable is identical.
  test("M-012 touch environment: unmounted typeahead and activation identical", async () => {
    const app = await openMobile(
      "m-multi",
      { hide: "4", probekey: "4" },
      "touch",
    );

    expect(app.count("role:option")).toBe(4);
    await app.press("id:nav-d");
    await pressProbe(app, "focused", "focusedKey");
    expect(lastCall<string | null>(app, "focusedKey")).toBe("4");

    await pressProbe(app, "focus-4", "focusKey");
    const change = await selectionChange(app);
    expect(change[0]).toEqual(["4"]);
  });
});
