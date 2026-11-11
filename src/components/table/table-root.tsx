import type { JSX, StyleProp, ViewProps, ViewRef, ViewStyle } from "nsh";
import { context, View } from "nsh";
import { tableVariants, type TableVariants } from "./table.styles";

export interface TableContextValue {
  slots: ReturnType<typeof tableVariants>;
  variant: "primary" | "secondary";
}

export const TableContext = context<TableContextValue | undefined>(undefined);

export interface TableRootProps extends Omit<ViewProps, "children" | "class" | "style" | "ref"> {
  children?: JSX.Element;
  className?: string;
  style?: StyleProp<ViewStyle>;
  variant?: TableVariants["variant"];
  ref?: (node: ViewRef) => void;
  id?: string;
  render?: unknown;
}

export function TableRoot(props: TableRootProps) {
  const variant = props.variant ?? "primary";
  const slots = tableVariants({ variant });
  const { children, className, style, ref, id, render: _render, variant: _variant, ...rest } = props;

  return (
    <TableContext.Provider value={{ slots, variant }}>
      <View
        {...rest}
        ref={(node) => ref?.(node)}
        onLayout={props.onLayout}
        nativeID={id}
        class={[slots.base(), className].filter(Boolean).join(" ")}
        style={style}
      >
        {children}
      </View>
    </TableContext.Provider>
  );
}
