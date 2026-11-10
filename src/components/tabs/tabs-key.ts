/**
 * A React Aria `Key`: a string or a number. HeroUI's `Tabs` accepts both in
 * `selectedKey` / `defaultSelectedKey` / `disabledKeys`, while the collection
 * primitives in `src/primitives` deal in string keys only, so every key crosses
 * that border encoded (port sheet §2).
 *
 * This is the same encoding `accordion-key.ts` writes (`accordion-key.ts:1`);
 * the port sheet proposes promoting it to `src/primitives/key.ts` in a later
 * batch, and a unit may not create a new directory under `src/primitives/`
 * (batch rule in `_common`).
 */
export type TabsKey = string | number;

/**
 * Encodes a key as the string the collection holds. The prefix keeps `1` and
 * `"1"` apart: without it both would become `"1"` and one tab could select
 * another.
 */
export function encodeTabKey(key: TabsKey): string {
  return typeof key === "number" ? `n:${key}` : `s:${key}`;
}

/** Decodes a key the collection reports back. The inverse of {@link encodeTabKey}. */
export function decodeTabKey(value: string): TabsKey {
  const prefix = value.slice(0, 2);
  const body = value.slice(2);

  return prefix === "n:" ? Number(body) : body;
}
