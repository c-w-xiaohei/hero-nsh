import { computed, split, Text, View } from "nsh";
import type { AccessibilityState, JSX, ViewProps } from "nsh";

import { createDensity } from "../../primitives/environment";
import { densityKey } from "../../tokens/density";
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
 * The DOM-only members upstream (`render`, `tabIndex`, the unmapped `aria-*`,
 * `data-*`, `dir` / `lang` / `hidden` / `inert` / `translate`) are accepted so
 * code written against HeroUI keeps compiling; the ARIA ones NSH models
 * (`aria-label`, `aria-hidden`, the state attributes) are mapped onto the root
 * `View`. See the port sheet §1 and §8 for what each can and cannot do here.
 * NSH host events (`onPress`, `onMouseEnter`, …) travel through the rest props
 * to the root `View`. The `E` type parameter upstream only types those
 * forwarded attributes; the element is always a `div`, so it is not kept (port
 * sheet §8).
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

  /**
   * Accepted, no effect: an NSH view's focus stops come from `focusable`, and
   * a `tabIndex` on a plain `<div>` only joins the tab order for values ≥ 0.
   * Kept so code written against HeroUI keeps compiling.
   */
  tabIndex?: number;
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
    "accessibilityLabel",
    "accessibilityState",
    "accessibilityElementsHidden",
    "render",
    "tabIndex",
    "dir",
    "lang",
    "hidden",
    "inert",
    "translate",
    "aria-label",
    "aria-hidden",
    "aria-disabled",
    "aria-busy",
    "aria-checked",
    "aria-expanded",
    "aria-pressed",
    "aria-selected",
    "aria-current",
    "aria-labelledby",
    "aria-describedby",
    "aria-controls",
    "aria-owns",
    "aria-activedescendant",
  ] as const);

  // The environment's `density` variant axis (encapsulation.md §1, 样式管线,
  // adapt sheet A-001): the padding literal in the table resolves from the
  // mounted preset. The accessor returns the environment's own accessor, so
  // the single read here stays consistent with the scope the Root mounted
  // under; `densityKey` folds an unmounted name back to `"default"`. The
  // table has no `input` axis to feed (sheet A-003): a display container
  // carries no hover or hit-area cell.
  const density = createDensity();

  // R-001 / R-002 / R-003 in `empty-state.styles.ts`, then the caller's class:
  // HeroUI merges them through `emptyStateVariants({ className })` in the same
  // order, so the later class wins on a conflict.
  const classes = computed(() =>
    emptyStateVariants({
      density: densityKey(density()),
      className: local.className,
    }),
  );

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
  // `render`, `tabIndex`, `dir`, `lang`, `hidden`, `inert`, `translate`) are
  // accepted above and never read, instead of reaching the `View` as unknown
  // props. The ARIA attributes NSH models are mapped here, with the aria name
  // winning when both it and the host prop are given, as `{...rest}` after a
  // host prop wins upstream (Skeleton maps them the same way).
  const accessibilityState = computed<AccessibilityState>(() => {
    const own = local.accessibilityState ?? {};

    return {
      ...own,
      busy: local["aria-busy"] ?? own.busy,
      checked: local["aria-checked"] ?? own.checked,
      current: local["aria-current"] ?? own.current,
      disabled: local["aria-disabled"] ?? own.disabled,
      expanded: local["aria-expanded"] ?? own.expanded,
      pressed: local["aria-pressed"] ?? own.pressed,
      selected: local["aria-selected"] ?? own.selected,
    };
  });

  return (
    <View
      {...viewProps(rest)}
      nativeID={local.id ?? local.nativeID}
      // A `<div>` is not a keyboard focus stop upstream; without this a
      // pressable view would become one. A caller's own `focusable` still wins.
      focusable={local.focusable ?? false}
      accessibilityLabel={local["aria-label"] ?? local.accessibilityLabel}
      accessibilityHint={local.accessibilityHint ?? titleText()}
      accessibilityState={accessibilityState()}
      accessibilityElementsHidden={local["aria-hidden"] ?? local.accessibilityElementsHidden}
      tooltip={local.tooltip ?? titleTooltip()}
      class={classes()}
      style={local.style}
    >
      {content()}
    </View>
  );
}
