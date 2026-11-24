import { effect, host, mount, platform, Text } from "nsh";
import { Drawer, EnvironmentScope } from "@heroui/react";
import type { DrawerPlacement } from "@heroui/react";
import { DrawerContext } from "../src/components/drawer/drawer-context";
import { probe } from "./probe";

/*
 * NSH-only entries for the drawer adaptation unit (adapt-sheets/drawer.md
 * §2 A-005, §4 M-001…M-015).
 *
 * `host.params.case` picks the shape:
 *
 *   basic    Drawer.Root + Trigger + Backdrop + Content + Dialog with
 *            Handle, Header, a short Body and a CloseTrigger: the swipe
 *            surface every gesture assertion drives.
 *   scroll   the same drawer with a 60-row Body — taller than the panel —
 *            so the atTop handoff arbitration is real.
 *   sides    the basic shape for a non-bottom `placement` param: top,
 *            left or right — the "the gesture never mounts away from the
 *            bottom edge" assertion.
 *
 * `host.params.scope` picks the EnvironmentScope wrapper (the same
 * convention environment.fixtures.tsx set): "touch" injects
 * input="touch", "pointer" injects input="pointer", absent means the
 * host-derived default.
 *
 * `host.params.dismissable` (default true), `swipeable` (Backdrop's
 * `isSwipeable`), `swipeableContent` (Content's `isSwipeable`) and
 * `placement` parameterize the gates.
 *
 * `DragProbe` — a part inside the Dialog's re-provided context — reports
 * the drag channel's resolution to Storage through `probe("drag")`:
 * `keys`/`panelKeys` are the handler-prop counts `panHandlers()` resolves
 * to (0 when the gesture path is physically absent), `offset` is the
 * drag's current translateY, `atTop` the scroll channel's start-edge flag.
 * It also wraps `reportScrollOffset` once with `probe("scrollReport")`, so
 * a test can assert the report runs before the caller's `onScroll`.
 *
 * testIDs: dr-backdrop / dr-handle / dr-header / dr-body / dr-close (the
 * scrim takes `<backdrop testID>-backdrop` by the component's own rule).
 *
 * It sits next to harness/nsh.json on purpose: NSH takes the entry's own
 * directory as the app root, so an entry under harness/tests/... finds no
 * nsh.json and loses the `@heroui/react` alias and the theme.
 */

const SCROLL_ROWS = 200;

/**
 * The observation channel every assertion reads. It must live inside
 * `Drawer.Dialog` — the drag channel exists only on the context the Dialog
 * re-provides with its pan mounted.
 *
 * The `reportScrollOffset` wrap mutates the shared context object once
 * (`__probeWrapped`): Body reads the same object, so its wrapped call is
 * the one that runs — and `scrollReport`/`bodyScroll` records prove the
 * report-before-forward order the wrap itself does not change (the
 * component calls report first, then `local.onScroll`).
 */
function DragProbe() {
  const context = DrawerContext();
  const report = probe("drag");

  const mutable = context as unknown as Record<string, unknown> | null;
  if (mutable && !mutable.__probeWrapped) {
    mutable.__probeWrapped = true;
    const inner = context!.reportScrollOffset;
    mutable.reportScrollOffset = (offset: unknown) => {
      probe("scrollReport")(offset);
      inner?.(offset as { x: number; y: number });
    };
  }

  effect(() => {
    report({
      keys: context?.drag ? Object.keys(context.drag.panHandlers()).length : -1,
      panelKeys: context?.drag
        ? Object.keys(context.drag.panelPanHandlers()).length
        : -1,
      offset: context?.drag?.offset() ?? -1,
      atTop: context?.scrollAtTop?.() ?? null,
    });
  });

  return <Text>{`drag=${context?.drag ? Object.keys(context.drag.panHandlers()).length : -1}`}</Text>;
}

const flag = (value: unknown): boolean | undefined =>
  value === undefined
    ? undefined
    : !(value === false || value === "false" || value === 0 || value === "0");

function DrawerApp() {
  const name = String(host.params.case ?? "basic");
  const placement = String(host.params.placement ?? "bottom") as DrawerPlacement;
  const dismissable = flag(host.params.dismissable) !== false;
  const swipeable = flag(host.params.swipeable);
  const swipeableContent = flag(host.params.swipeableContent);
  const scrollCase = name === "scroll";

  return (
    <Drawer defaultOpen onOpenChange={probe("openChange")}>
      <Drawer.Trigger testID="dr-trigger" onPress={probe("triggerPress")}>
        Open Drawer
      </Drawer.Trigger>
      <Drawer.Backdrop
        testID="dr"
        isDismissable={dismissable}
        isSwipeable={swipeable}
        isKeyboardDismissDisabled={flag(host.params.keyboardDismissDisabled) === true}
        onPress={probe("backdropPress")}
      >
        <Drawer.Content
          placement={name === "sides" ? placement : "bottom"}
          isSwipeable={swipeableContent}
        >
          <Drawer.Dialog
            testID="dr-dialog"
            aria-label="Drawer fixture"
            onLayout={(event) => probe("layout")({ part: "dialog", bounds: event.bounds })}
          >
            <Drawer.Handle
              testID="dr-handle"
              onLayout={(event) => probe("layout")({ part: "handle", bounds: event.bounds })}
            />
            <Drawer.Header testID="dr-header">
              <Drawer.Heading>Drawer Title</Drawer.Heading>
            </Drawer.Header>
            <Drawer.Body testID="dr-body" onScroll={probe("bodyScroll")}>
              <DragProbe />
              {scrollCase ? (
                Array.from({ length: SCROLL_ROWS }, (_, index) => (
                  <Text>{`Item ${index}`}</Text>
                ))
              ) : (
                <Text>Drawer body content</Text>
              )}
            </Drawer.Body>
            <Drawer.CloseTrigger testID="dr-close" onPress={probe("closePress")} />
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
}

/*
 * The scope wrapper is picked here, not in a passthrough component:
 * measured on this fixture, an extra `props.children` fragment layer
 * between `mount` and `Drawer` leaves the presented dialog mounted after
 * a state close (`openChange(false)` records, the panel never unmounts —
 * the host's presented-dialog pass resolves the extra boundary
 * differently). Returning the elements directly keeps the tree
 * mount → Fixture → DrawerApp → Drawer.
 */
function Fixture() {
  // The host OS the app itself reports (the table/tabs convention): mobile
  // tests branch on it to register degraded acceptance where a native host
  // gap (Dialog Escape's first-responder reach) makes the physical layer
  // unobservable — the iOS-only rows, never a silent skip.
  probe("platform")(platform.os);

  const scope = String(host.params.scope ?? "");

  if (scope === "touch") {
    return (
      <EnvironmentScope input="touch">
        <DrawerApp />
      </EnvironmentScope>
    );
  }

  if (scope === "pointer") {
    return (
      <EnvironmentScope input="pointer">
        <DrawerApp />
      </EnvironmentScope>
    );
  }

  return <DrawerApp />;
}

mount(Fixture);
