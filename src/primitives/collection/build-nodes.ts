/*
 * Portions of this file are based on code from Kobalte.
 * MIT Licensed, Copyright (c) 2022 Kobalte.
 *
 * Credits to the Kobalte team:
 * https://github.com/kobaltedev/kobalte/blob/675b4a11f4/packages/core/src/primitives/create-collection/utils.ts
 *
 * The `@kobalte/utils` `isString` / `isNumber` helpers are inlined.
 */

import type { CollectionNode } from "./types";

interface BuildNodesParams {
  dataSource: any[];
  getKey?: string | ((data: any) => string);
  getTextValue?: string | ((data: any) => string);
  getDisabled?: string | ((data: any) => boolean);
  getSectionChildren?: string | ((section: any) => any[]);
  startIndex?: number;
  startLevel?: number;
  /** Internal: shared between the recursive calls of one build. */
  context?: BuildContext;
}

/** One build pass: which keys the data produced, and which section keys were generated. */
interface BuildContext {
  usedKeys: Set<string>;
  generated: CollectionNode[];
}

/** Marks a section key this builder made up rather than read from the data. */
const GENERATED_SECTION_PREFIX = "\u0000nsh-section:";

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && !Number.isNaN(value);
}

/**
 * Flattens a custom data source into the collection's display order: sections
 * become section nodes and their children follow them, one level deeper.
 *
 * Sections get a real key here. Kobalte leaves it `""` with the comment "not
 * applicable here", because its own list components collect sections from the
 * JSX tree rather than from `dataSource`. A `ListCollection` keys every node,
 * so two data-driven sections would both be `""`: the second would overwrite
 * the first in the key map and the linked list would skip it. HeroUI's
 * `ListBox` takes several sections from its `items`, so this port derives the
 * section key from `getKey`.
 *
 * A section with no key in its data gets a generated key. It is a position,
 * not an identity: it changes when the section moves, so nothing may persist
 * it or use it as a lookup across renders. It is prefixed with a NUL byte and
 * then checked against every key the data produced (items and other sections);
 * a collision gets `#2`, `#3`, ... so it can never take an item's key.
 *
 * Keyboard navigation still steps over a section because only `"item"` nodes
 * are visited.
 */
export function buildNodes(params: BuildNodesParams): Array<CollectionNode> {
  const isTopLevel = params.context == null;
  const context: BuildContext = params.context ?? {
    usedKeys: new Set(),
    generated: [],
  };

  const nodes = buildNodesInternal({ ...params, context });

  if (isTopLevel) {
    for (const node of context.generated) {
      let key = node.key;
      let suffix = 2;

      while (context.usedKeys.has(key)) {
        key = `${node.key}#${suffix++}`;
      }

      node.key = key;
      context.usedKeys.add(key);
    }
  }

  return nodes;
}

function buildNodesInternal(
  params: BuildNodesParams & { context: BuildContext },
): Array<CollectionNode> {
  const context = params.context;
  let index = params.startIndex ?? 0;
  const level = params.startLevel ?? 0;

  const nodes: Array<CollectionNode> = [];

  const getKey = (data: any): string => {
    if (data == null) {
      return "";
    }

    const _getKey = params.getKey ?? "key";
    const dataKey = isString(_getKey) ? data[_getKey] : _getKey(data);
    return dataKey != null ? String(dataKey) : "";
  };

  const getTextValue = (data: any): string => {
    if (data == null) {
      return "";
    }

    const _getTextValue = params.getTextValue ?? "textValue";
    const dataTextValue = isString(_getTextValue)
      ? data[_getTextValue]
      : _getTextValue(data);
    return dataTextValue != null ? String(dataTextValue) : "";
  };

  const getDisabled = (data: any): boolean => {
    if (data == null) {
      return false;
    }

    const _getDisabled = params.getDisabled ?? "disabled";
    return (
      (isString(_getDisabled) ? data[_getDisabled] : _getDisabled(data)) ??
      false
    );
  };

  const getSectionChildren = (data: any): any[] | undefined => {
    if (data == null) {
      return undefined;
    }

    if (isString(params.getSectionChildren)) {
      return data[params.getSectionChildren];
    }

    return params.getSectionChildren?.(data);
  };

  for (const data of params.dataSource) {
    // If it's not an object assume it's an item.
    if (isString(data) || isNumber(data)) {
      const key = String(data);
      context.usedKeys.add(key);

      nodes.push({
        type: "item",
        rawValue: data,
        key,
        textValue: key,
        disabled: getDisabled(data),
        level,
        index,
      });

      index++;

      continue;
    }

    // Assume it's a section if it has children.
    if (getSectionChildren(data) != null) {
      const sectionKey = getKey(data);
      const sectionNode: CollectionNode = {
        type: "section",
        rawValue: data,
        key:
          sectionKey ||
          `${GENERATED_SECTION_PREFIX}${level}:${index}`,
        textValue: getTextValue(data),
        disabled: false,
        level,
        index,
      };

      if (sectionKey) {
        context.usedKeys.add(sectionKey);
      } else {
        context.generated.push(sectionNode);
      }

      nodes.push(sectionNode);
      index++;

      const sectionChildren = getSectionChildren(data) ?? [];

      if (sectionChildren.length > 0) {
        const childNodes = buildNodesInternal({
          dataSource: sectionChildren,
          getKey: params.getKey,
          getTextValue: params.getTextValue,
          getDisabled: params.getDisabled,
          getSectionChildren: params.getSectionChildren,
          startIndex: index,
          startLevel: level + 1,
          context,
        });

        nodes.push(...childNodes);

        index += childNodes.length;
      }
    } else {
      const key = getKey(data);
      context.usedKeys.add(key);

      nodes.push({
        type: "item",
        rawValue: data,
        key,
        textValue: getTextValue(data),
        disabled: getDisabled(data),
        level,
        index,
      });

      index++;
    }
  }

  return nodes;
}
