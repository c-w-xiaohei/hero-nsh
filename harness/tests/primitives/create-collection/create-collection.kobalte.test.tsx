/*
 * Kobalte has no unit tests for `src/primitives/create-collection` (checked at
 * commit 675b4a11f4). These are direct behavioral tests of `buildNodes`,
 * `ListCollection` and `getItemCount`, run through the
 * `primitives/collection` scenario.
 *
 * The upstream behavior comes from:
 *   packages/core/src/primitives/create-collection/utils.ts
 *   packages/core/src/list/list-collection.ts
 *   packages/core/src/primitives/create-collection/get-item-count.ts
 *
 * One deliberate difference is asserted: a data-driven section gets a real key
 * (Kobalte leaves `""`), because `ListCollection` keys every node and two
 * sections would otherwise overwrite each other (see build-nodes.ts).
 */

import { describe, expect, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

type Collected = {
  nodes: {
    type: string;
    key: string;
    textValue: string;
    level: number;
    index: number;
  }[];
  sectionedSize: number;
  first: string | null;
  last: string | null;
  afterFruits: string | null;
  beforeOthers: string | null;
  atTwo: string | null;
  chain: string[];
  indexes: string[];
  disabled: string[];
  sectionCount: number;
  otherCount: number;
  otherSize: number;
  sectionCountAfterOther: number;
  collidingKeys: string[];
  flat: { type: string; key: string; textValue: string }[];
};

async function collected(): Promise<Collected> {
  const app = await openScenario("primitives/collection");
  await app.press("id:action-run");
  await app.waitUntil(() => callsOf(app, "result").length > 0);
  return callsOf(app, "result")[0][0] as Collected;
}

describe("buildNodes", () => {
  test("flattens sections and their children in display order, one level deeper", async () => {
    const result = await collected();

    expect(result.nodes.map((node) => [node.type, node.key, node.level])).toEqual([
      ["section", "fruits", 0],
      ["item", "apple", 1],
      ["item", "apricot", 1],
      ["section", "others", 0],
      ["item", "banana", 1],
      ["item", "blueberry", 1],
    ]);
  });

  test("keeps a section's text value for its header", async () => {
    const result = await collected();
    expect(result.nodes[0].textValue).toBe("Fruits");
    expect(result.nodes[3].textValue).toBe("Others");
  });

  test("turns bare strings and numbers into items", async () => {
    const result = await collected();

    expect(result.flat).toEqual([
      { type: "item", key: "one", textValue: "one" },
      { type: "item", key: "two", textValue: "two" },
      { type: "item", key: "3", textValue: "3" },
    ]);
  });
});

describe("ListCollection", () => {
  test("links every node, sections included, in display order", async () => {
    const result = await collected();

    expect(result.chain).toEqual([
      "fruits",
      "apple",
      "apricot",
      "others",
      "banana",
      "blueberry",
    ]);
    expect(result.sectionedSize).toBe(6);
    expect(result.first).toBe("fruits");
    expect(result.last).toBe("blueberry");
  });

  test("steps over a section with getKeyAfter/getKeyBefore", async () => {
    const result = await collected();

    expect(result.afterFruits).toBe("apple");
    expect(result.beforeOthers).toBe("apricot");
  });

  test("supports indexed access and item numbering", async () => {
    const result = await collected();

    expect(result.atTwo).toBe("apricot");
    // Sections keep their data index; items are numbered 0..n as a list.
    expect(result.indexes).toEqual([
      "apple:0",
      "apricot:1",
      "banana:2",
      "blueberry:3",
    ]);
  });

  test("counts items only, not sections", async () => {
    const result = await collected();
    expect(result.sectionCount).toBe(4);
  });
});

describe("getItemCount", () => {
  test("counts each collection separately, even with the other one cached", async () => {
    const result = await collected();

    expect(result.sectionCount).toBe(4);
    expect(result.otherCount).toBe(2);
    expect(result.otherSize).toBe(2);
    // The first collection's count survives the second call unchanged.
    expect(result.sectionCountAfterOther).toBe(4);
  });
});

describe("generated section keys", () => {
  test("a generated key moves aside instead of taking an item's key", async () => {
    const result = await collected();

    expect(result.collidingKeys).toEqual([
      "section:__nsh:section:0:0#2",
      "item:x",
      "item:__nsh:section:0:0",
    ]);
  });
});
