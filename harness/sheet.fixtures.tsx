import { effect, host, mount, signal, Text, View } from "nsh";
import type { JSX } from "nsh";
import {
  createInput,
  createPan,
  EnvironmentScope,
  Sheet,
} from "@heroui/react";
import type { Pan, PanProps } from "@heroui/react";
import { animateSheetValue } from "../src/components/sheet/sheet.utils";
import { SheetDetentContext } from "../src/components/sheet/create-sheet-detent";
import { probe } from "./probe";

/*
 * NSH-only entries for the sheet-handoff mechanism unit
 * (adapt-sheets/sheet-handoff.md §2 A-008, §4 M-001…M-013).
 *
 * `host.params.case` picks the shape:
 *
 *   "forward" / "back" / "cancel"
 *     The pre-existing release-animation cases (port sheet T-043/T-044),
 *     driven by sheet.utils.test.tsx. Unchanged.
 *
 *   "pan-on" / "pan-off" / "pan-gated" / "pan-claim" / "pan-env"
 *     A bare `createPan` consumer: a View spreading `pan.panHandlers()` with
 *     probe texts for `active()`, the handler-key count and `scrollProps()`.
 *     "pan-on"/"pan-off" pin `enabled`; "pan-gated" flips it from a signal
 *     through the "enable" button; "pan-claim" gates on `shouldClaim`
 *     (downward only); "pan-env" derives `enabled` from `createInput()`.
 *
 *   "handoff" / "handoff-full" / "handoff-locked" / "pan-gate"
 *     A real Sheet.Root + Backdrop + Content + Dialog + Handle + Body whose
 *     Body holds 50 rows (taller than the viewport) so the detent's
 *     scrollable half is real. "handoff" carries snapPoints [180] (partial
 *     detent); the others have none (full detent). "handoff-locked" sets
 *     isDismissable={false} so a claimed release returns to the detent
 *     instead of dismissing. `DetentProbe` (inside the Content's detent
 *     provider) reports length/detents/isExpanded/atTop/dragging plus the
 *     content pan's handler and scroll-prop key counts to Storage through
 *     `probe("detent")`.
 *
 * `host.params.scope` picks the EnvironmentScope wrapper (same convention as
 * environment.fixtures.tsx): "touch" injects input="touch", "pointer"
 * injects input="pointer", absent means the host-derived default.
 *
 * It sits next to harness/nsh.json on purpose: NSH takes the entry's own
 * directory as the app root, so an entry under harness/tests/... finds no
 * nsh.json and loses the `@heroui/react` alias and the theme.
 */

/* -------------------------------------------------------------------------------------------------
 * Shared bits
 * -----------------------------------------------------------------------------------------------*/

type Scope = "" | "touch" | "pointer";

function Scoped(props: { children?: JSX.Element }) {
  const scope = String(host.params.scope ?? "") as Scope;

  if (scope === "touch") {
    return <EnvironmentScope input="touch">{props.children}</EnvironmentScope>;
  }

  if (scope === "pointer") {
    return (
      <EnvironmentScope input="pointer">{props.children}</EnvironmentScope>
    );
  }

  return <>{props.children}</>;
}

/* -------------------------------------------------------------------------------------------------
 * Release-animation cases (pre-existing, port sheet T-043/T-044)
 * -----------------------------------------------------------------------------------------------*/

