/*
 * The table's column layout (port sheet §2 "列宽" row, §4 "列宽与轨道串", §5):
 * the counterpart of React Stately's `TableColumnLayout` +
 * `useTableColumnResizeState`, which NSH has no table model for.
 *
 * One track string drives the header row and every body row, computed from the
 * column descriptors and the width the resizable container measured. A drag
 * writes one column's pixel width; the layout reports the whole map to the
 * container's callbacks, exactly as `onResize*` are documented (§1 events).
 */

import type { Accessor } from "nsh";
import { computed, signal } from "nsh";

import type { TableCollectionModel, TableColumnModel } from "./create-table-collection";

/** The width callbacks `Table.ResizableContainer` asks for (§1 events). */
export interface TableResizeCallbacks {
  onResizeStart?: (widths: Map<string, number>) => void;
  onResize?: (widths: Map<string, number>) => void;
  onResizeEnd?: (widths: Map<string, number>) => void;
}

export interface TableColumnLayoutState {
  /** The container's measured width, `undefined` outside a resizable container. */
  containerWidth: Accessor<number | undefined>;

  /** One width per column, in points. */
  widths: Accessor<Map<string, number>>;

  /** The `grid-template-columns` string the header row and every body row use. */
  tracks: Accessor<string>;

  /** The column being dragged, `undefined` otherwise (§2 `resizingColumn`). */
  resizingColumn: Accessor<string | undefined>;

  /** Whether a container measured itself, i.e. the table is resizable. */
  isResizable: Accessor<boolean>;

  setContainerWidth(width: number | undefined): void;

  /** Records the callbacks of the resizable container around the table. */
  registerResizeCallbacks(callbacks: TableResizeCallbacks): () => void;

  beginResize(columnKey: string): void;
  resizeTo(columnKey: string, width: number): void;
  endResize(): void;
}

function declaredWidth(column: TableColumnModel): number | string | undefined {
  return column.width ?? column.descriptor.defaultWidth();
}

function isFraction(value: string): boolean {
  return value === "fr" || /^[0-9.]+fr$/.test(value);
}

function fractionOf(value: string): number {
  if (value === "fr") {
    return 1;
  }

  const parsed = Number.parseFloat(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function clampWidth(column: TableColumnModel, width: number): number {
  const min = column.minWidth ?? 0;
  const max = column.maxWidth;

  return Math.max(min, max == null ? width : Math.min(max, width));
}

/**
 * Builds the layout state. `containerWidth` starts `undefined`, so a table
 * without a `Table.ResizableContainer` lays out from the declared bases only
 * (the equal `1fr` fallback of §8).
 */
export function createTableColumnLayout(props: {
  collection: Accessor<TableCollectionModel>;
}): TableColumnLayoutState {
  const containerWidth = signal<number | undefined>(undefined);
  const resizingColumn = signal<string | undefined>(undefined);
  const overrides = signal<ReadonlyMap<string, number>>(new Map());
  const callbacks = signal<readonly TableResizeCallbacks[]>([]);

  const isResizable = computed(() => containerWidth() != null);

  const widths = computed<Map<string, number>>(() => {
    const columns = props.collection().columns;
    const available = containerWidth();
    const resized = overrides();
    const result = new Map<string, number>();

    if (available == null) {
      return result;
    }

    let used = 0;
    let fractions = 0;

    const autoColumns: TableColumnModel[] = [];

    for (const column of columns) {
      const declared = declaredWidth(column);
      const override = resized.get(column.key);

      if (override != null) {
        const width = clampWidth(column, override);

        result.set(column.key, width);
        used += width;
        continue;
      }

      if (typeof declared === "number") {
        const width = clampWidth(column, declared);

        result.set(column.key, width);
        used += width;
        continue;
      }

      if (typeof declared === "string") {
        if (declared.endsWith("%")) {
          const percent = Number.parseFloat(declared);
          const width = clampWidth(
            column,
            Number.isFinite(percent) ? (available * percent) / 100 : 0,
          );

          result.set(column.key, width);
          used += width;
          continue;
        }

        if (isFraction(declared)) {
          fractions += fractionOf(declared);
          autoColumns.push(column);
          continue;
        }
      }

      autoColumns.push(column);
      fractions += 1;
    }

    const remaining = Math.max(0, available - used);

    for (const column of autoColumns) {
      const declared = declaredWidth(column);
      const weight = typeof declared === "string" ? fractionOf(declared) : 1;
      const share = fractions > 0 ? (remaining * weight) / fractions : 0;

      result.set(column.key, clampWidth(column, share));
    }

    return result;
  });

  const tracks = computed(() => {
    const columns = props.collection().columns;

    if (columns.length === 0) {
      return "";
    }

    const measured = widths();

    return columns
      .map((column) => {
        const declared = declaredWidth(column);
        const min = column.minWidth == null ? "0px" : `${column.minWidth}px`;
        const max = column.maxWidth == null ? undefined : `${column.maxWidth}px`;
        const width = measured.get(column.key);

        if (width != null) {
          const track = `${width}px`;

          return max ? `minmax(${min}, min(${max}, ${track}))` : `minmax(${min}, ${track})`;
        }

        const basis =
          declared == null
            ? "1fr"
            : typeof declared === "number"
              ? `${declared}px`
              : declared;

        return max ? `minmax(${min}, min(${max}, ${basis}))` : `minmax(${min}, ${basis})`;
      })
      .join(" ");
  });

  const report = () => new Map(widths());

  const active = (): TableResizeCallbacks => {
    const list = callbacks();

    return list[list.length - 1] ?? {};
  };

  return {
    containerWidth,
    widths,
    tracks,
    resizingColumn,
    isResizable,

    setContainerWidth(width) {
      containerWidth.set(width);
    },

    registerResizeCallbacks(next) {
      callbacks.set([...callbacks(), next]);

      return () => {
        callbacks.set(callbacks().filter((current) => current !== next));
      };
    },

    beginResize(columnKey) {
      resizingColumn.set(columnKey);
      active().onResizeStart?.(report());
    },

    resizeTo(columnKey, width) {
      const column = props.collection().columnByKey.get(columnKey);

      if (!column) {
        return;
      }

      const next = new Map(overrides());

      next.set(columnKey, clampWidth(column, width));
      overrides.set(next);
      active().onResize?.(report());
    },

    endResize() {
      resizingColumn.set(undefined);
      active().onResizeEnd?.(report());
    },
  };
}
