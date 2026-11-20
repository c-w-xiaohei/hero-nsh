import { describe, expect, open, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * adapt-sheets/f-collection.md M-013: unit assertions for `toListItemData`
 * and `listItemDataGetters()` (sheet §2 A-001) — the key/textValue/disabled/
 * children chains every `items`-driven collection normalizes through, and
 * their consumption by `createListState`. The probe case `f-collection&
 * which=data` lives in harness/list-box.fixtures.tsx (the fixture this unit
 * owns) and records `probe("data")` / `probe("getters")` / `probe("import")`.
 */

function openData() {
  return open("../../../list-box.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    host: { params: { case: "f-collection", which: "data" } },
  });
}

interface Normalized {
  key: string;
  textValue: string;
  disabled: boolean;
  children: number | null;
}

interface NodeSnapshot {
  type: string;
  key: string;
  textValue: string;
  disabled: boolean;
}

describe("list-item-data", () => {
  // adapt-sheets/f-collection.md M-013: each row of the fixture's datum array normalizes per the chains:
  // id → key → String(datum) → String(index); textValue → name → label → "";
  // disabled → isDisabled → false; items → children → item/section.
  test("M-013 toListItemData normalizes every field chain", async () => {
    const app = await openData();

    const results = callsOf(app, "data")[0][0] as Normalized[];

    // { id: "x" }
    expect(results[0]).toEqual({ key: "x", textValue: "", disabled: false, children: null });
    // { key: "k" }
    expect(results[1]).toEqual({ key: "k", textValue: "", disabled: false, children: null });
    // "plain": a primitive is its own key and textValue (buildNodes parity).
    expect(results[2]).toEqual({ key: "plain", textValue: "plain", disabled: false, children: null });
    // { textValue: "OnlyText" }: no key fields, so the positional index.
    expect(results[3]).toEqual({ key: "3", textValue: "OnlyText", disabled: false, children: null });
    // { name: "ByName", items: [...] }: name feeds textValue; items marks a section.
    expect(results[4]).toEqual({ key: "4", textValue: "ByName", disabled: false, children: 1 });
    // { children: [...] }: children is the second section field.
    expect(results[5]).toEqual({ key: "5", textValue: "", disabled: false, children: 1 });
    // undefined: falls through to the positional index.
    expect(results[6]).toEqual({ key: "6", textValue: "", disabled: false, children: null });
    // { label: "Lab" }: label is the last textValue source.
    expect(results[7]).toEqual({ key: "7", textValue: "Lab", disabled: false, children: null });
    // { id: "d1", isDisabled: true }: isDisabled is the second disabled field.
    expect(results[8]).toEqual({ key: "d1", textValue: "", disabled: true, children: null });
    // { id: "d2", disabled: true }: disabled proper wins first.
    expect(results[9]).toEqual({ key: "d2", textValue: "", disabled: true, children: null });
  });

  // adapt-sheets/f-collection.md M-013 (second half): `listItemDataGetters()` feeds `createListState`
  // directly — the section expands, every node gets key/textValue/disabled.
  test("M-013 listItemDataGetters feeds createListState correctly", async () => {
    const app = await openData();

    const nodes = callsOf(app, "getters")[0][0] as NodeSnapshot[];

    expect(nodes).toEqual([
      { type: "section", key: "s1", textValue: "Sec", disabled: false },
      { type: "item", key: "i1", textValue: "Inner", disabled: false },
      { type: "item", key: "i2", textValue: "Outer", disabled: true },
      { type: "item", key: "prim", textValue: "prim", disabled: false },
    ]);
  });

  // adapt-sheets/f-collection.md M-015 half: `toListItemData`/`listItemDataGetters` resolve through the
  // public entry (the fixture imports them from "@heroui/react").
  test("M-013 toListItemData is importable from the public entry", async () => {
    const app = await openData();

    expect(callsOf(app, "import")[0][0]).toEqual({ data: true });
  });
});
