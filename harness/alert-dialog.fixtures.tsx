import { effect, host, mount, Text } from "nsh";
import type { JSX } from "nsh";
import { AlertDialog, Button, EnvironmentScope } from "@heroui/react";
import { probe } from "@scenario/probe";

import { AlertDialogContext } from "../src/components/alert-dialog/alert-dialog-context";
import type {
  AlertDialogPlacement,
  AlertDialogPresentation,
} from "../src/components/alert-dialog/alert-dialog.styles";

/*
 * NSH-only AlertDialog fixture (port sheet 4c, G-001), not a shared scenario.
 *
 * G-001 reads resolved geometry, which a HeroUI-only scenario cannot record: it
 * needs `onLayout` on the parts. This fixture renders the same part tree as
 * `alert-dialog/basic` (the upstream fixture's JSX) and records each part's box:
 *
 *   container  the positioning carrier: taller than, and containing, the card
 *   dialog     the card itself
 *   header     the heading row, above the body
 *   body       the content column, above the footer
 *   footer     the action row, never above the body
 *
 * The mobile layer adds the `host.params` the adapt sheet's §4 assertions
 * drive (A-008):
 *
 *   scope         "" (host default) | "touch" | "touch-compact" |
 *                 "touch-regular" / "regular" | "pointer" — the
 *                 `EnvironmentScope` override; the host-derived environment
 *                 stands when it is absent.
 *   presentation  "auto" | "panel" | "sheet" — the Backdrop prop; absent is
 *                 the prop's own default ("auto").
 *   dismissable   "1" / "true" → `isDismissable={true}` (default false).
 *   swipeable     "1" / "true" → `isSwipeable={true}` (default false).
 *   open          "0" → the Root starts closed so `ad-trigger` opens it
 *                 (the press-chain assertions); absent/other → `defaultOpen`.
 *   placement     "auto" | "top" | "center" | "bottom" — the Container's
 *                 placement axis (the baseline placement rows and the
 *                 outside-press geometry, where `top` leaves the backdrop's
 *                 middle uncovered).
 *
 * Observable surface for the assertions: `ad-trigger` / `ad-card` /
 * `ad-backdrop` testIDs, the `layout` probe (container/dialog bounds), the
 * `events` probe (the trigger's press chain, in order), `openChange`, and the
 * `drag` probe — panKeys (0 when the swipe gesture is gated off: the path is
 * physically absent) plus every offset the gesture writes.
 *
 * It sits next to harness/nsh.json on purpose: NSH takes the entry's own
 * directory as the app root, so a fixture under harness/tests/... would find no
 * nsh.json and lose the `@heroui/react` alias and the theme.
 */

type LayoutEvent = {
  bounds: {
    origin: { x: number; y: number };
    size: { width: number; height: number };
  };
};

type LayoutName = "container" | "dialog" | "header" | "body" | "footer" | "trigger";

function layoutProbe(name: LayoutName) {
  return (event: LayoutEvent) =>
    probe("layout")({
      name,
      x: event.bounds.origin.x,
      y: event.bounds.origin.y,
      width: event.bounds.size.width,
      height: event.bounds.size.height,
    });
}

/**
 * Reports the Backdrop's swipe channel on every change: `panKeys` is the
 * count of props `panHandlers()` resolves to — 0 while the gesture is gated
 * off (the listeners are physically absent, the sheet's M-003/M-004
 * assertion) — and `offset` is the drag displacement the card translates by.
 */
function SwipeProbe() {
  const report = probe("drag");
  const swipe = AlertDialogContext()?.swipe() ?? null;

  effect(() => {
    report({
      panKeys: swipe ? Object.keys(swipe.panHandlers()).length : -1,
      offset: swipe?.offset() ?? 0,
    });
  });

  return null;
}

function Scoped(props: { children?: JSX.Element }) {
  const scope = String(host.params.scope ?? "");

  switch (scope) {
    case "touch":
      return (
        <EnvironmentScope input="touch">{props.children}</EnvironmentScope>
      );
    case "touch-compact":
      return (
        <EnvironmentScope input="touch" width="compact">
          {props.children}
        </EnvironmentScope>
      );
    case "touch-regular":
    case "regular":
      return (
        <EnvironmentScope input="touch" width="regular">
          {props.children}
        </EnvironmentScope>
      );
    case "pointer":
      return (
        <EnvironmentScope input="pointer">{props.children}</EnvironmentScope>
      );
    default:
      // No fragment here: a `<>` boundary between the mount root and the
      // tree breaks the presented Dialog's runtime open (measured — the
      // trigger's openChange fires but the layer never mounts). Returning
      // the child directly keeps the owner chain intact.
      return props.children;
  }
}

function paramFlag(name: string): boolean {
  const value = String(host.params[name] ?? "");

  return value === "1" || value === "true";
}

function Geometry() {
  const events = probe("events");
  const presentation = String(host.params.presentation ?? "") as
    | AlertDialogPresentation
    | "auto"
    | "";
  const placement = String(host.params.placement ?? "") as
    | AlertDialogPlacement
    | "";
  const startsOpen = String(host.params.open ?? "1") !== "0";

  return (
    <AlertDialog defaultOpen={startsOpen} onOpenChange={probe("openChange")}>
      {/* A-005: the part the press-feedback seam lands on; its press chain is
          the `events` probe, asserted in the desktop order. */}
      <AlertDialog.Trigger
        testID="ad-trigger"
        onLayout={layoutProbe("trigger")}
        onPressDown={() => events("pressDown")}
        onPress={() => events("press")}
        onPressUp={() => events("pressUp")}
      >
        Delete Project
      </AlertDialog.Trigger>
      <AlertDialog.Backdrop
        testID="ad-backdrop"
        presentation={presentation === "" ? undefined : presentation}
        isDismissable={paramFlag("dismissable")}
        isSwipeable={paramFlag("swipeable")}
      >
        <AlertDialog.Container
          placement={placement === "" ? undefined : placement}
          onLayout={layoutProbe("container")}
        >
          <AlertDialog.Dialog testID="ad-card" onLayout={layoutProbe("dialog")}>
            <SwipeProbe />
            {/* A-006/M-009: the close→onPress order is read off the merged
                probe stream (`openChange` before `closePress`). */}
            <AlertDialog.CloseTrigger
              testID="ad-close"
              onPress={() => events("closePress")}
            />
            <AlertDialog.Header onLayout={layoutProbe("header")}>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>Delete project permanently?</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body onLayout={layoutProbe("body")}>
              <Text>This action cannot be undone.</Text>
              <Text>The project and everything inside it is deleted permanently.</Text>
            </AlertDialog.Body>
            <AlertDialog.Footer onLayout={layoutProbe("footer")}>
              <Button slot="close" variant="tertiary">
                Cancel
              </Button>
              <Button slot="close" variant="danger">
                Delete Project
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
}

const entries: Record<string, () => JSX.Element> = {
  geometry: Geometry,
};

function Fixture() {
  const name = String(host.params.fixture ?? "");
  const Entry = entries[name];

  if (!Entry) return <Text>{`unknown fixture: ${name}`}</Text>;

  return (
    <Scoped>
      <Entry />
    </Scoped>
  );
}

mount(Fixture);
