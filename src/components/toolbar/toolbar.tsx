import type {
  AccessibilityRole,
  AccessibilityState,
  Bounds,
  JSX,
  MouseEvent as NshMouseEvent,
  PressEvent,
  StyleProp,
  ViewRef,
  ViewStyle,
} from "nsh";
import type { Accessor } from "nsh";
import { computed, split, View } from "nsh";

import { SeparatorContext } from "../separator/context";
import { ToolbarContext, type ToolbarContextValue } from "./context";
import { createToolbarState } from "./create-toolbar-state";
import { toolbarVariants, type ToolbarOrientation } from "./toolbar.styles";

/* -------------------------------------------------------------------------------------------------
 * Render props
 * -----------------------------------------------------------------------------------------------*/

/**
 * The live state HeroUI hands to a Toolbar's `className`, `style` and
 * render-prop children. Upstream's `ToolbarRenderProps` has one member,
 * `orientation`, and it is a plain string there; here it is an accessor (D17),
 * because NSH reads a prop where it is used and a captured string would freeze
 * the first value.
 */
export interface ToolbarRenderProps {
  /** The axis the toolbar runs along. */
  orientation: Accessor<ToolbarOrientation>;
}

/* -------------------------------------------------------------------------------------------------
 * Toolbar Root
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Toolbar.Root`: HeroUI 3.2.7's `ToolbarRootProps`, which is
 * React Aria Components' `Toolbar` plus the two variant dimensions, expressed
 * with NSH's view host props.
 *
 * The DOM-only members upstream (`slot`, `render`, the `aria-*` relations,
 * `data-*`) are accepted so code written against HeroUI keeps compiling; the
 * port sheet §1 and §8 say what each can and cannot do here.
 */
export interface ToolbarRootProps {
  /**
   * The controls, or a render prop called once with the toolbar state (D17).
   * A bare string is not wrapped in `Text`: a toolbar holds controls, not text.
   */
  children?: JSX.Element | ((values: ToolbarRenderProps) => JSX.Element);

  /** Appended after the variant classes; later classes win. Function form gets the same accessors. */
  className?: string | ((values: ToolbarRenderProps) => string | undefined);

  /** Style of the root; function form gets the same accessors. */
  style?: StyleProp<ViewStyle> | ((values: ToolbarRenderProps) => StyleProp<ViewStyle>);

  /**
   * The axis the toolbar runs along: it sets the root's layout axis, the arrow
   * keys that move between controls, and the orientation handed down to the
   * nested `ToggleButtonGroup`s and `Separator`s. @default "horizontal"
   */
  orientation?: ToolbarOrientation;

  /**
   * Whether the toolbar is drawn as one attached surface: a surface
   * background, the large radius, 4 points of padding and the overlay shadow.
   * It changes nothing about layout or the keys. @default false
   */
  isAttached?: boolean;

  /** Upstream a DOM id; here the root view's `nativeID`. */
  id?: string;
  nativeID?: string;
  testID?: string;
  tooltip?: JSX.Element;
  onLayout?: (e: { bounds: Bounds }) => void;
  /** The root view; only the callback form is forwarded (common rules, "Real hosts"). */
  ref?: ViewRef | ((node: ViewRef) => void);

  /** Maps to `accessibilityLabel`. */
  "aria-label"?: string;
  /** Maps to `accessibilityElementsHidden`. */
  "aria-hidden"?: boolean;
  /** Accepted, no effect: NSH has no cross-element references. */
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-controls"?: string;
  /**
   * Accepted, no effect: React Aria always writes the resolved orientation, and
   * NSH's `AccessibilityState` has no orientation field (port sheet §8).
   */
  "aria-orientation"?: ToolbarOrientation;
  /** Accepted, no effect: the root's role comes from being nested or not. */
  role?: AccessibilityRole;

  /** NSH host props, accepted beside the ARIA aliases above. */
  accessibilityLabel?: string;
  accessibilityState?: AccessibilityState;
  accessibilityElementsHidden?: boolean;

  /** The press on the toolbar's own surface. It never fires from a control inside it. */
  onPress?: (e: PressEvent) => void;
  /** React's `onClick`: NSH has no DOM click, so it follows `onPress`. */
  onClick?: (e: PressEvent) => void;
  onPressDown?: (e: PressEvent) => void;
  onPressUp?: (e: PressEvent) => void;
  onLongPress?: (e: PressEvent) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onMouseEnter?: (e: NshMouseEvent) => void;
  onMouseLeave?: (e: NshMouseEvent) => void;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect: NSH has no DOM element to replace. */
  render?: unknown;

  /** Every `data-*` attribute, accepted for parity and dropped (D18). */
  [key: `data-${string}`]: unknown;
}

/**
 * Toolbar.Root / ToolbarRoot: a container whose controls the arrow keys walk
 * through in writing order. The root is the whole component upstream, so there
 * is no second part.
 *
 * Built on the core `View`, not on nsh/base `Toolbar`: that component's item
 * set only knows its own `Button` / `Toggle` / `Link` parts, its arrows wrap and
 * its Home / End and roving Tab are fixed, all of which differ from React
 * Aria's `useToolbar` contract (port sheet §3, criteria B1 and B3).
 */
