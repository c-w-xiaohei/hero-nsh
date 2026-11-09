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
}

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
 * section key from `getKey` and falls back to a position-based key. Keyboard
 * navigation still steps over a section because only `"item"` nodes are
 * visited.
 */
export function buildNodes(params: BuildNodesParams): Array<CollectionNode> {
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
      nodes.push({
        type: "item",
        rawValue: data,
        key: String(data),
        textValue: String(data),
        disabled: getDisabled(data),
        level,
        index,
      });

      index++;

      continue;
    }

    // Assume it's a section if it has children.
    if (getSectionChildren(data) != null) {
      nodes.push({
        type: "section",
        rawValue: data,
        key: getKey(data) || `section-${level}-${index}`,
        textValue: getTextValue(data),
        disabled: false,
        level,
        index,
      });

      index++;

      const sectionChildren = getSectionChildren(data) ?? [];

      if (sectionChildren.length > 0) {
        const childNodes = buildNodes({
          dataSource: sectionChildren,
          getKey: params.getKey,
          getTextValue: params.getTextValue,
          getDisabled: params.getDisabled,
          getSectionChildren: params.getSectionChildren,
          startIndex: index,
          startLevel: level + 1,
        });

        nodes.push(...childNodes);

        index += childNodes.length;
      }
    } else {
      nodes.push({
        type: "item",
        rawValue: data,
        key: getKey(data),
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
