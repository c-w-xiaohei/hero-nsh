/*
 * f-collection, data side: the one normalization every `dataSource` consumer
 * shares. React Aria derives an option's collection fields from its `Item` /
 * `Section` props (`id`, `textValue`, `isDisabled`, `childItems`); in NSH a
 * data-driven list keeps the same contract on the data itself, so a mounted
 * row and the collection agree on one key chain, one text chain, one disabled
 * chain and one children chain:
 *
 *   key        id ?? key ?? String(datum) ?? String(index)
 *   textValue  textValue ?? name ?? label ?? ""
 *   disabled   disabled ?? isDisabled ?? false
 *   children   items ?? children (a non-array means "no children" -> item)
 *
 * `name`/`label` stand in for RAC's "the item's rendered text": NSH cannot
 * read JSX back, so the data's own naming fields are the closest equivalent
 * (adapt-sheet f-collection §7).
 *
 * `index` is the caller's position for a datum that names nothing (the
 * `<Each>` row's index accessor): the merged data source derives
 * `String(index)` for it, matching a positional row's mount-time key. Left
 * out (a `buildNodes` getter has no index) the chain ends at `""`, exactly
 * what the default `"key"` mapping produced before.
 */

/** One list entry's normalized collection fields. */
export interface ListItemData {
  /** The collection key the data side and the mounted row both converge on. */
  key: string;

  /** Typeahead text and the accessible-name fallback. */
  textValue: string;

  /** The item's own disabled flag. */
  disabled: boolean;

  /** A present array marks a section; anything else makes the entry an item. */
  children?: any[];
}

function isRecord(datum: unknown): datum is Record<string, unknown> {
  return datum !== null && typeof datum === "object";
}

/**
 * Normalizes one raw `items` entry to its collection fields. A primitive
 * entry (string, number) is an item whose own text is key and textValue, as
 * `buildNodes` already derives it; `null`/`undefined` fall through to the
 * positional `index`.
 */
export function toListItemData(datum: unknown, index?: number): ListItemData {
  if (!isRecord(datum)) {
    return {
      key: datum != null ? String(datum) : index != null ? String(index) : "",
      textValue: datum != null ? String(datum) : "",
      disabled: false,
    };
  }

  const key = datum.id ?? datum.key;
  const text = datum.textValue ?? datum.name ?? datum.label;
  const children = datum.items ?? datum.children;

  return {
    key: key != null ? String(key) : index != null ? String(index) : "",
    textValue: text != null ? String(text) : "",
    disabled: (datum.disabled ?? datum.isDisabled ?? false) as boolean,
    children: Array.isArray(children) ? children : undefined,
  };
}

/** The getter slots `createListState`/`createCollection` take, as one object. */
export interface ListItemDataGetters {
  getKey: (data: any) => string;
  getTextValue: (data: any) => string;
  getDisabled: (data: any) => boolean;
  getSectionChildren: (section: any) => any[];
}

/**
 * The normalization exposed as `buildNodes` getter functions, for a consumer
 * that feeds its raw `items` to `createListState` directly instead of
 * pre-normalizing. Called without an index, so a keyless object ends at `""`
 * — the same key the default `"key"` mapping gave it.
 */
export function listItemDataGetters(): ListItemDataGetters {
  return {
    getKey: (data) => toListItemData(data).key,
    getTextValue: (data) => toListItemData(data).textValue,
    getDisabled: (data) => toListItemData(data).disabled,
    // `buildNodes` reads `!= null` here, so `undefined` is the correct
    // "no children" answer even though the slot's declared type is `any[]`.
    getSectionChildren: (data) => toListItemData(data).children as any[],
  };
}
