import { computed, split, Text, View } from "nsh";
import type { JSX, ViewProps } from "nsh";

import type { AriaProps, DataProps, GlobalDomProps } from "./dom-props";
import { viewProps } from "./dom-props";
import { emptyStateVariants } from "./empty-state.styles";
import { renderChildren } from "./render-children";

/* -------------------------------------------------------------------------------------------------
 * EmptyState Root
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `EmptyState.Root` (= `EmptyState`): HeroUI 3.2.7's
 * `EmptyStateRootProps`, which is a `div`'s intrinsic attributes plus
 * `children` and `className`, expressed with NSH's view host props.
 *
 * The DOM-only members upstream (`render`, `aria-*`, `data-*`, `dir` / `lang`
 * / `hidden` / `inert` / `translate`) are accepted so code written against
 * HeroUI keeps compiling; see the port sheet §1 and §8 for what they can and
 * cannot do here. NSH host events (`onPress`, `onMouseEnter`, …) travel
 * through the rest props to the root `View`. The `E` type parameter upstream
 * only types those forwarded attributes; the element is always a `div`, so it
 * is not kept (port sheet §8).
 */
export interface EmptyStateRootProps
  extends Omit<ViewProps, "children" | "class">,
    AriaProps,
    DataProps,
    GlobalDomProps {
  /**
   * The content. Every falsy value (`undefined`, `null`, `""`, `0`, `false`,
   * `NaN`) shows the default text, exactly like upstream's
   * `children || "No results found"`. A bare string or number becomes a
   * `Text` at the placement (research 4.1, 4.6).
   */
  children?: JSX.Element;

  /** Appended after the variant classes; later classes win. */
  className?: string;

  /** A DOM id upstream; maps to `nativeID`, the name other elements refer to. */
  id?: string;

  /**
   * Upstream this is the DOM `title` attribute of the `div`: the browser's
   * native hover tooltip. NSH has no `title`, so it feeds `tooltip` (the
   * visible hint) and `accessibilityHint`, as `Kbd` does.
   */
  title?: string;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;
}

/**
 * `EmptyState.Root` / `EmptyStateRoot`: a container that pads a block of muted,
 * small text, or whatever children the caller puts in it.
 *
 * It holds no state, reads no context and dispatches no events: the root class
 * string and the resolved content are the only products, both derived. It is
 * built on the core `View` rather than a nsh/base component because nsh/base
 * has no empty state and no generic container, and `View` satisfies all four
 * reuse criteria by itself (port sheet §3): it takes any children, paints
 * nothing of its own, has no behavior contract, and has no internal state.
 */
export function EmptyStateRoot(props: EmptyStateRootProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "focusable",
    "id",
    "nativeID",
    "title",
    "tooltip",
    "accessibilityHint",
    "render",
    "dir",
    "lang",
    "hidden",
    "inert",
    "translate",
  ] as const);

  // R-001 / R-002 / R-003 in `empty-state.styles.ts`, then the caller's class:
  // HeroUI merges them through `emptyStateVariants({ className })` in the same
  // order, so the later class wins on a conflict.
  const classes = computed(() => emptyStateVariants({ className: local.className }));

  // The single read of `children`, shared through a computed as the common
  // rules require. A zero-argument function is NSH's reactive child and is
  // resolved before the truthiness test, because upstream tests the value
  // React finally renders, not "was a function passed": a function returning
  // `null` falls back to the default text. Every falsy value falls back, which
  // is `children || "No results found"`, not `??`. `renderChildren` then turns
  // a bare string / number into a `Text`, because a `View` draws none.
  const content = computed((): JSX.Element => {
    const node = local.children;
    const resolved = typeof node === "function" ? node() : node;

    return resolved ? renderChildren(resolved) : <Text>No results found</Text>;
  });

  // `<div title>` shows the browser's native hint; NSH draws it with `tooltip`
  // and describes it with `accessibilityHint` (port sheet §8).
  const titleText = computed(() => {
    const text = local.title;

    return text !== undefined && text.length > 0 ? text : undefined;
  });
  const titleTooltip = computed(() => {
    const text = titleText();

    return text === undefined ? undefined : <Text>{text}</Text>;
  });

  // Only NSH host props go to the root. HeroUI forwards every `div` attribute;
  // the ones without an NSH counterpart (unmapped `aria-*` / `data-*`,
  // `render`, `dir`, `lang`, `hidden`, `inert`, `translate`) are accepted
  // above and never read, instead of reaching the `View` as unknown props.
  return (
    <View
      {...viewProps(rest)}
      nativeID={local.id ?? local.nativeID}
      // A `<div>` is not a keyboard focus stop upstream; without this a
      // pressable view would become one. A caller's own `focusable` still wins.
      focusable={local.focusable ?? false}
      accessibilityHint={local.accessibilityHint ?? titleText()}
      tooltip={local.tooltip ?? titleTooltip()}
      class={classes()}
      style={local.style}
    >
      {content()}
    </View>
  );
}
