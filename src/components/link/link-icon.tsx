import { Canvas, computed, Path2D, token, View } from "nsh";
import type {
  Bounds,
  CanvasRenderingContext2D,
  CanvasSize,
  JSX,
  StyleProp,
  ViewRef,
  ViewStyle,
} from "nsh";

import { renderChildren } from "./children";
import { joinClassNames } from "./class-names";
import { LinkContext } from "./context";
import type { AriaProps, DataProps, GlobalDomProps } from "./dom-props";

/* -------------------------------------------------------------------------------------------------
 * Default icon
 * -----------------------------------------------------------------------------------------------*/

/*
 * R-019: HeroUI's default icon is an inline `<ExternalLinkIcon>`: a 9×9 svg
 * with viewBox `0 0 7 7` and one `currentColor` path. NSH has no `<svg>`, so the
 * same path data is replayed on the core `Canvas` (the Spinner pattern): the
 * path is parsed once by `Path2D`, the `draw` callback scales the 7×7 viewBox
 * onto the measured 9×9 box, and fills it with the `link` token. `currentColor`
 * cannot be read inside a Canvas, so the color is the token instead of the
 * caller's `text-*` class (sheet §8).
 */
const EXTERNAL_LINK_PATH = new Path2D(
  "M1.20592 6.84333L0.379822 6.01723L4.52594 1.8672H1.37819L1.38601 0.731812H6.48742V5.83714H5.34421L5.35203 2.6933L1.20592 6.84333Z",
);

function drawExternalLink(
  cx: CanvasRenderingContext2D,
  size: CanvasSize,
  paint: string,
): void {
  cx.clearRect(0, 0, size.width, size.height);
  cx.save();
  // The svg's viewBox is 0 0 7 7.
  cx.scale(size.width / 7, size.height / 7);
  cx.fillStyle = paint;
  cx.fill(EXTERNAL_LINK_PATH);
  cx.restore();
}

/**
 * The replacement for `<ExternalLinkIcon data-slot="link-default-icon" />`.
 * `data-slot` has no NSH counterpart (D18), so `testID` carries the identity
 * the tests and the default-icon check use.
 */
function DefaultExternalLinkIcon(): JSX.Element {
  // `token()` is reactive, so the canvas repaints on an appearance switch.
  const paint = computed(() => token("link"));

  return (
    <Canvas
      testID="link-default-icon"
      // The svg's `aria-hidden="true"` / `role="presentation"`.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      class="h-[9px] w-[9px]"
      draw={(cx, size) => drawExternalLink(cx, size, paint())}
    />
  );
}

/* -------------------------------------------------------------------------------------------------
 * Link Icon
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Link.Icon`: HeroUI 3.2.7's `LinkIconProps`, React's `<span>`
 * attributes plus `children` and `className`, expressed with NSH's view host
 * props. `render` and the rest of the DOM-only members are accepted so code
 * written against HeroUI keeps compiling; sheet §1.2 / §8 say what they do.
 */
export interface LinkIconProps extends AriaProps, DataProps, GlobalDomProps {
  /** The icon; absent means the built-in external-link glyph (R-019). */
  children?: JSX.Element;

  /** Appended after the icon slot classes; later classes win. */
  className?: string;

  /** Appended after the slot classes; `style` wins over classes. */
  style?: StyleProp<ViewStyle>;

  /** A DOM id upstream; maps to `nativeID`, the name other elements refer to. */
  id?: string;

  /** The accessible name; maps to `accessibilityLabel`. */
  "aria-label"?: string;

  /** Maps to `accessibilityElementsHidden`. */
  "aria-hidden"?: boolean;

  /** Accepted for parity: NSH has no DOM render function to replace the span. */
  render?: unknown;

  /** NSH host props, accepted beside the ARIA aliases above. */
  accessibilityLabel?: string;
  accessibilityElementsHidden?: boolean;
  testID?: string;
  nativeID?: string;
  tooltip?: JSX.Element;
  onLayout?: (e: { bounds: Bounds }) => void;

  /** Reaches the icon's `View`; a callback, as NSH forwards refs. */
  ref?: (node: ViewRef) => void;
}

/**
 * `Link.Icon` / `LinkIcon`: a real part that reads the icon slot from the
 * nearest `Link.Root` and renders the caller's icon, or the built-in one when
 * there are no children.
 */
export function LinkIcon(props: LinkIconProps): JSX.Element {
  // Read once, in the body: the root's slots and focus state, when this icon
  // sits inside a Link. Outside one there is no slot and no focus state, as
  // upstream's `createContext({})` gives.
  const ctx = LinkContext();

  // The single read of `children`, shared by the presence check (R-016) and the
  // placement below (research 4.1). It stays a computed so a dynamic child is
  // not frozen at the first frame.
  const children = computed(() => props.children);
  const hasChildren = computed(() => {
    const value = children();

    return value !== null && value !== undefined && value !== false;
  });

  // R-018: the icon slot classes come first, the caller's `className` last.
  const classes = computed(() => joinClassNames(ctx?.slots.icon(), props.className));

  return (
    <View
      ref={(node) => props.ref?.(node)}
      testID={props.testID}
      nativeID={props.id ?? props.nativeID}
      tooltip={props.tooltip}
      // A `<span>` is not a focus stop upstream; a press on the icon belongs
      // to the link (the slot is `pointer-events-none`).
      focusable={false}
      accessibilityLabel={props["aria-label"] ?? props.accessibilityLabel}
      accessibilityElementsHidden={
        props["aria-hidden"] ?? props.hidden ?? props.accessibilityElementsHidden
      }
      class={classes()}
      classList={{
        // R-016: `.link__icon[data-default-icon="true"]` → `ms-1 pb-1.5`; the
        // attribute itself is not projected (D18), the spacing is.
        "ms-1 pb-1.5": !hasChildren(),
        // R-011: the focus ring's state raises the icon to full opacity too,
        // and both read the same value so they cannot disagree.
        "opacity-100": ctx?.isFocusVisible() ?? false,
      }}
      style={props.style}
      onLayout={props.onLayout}
    >
      <If when={hasChildren()} else={<DefaultExternalLinkIcon />}>
        {renderChildren(children())}
      </If>
    </View>
  );
}
