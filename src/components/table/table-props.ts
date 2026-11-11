import type { JSX, StyleProp, ViewProps, ViewRef, ViewStyle } from "nsh";

/**
 * The props every table part shares. HeroUI's parts take a React element's
 * props (`DOMRenderProps`) plus React Aria's own; NSH's host props take the
 * place of the DOM ones and `render` is accepted without effect (§8, "render
 * prop 接受但无效果"). The index signature keeps the React Aria props that have
 * no NSH counterpart passing through unchanged, which keeps a caller's table
 * typing without a cast.
 */
export interface TablePartProps
  extends Omit<ViewProps, "children" | "class" | "style" | "ref" | "onSelectionChange"> {
  children?: JSX.Element | ((...args: any[]) => JSX.Element);

  /** Appended after the slot classes; later classes win. */
  className?: string | ((values: any) => string | undefined);

  style?: StyleProp<ViewStyle> | ((values: any) => StyleProp<ViewStyle>);

  /** Forwarded to the part's host view. */
  ref?: (node: ViewRef) => void;

  /** Upstream a DOM id; here the view's `nativeID`. */
  id?: string;

  nativeID?: string;

  /** Replaces the host element upstream: accepted, no effect (§8). */
  render?: unknown;

  /** React Aria's dynamic collection inputs. */
  items?: readonly unknown[];

  dependencies?: readonly unknown[];

  [key: string]: unknown;
}