function AnimationApp() {
  const name = String(host.params.case ?? "");

  const start = () => {
    const update = probe("update");
    const complete = probe("complete");

    if (name === "back") animateSheetValue(400, 0, update, complete, false);
    else if (name === "cancel") animateSheetValue(0, 100, update, complete, false)();
    else animateSheetValue(0, 400, update, complete, false);
  };

  return (
    <View class="flex-1 items-start gap-2 p-6">
      <View testID="start" onPress={start}>
        <Text>Start</Text>
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * createPan cases (M-001…M-004, M-011)
 * -----------------------------------------------------------------------------------------------*/

const PAN_CASES = new Set([
  "pan-on",
  "pan-off",
  "pan-gated",
  "pan-disarm",
  "pan-claim",
  "pan-env",
]);

/**
 * One `createPan` consumer. The probe texts are the assertion surface:
 * `active=` follows `pan.active()`, `keys=` counts the props
 * `pan.panHandlers()` resolves to (0 when `enabled()` is false — the
 * listeners are physically absent, not registered-and-ignored), `scroll=`
 * is `JSON.stringify(pan.scrollProps())`, and `api=` proves the factory
 * arrived through the public `hero-nsh` entry (M-011; the `Pan`/`PanProps`
 * type imports above are the compile-time half of the same assertion).
 */
function PanCase() {
  const variant = String(host.params.case ?? "pan-on");
  const report = probe("pan");
  const gate = signal(false);
  const disarm = signal(true);
  const input = createInput();

  const panProps: PanProps = {
    enabled: () => {
      if (variant === "pan-off") return false;
      if (variant === "pan-gated") return gate();
      if (variant === "pan-disarm") return disarm();
      if (variant === "pan-env") return input() === "touch";
      return true;
    },
    // M-004: only downward travel may claim; upward is left alone.
    shouldClaim:
      variant === "pan-claim"
        ? (_event, gesture) => gesture.dy > 0
        : undefined,
    onDragStart: (_event, gesture) =>
      report({ phase: "dragStart", dx: gesture.dx, dy: gesture.dy, active: pan.active() }),
    onDrag: (_event, gesture) =>
      report({ phase: "drag", dx: gesture.dx, dy: gesture.dy, active: pan.active() }),
    onDragEnd: (_event, gesture) =>
      report({ phase: "dragEnd", dx: gesture.dx, dy: gesture.dy, active: pan.active() }),
    keyboardDismissMode: "interactive",
  };

  const pan: Pan = createPan(panProps);

  return (
    <View class="flex-1 items-start gap-3 p-6">
      <View
        testID="pan-target"
        {...pan.panHandlers()}
        class="h-28 w-72 border border-border"
      >
        <Text>{`active=${pan.active()}`}</Text>
        <Text>{`keys=${Object.keys(pan.panHandlers()).length}`}</Text>
        <Text>{`scroll=${JSON.stringify(pan.scrollProps())}`}</Text>
        <Text>{`api=${typeof createPan}`}</Text>
      </View>
      {variant === "pan-gated" ? (
        <View testID="toggle" role="button" onPress={() => gate.set(true)} class="p-2">
          <Text>enable</Text>
        </View>
      ) : null}
      {variant === "pan-disarm" ? (
        <View testID="toggle" role="button" onPress={() => disarm.set(false)} class="p-2">
          <Text>disable</Text>
        </View>
      ) : null}
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Sheet handoff cases (M-005…M-010, M-012, M-013)
 * -----------------------------------------------------------------------------------------------*/

/**
 * Reports the detent state the Content's provider holds, on every change,
 * plus the content pan's resolved prop counts — the direct evidence for
 * "the gesture path is physically absent under pointer" (M-009) and for
 * `scrollProps` reaching the paired Scroll under touch (A-006).
 *
 * The drag channel (`beginDrag` / `moveDrag` / `endDrag` / `cancelDrag`) is
 * wrapped to report every call synchronously as `probe("drag")` records:
 * the `effect` below coalesces signal changes into one flush, so a claim
 * the host steals back a frame later — the registered headless gap where a
 * native `Scroll` force-terminates a JS-held gesture — would never appear
 * in `dragging`/`length` records. The synchronous wrap is the only channel
 * that sees the claim window itself (`dragging` stays true for exactly the
 * frames the gesture held the touches).
 */
function DetentProbe() {
  const detent = SheetDetentContext();
  const report = probe("detent");
  const reportDrag = probe("drag");

  const mutable = detent as unknown as Record<string, unknown> | null;

  if (mutable && !mutable.__probeWrapped) {
    mutable.__probeWrapped = true;
    for (const name of ["beginDrag", "moveDrag", "endDrag", "cancelDrag"] as const) {
      const inner = detent![name];
      mutable[name] = (...args: unknown[]) => {
        const out = (inner as (...a: unknown[]) => unknown)(...args);
        // The length read comes after the call, so a `moveDrag` record
        // carries the length the frame wrote — the drive evidence a batched
        // `effect` would lose.
        reportDrag({ ev: name, length: detent!.length() });
        return out;
      };
    }
  }

  effect(() => {
    if (!detent) return;

    const contentPan = detent.contentPan;

    report({
      length: detent.length(),
      detents: detent.detents(),
      isExpanded: detent.isExpanded(),
      atTop: detent.atTop(),
      dragging: detent.dragging(),
      panKeys: contentPan ? Object.keys(contentPan.panHandlers()).length : -1,
      scrollKeys: contentPan ? Object.keys(contentPan.scrollProps()).length : -1,
    });
  });

  return <Text>{`detent=${detent ? detent.length() : "none"}`}</Text>;
}

const HANDOFF_ROWS = 50;

/**
 * The sheet the handoff assertions drive: `handoff` rests at the 180-point
 * snap (partial detent, frozen body); `handoff-full`, `handoff-locked` and
 * `pan-gate` have no snap points, so the sheet opens at the full detent and
 * the Body scrolls once `atTop` allows the claim predicates to matter.
 * `body-touch` is a fixed strip at the top of the scroll content: `app.drag`
 * lands on a selector's middle, and the strip's middle stays inside the
 * 180-point clip where the Scroll's own middle would not.
 */
function HandoffCase() {
  const variant = String(host.params.case ?? "handoff");
  const partial = variant === "handoff";
  const dismissable = variant !== "handoff-locked";

  return (
    <Sheet
      defaultOpen
      isDismissable={dismissable}
      snapPoints={partial ? [180] : undefined}
      onOpenChange={probe("openChange")}
      onClose={probe("close")}
    >
      <Sheet.Backdrop>
        <Sheet.Content testID="content">
          <Sheet.Dialog aria-label="Handoff sheet" testID="dialog">
            <Sheet.Handle testID="handle" />
            <Sheet.Body testID="body" onScroll={probe("bodyScroll")}>
              <DetentProbe />
              <View testID="body-touch" class="h-24 w-full">
                <Text>touch area</Text>
              </View>
              {Array.from({ length: HANDOFF_ROWS }, (_, index) => (
                <Text>{`Item ${index}`}</Text>
              ))}
            </Sheet.Body>
          </Sheet.Dialog>
        </Sheet.Content>
      </Sheet.Backdrop>
    </Sheet>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Cases table
 * -----------------------------------------------------------------------------------------------*/

function Fixture() {
  const name = String(host.params.case ?? "");

  if (name === "forward" || name === "back" || name === "cancel") {
    return <AnimationApp />;
  }

  return (
    <Scoped>{PAN_CASES.has(name) ? <PanCase /> : <HandoffCase />}</Scoped>
  );
}

mount(Fixture);
