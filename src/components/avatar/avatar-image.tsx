import { computed, effect, Image, split } from "nsh";
import type { ImageProps, JSX, PixelSize, ViewRef } from "nsh";

import { AvatarContext } from "./avatar-context";
import type { ImageLoadingStatus } from "./avatar-context";
import type { AriaProps, DataProps, GlobalDomProps } from "./avatar-dom-props";
import { viewProps } from "./avatar-dom-props";
import { joinClassNames } from "./class-names";

/* -------------------------------------------------------------------------------------------------
 * Avatar Image
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Avatar.Image`: HeroUI 3.2.7's `AvatarImageProps`, which is Radix
 * Avatar Image's `<img>` attributes (including the `onLoadingStatusChange`
 * callback Radix puts on Image) expressed with NSH's image host props.
 *
 * NSH's `<Image>` has no `alt`, `crossOrigin`, `loading`, `sizes` or `srcSet`.
 * `alt` becomes the accessible name; the others are accepted and have no
 * effect (port sheet §1, §5).
 */
export interface AvatarImageProps
  extends Omit<ImageProps, "children" | "class" | "ref">,
    AriaProps,
    DataProps,
    GlobalDomProps {
  /** The image URL; `undefined` / `""` counts as `error`, so the fallback shows. */
  src?: string;

  /**
   * The image's alternative text. NSH has no `alt`: it becomes
   * `accessibilityLabel` together with `role="image"`, and only once the image
   * has loaded, matching Radix's "no `<img>` before load". `alt=""` is a
   * decorative image and never gets a role.
   */
  alt?: string;

  /** Appended after the slot classes; later classes win. */
  className?: string;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** The accessible name. Maps to `accessibilityLabel`. */
  "aria-label"?: string;

  /** Hides the element from assistive technology. Maps to `accessibilityElementsHidden`. */
  "aria-hidden"?: boolean;

  /** Accepted, no effect: NSH loads images through its own loader. */
  crossOrigin?: "anonymous" | "use-credentials" | "";

  /** Accepted, no effect: NSH's loader decides when to fetch. */
  loading?: "eager" | "lazy";

  /** Accepted, no effect: NSH has no responsive image candidates. */
  sizes?: string;

  /** Accepted, no effect: NSH has no responsive image candidates. */
  srcSet?: string;

  /** Accepted, no effect: NSH has no referrer policy control. */
  referrerPolicy?: string;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  asChild?: boolean;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;

  /**
   * The image loaded. The state is updated before the callback runs, as Radix
   * does; the payload is NSH's, not React's synthetic event.
   */
  onLoad?: (event: { size: PixelSize }) => void;

  /**
   * The image failed. The state is updated before the callback runs; the
   * payload is NSH's, not React's synthetic event.
   */
  onError?: (event: { message: string; code?: string }) => void;

  /**
   * Reports the loading state whenever it changes from the previous one. The
   * initial `idle` is not reported, exactly as Radix's "only when different".
   */
  onLoadingStatusChange?: (status: ImageLoadingStatus) => void;

  /** Forwarded to the image as a callback, never as a ref store. */
  ref?: (node: ViewRef) => void;
}

export function AvatarImage(props: AvatarImageProps): JSX.Element {
  const ctx = AvatarContext();

  if (ctx === undefined) {
    throw new Error(
      "[hero-nsh]: `Avatar.Image` must be used within an `Avatar` component",
    );
  }

  const [local, rest] = split(props, [
    "src",
    "alt",
    "className",
    "style",
    "id",
    "nativeID",
    "ref",
    "crossOrigin",
    "loading",
    "sizes",
    "srcSet",
    "referrerPolicy",
    "asChild",
    "render",
    "onLoad",
    "onError",
    "onLoadingStatusChange",
    "accessibilityLabel",
    "accessibilityElementsHidden",
    "aria-label",
    "aria-hidden",
    "dir",
    "lang",
    "hidden",
    "inert",
    "translate",
  ] as const);

  const classes = computed(() =>
    joinClassNames(ctx.slots().image({ className: local.className })),
  );

  /*
   * Radix preloads with `new window.Image()` inside an effect and resets the
   * status when `src` changes. NSH has no DOM image object, so the host
   * `<Image>` itself is the loader: an effect keeps the status in step with
   * `src` (empty → `error`, set → `loading`), and the element's `onLoad` /
   * `onError` move it on.
   */
  effect(() => {
    const src = local.src;

    ctx.setStatus(src === undefined || src === "" ? "error" : "loading");
  });

  // Radix only reports a status that differs from the previous one, skipping
  // the initial `idle`. The callback belongs to this Image instance, while the
  // signal it observes belongs to the Avatar.
  let reported: ImageLoadingStatus = "idle";

  effect(() => {
    const status = ctx.status();

    if (status === "idle" || status === reported) {
      return;
    }

    reported = status;
    local.onLoadingStatusChange?.(status);
  });

  const handleLoad = (event: { size: PixelSize }) => {
    ctx.setStatus("loaded");
    local.onLoad?.(event);
  };

  const handleError = (event: { message: string; code?: string }) => {
    ctx.setStatus("error");
    local.onError?.(event);
  };

  // `alt=""` is decorative. Without alt and without an explicit accessible
  // name the image has none either.
  const decorative = computed(() => local.alt === "");
  const accessibleName = computed(() => {
    const explicit = local["aria-label"] ?? local.accessibilityLabel;

    if (explicit !== undefined) {
      return explicit;
    }

    return local.alt === undefined || local.alt === "" ? undefined : local.alt;
  });

  // Before `loaded` the fallback covers the image and the image must stay out
  // of the accessibility tree; Radix reaches the same visible result by not
  // mounting the `<img>` at all (port sheet §8).
  const exposed = computed(
    () =>
      ctx.status() === "loaded" &&
      !decorative() &&
      accessibleName() !== undefined,
  );

  return (
    <Image
      {...viewProps(rest)}
      ref={(node) => local.ref?.(node)}
      nativeID={local.id ?? local.nativeID}
      src={local.src}
      class={classes()}
      style={local.style}
      onLoad={handleLoad}
      onError={handleError}
      role={exposed() ? "image" : undefined}
      accessibilityLabel={exposed() ? accessibleName() : undefined}
      accessibilityElementsHidden={
        local["aria-hidden"] ?? local.accessibilityElementsHidden ?? !exposed()
      }
    />
  );
}