export function ToolbarRoot(props: ToolbarRootProps): JSX.Element {
  const [local] = split(props, [
    "children",
    "className",
    "style",
    "orientation",
    "isAttached",
    "id",
    "nativeID",
    "testID",
    "tooltip",
    "onLayout",
    "ref",
    "aria-label",
    "aria-hidden",
    "aria-labelledby",
    "aria-describedby",
    "aria-controls",
    "aria-orientation",
    "role",
    "accessibilityLabel",
    "accessibilityState",
    "accessibilityElementsHidden",
    "onPress",
    "onClick",
    "onPressDown",
    "onPressUp",
    "onLongPress",
    "onFocus",
    "onBlur",
    "onMouseEnter",
    "onMouseLeave",
    "slot",
    "render",
  ] as const);

  // React Aria's `useToolbar` renders a toolbar nested in another toolbar as
  // `role="group"` and leaves the keys to the outer one; `useToolbar`'s context
  // is how React Aria learns it is nested (port sheet §2). Reading the context
  // in the body is the NSH equivalent, and it is static: a Toolbar never
  // changes parents.
  const outer = ToolbarContext();
  const isNested = outer != null;

  const orientation = computed<ToolbarOrientation>(() => local.orientation ?? "horizontal");

  // A nested toolbar joins the outer registry instead of starting a second
  // one, so the outer arrows still walk through every control on their way.
  let contextValue: ToolbarContextValue;
  if (outer) {
    contextValue = outer;
  } else {
    const state = createToolbarState({ orientation });
    contextValue = { orientation, registerItem: state.registerItem };
  }

  // Upstream writes the Separator's axis into `SeparatorContext`: the divider
  // runs across the toolbar, so its orientation is the other axis, and in a
  // vertical toolbar it is a horizontal line.
  const separatorOrientation = () =>
    orientation() === "horizontal" ? "vertical" : "horizontal";

  // R-006: `.toolbar .separator--vertical` → `height: 50%`.
  // R-007: `.toolbar .separator--vertical` → `align-self: center`.
  // R-008: `.toolbar .separator--horizontal` → `width: 50%`.
  // R-009: `.toolbar .separator--horizontal` → `justify-content: center`; the
  // divider has no children, kept only to stay one line per upstream rule.
  // R-010: `.toolbar .separator--horizontal` → `justify-self: center`.
  // A parent cannot see its children's types, so the container hands the
  // classes down and Separator appends them after its own variant classes
  // (port sheet §5, cross-unit change 4).
  const separator = {
    orientation: separatorOrientation,
    partClass: (axis: ToolbarOrientation) =>
      axis === "vertical"
        ? "h-1/2 self-center"
        : "w-1/2 justify-center justify-self-center",
  };

  const renderProps: ToolbarRenderProps = { orientation };

  const resolvedClassName = () => {
    const value = local.className;

    return typeof value === "function" ? value(renderProps) : value;
  };

  // Variant classes first, then the caller's: later classes win, as the same
  // two segments did upstream (`useResolvedClassName(className, styles)`).
  const classes = computed(() =>
    [
      toolbarVariants({
        orientation: orientation(),
        isAttached: local.isAttached === true,
      }),
      resolvedClassName(),
    ]
      .filter((name): name is string => typeof name === "string" && name.length > 0)
      .join(" "),
  );

  const resolvedStyle = () => {
    const value = local.style;

    return typeof value === "function" ? value(renderProps) : value;
  };

  // NSH has no DOM `click`; upstream's `onClick` follows the press. The root
  // takes presses only when the caller asked for them: a view with a press is a
  // Tab stop by default (NSH's `focusable` note), and React Aria's toolbar
  // wrapper is not in the Tab order at all.
  const hasPressProps = () => local.onPress != null || local.onClick != null;

  const handlePress = (event: PressEvent) => {
    local.onPress?.(event);
    local.onClick?.(event);
  };

  // Read `props.children` once, at the placement and inside both providers:
  // a value created in the body would evaluate outside them and the controls
  // would lose the toolbar context (common rules, the provider exception).
  const renderContent = (
    content: JSX.Element | ((values: ToolbarRenderProps) => JSX.Element),
  ) => {
    if (typeof content === "function" && content.length >= 1) {
      return (content as (values: ToolbarRenderProps) => JSX.Element)(renderProps);
    }

    return content as JSX.Element;
  };

  return (
    <ToolbarContext.Provider value={contextValue}>
      <SeparatorContext.Provider value={separator}>
        <View
          ref={(node) => {
            if (typeof local.ref === "function") {
              local.ref(node);
            }
          }}
          testID={local.testID}
          nativeID={local.id ?? local.nativeID}
          tooltip={local.tooltip}
          // RAC: a toolbar nested in a toolbar is a `group`; otherwise a
          // `toolbar`. Both are in NSH's role table.
          role={isNested ? "group" : "toolbar"}
          // Neither role makes the root a Tab stop upstream; the controls are.
          focusable={false}
          accessibilityLabel={local["aria-label"] ?? local.accessibilityLabel}
          accessibilityState={local.accessibilityState}
          accessibilityElementsHidden={
            local["aria-hidden"] ?? local.accessibilityElementsHidden
          }
          class={classes()}
          style={resolvedStyle()}
          onPress={hasPressProps() ? handlePress : undefined}
          onPressDown={local.onPressDown}
          onPressUp={local.onPressUp}
          onLongPress={local.onLongPress}
          onFocus={local.onFocus}
          onBlur={local.onBlur}
          onMouseEnter={local.onMouseEnter}
          onMouseLeave={local.onMouseLeave}
          onLayout={local.onLayout}
        >
          {renderContent(local.children)}
        </View>
      </SeparatorContext.Provider>
    </ToolbarContext.Provider>
  );
}
