import { effect, host, mount, signal, Text, View } from "nsh";
import type { JSX } from "nsh";
import { Dialog } from "nsh/base";
import {
  Button,
  Dropdown,
  EnvironmentScope,
  Label,
  PressableFeedbackContext,
} from "@heroui/react";
import type {
  EnvironmentDensity,
  EnvironmentInput,
  EnvironmentWidth,
  MenuItemRenderProps,
} from "@heroui/react";
import { SheetContentPanContext } from "../src/components/sheet/create-sheet-detent";
import { probe } from "@scenario/probe";

/*
 * NSH-only fixture for the Dropdown unit (port sheet 4b).
 *
 * The shared scenarios cover the stories. These cases cover what a shared
 * scenario cannot place: the trigger's focus events (T-009), the controlled
 * isOpen channel together with a modal-level overlay (T-006 / T-008), and the
 * handoff to that overlay (T-005 / T-007 / T-013).
 *
 * Modal, AlertDialog and Drawer are not in this batch (port sheet section 5),
 * so every modal-level host is the landed nsh/base `Dialog`. It stands in for
 * the layer, not for the component: the cases keep only the dropdown half of
 * the upstream assertions (the popover is gone, its row text is gone) and drop
 * the `dialog` / `alertdialog` role assertions the port sheet names.
 *
 * Cases (`host.params.case`):
 *
 *   default           DropdownFixture: three rows, action + trigger focus probes
 *   modal-handoff     select "Open modal" opens a Dialog in the same action
 *   dialog-handoff    controlled isOpen closed in onAction, Dialog opens (T-006/T-008)
 *   drawer-handoff    select "Open drawer" opens a Dialog in the same action
 *   inside-dialog     a Dropdown inside an open Dialog; its row still acts (T-013)
 *   long-press-button `trigger="longPress"` with a Button trigger (X-006)
 *   long-press-trigger the same mode on the `Dropdown.Trigger` path (X-006)
 *
 * Mobile layer (adapt sheet A-012): every case mounts inside `Scoped`,
 * which feeds `host.params.input` / `width` / `density` into an
 * `EnvironmentScope` (absent = the host baseline — never a bare fragment,
 * the popover unit's exit-hold measurement). `host.params.presentation`
 * ∈ "auto"|"panel"|"sheet" pins `Dropdown.Popover`'s carrier (absent lets
 * the component resolve it); `nonmodal` / `kbDismiss` / `retained` /
 * `narrow` / `disabled` / `pending` / `skip` / `hide` / `select` / `items`
 * / `open` parameterize the rest (see the mobile section below). Host
 * events `dropdown.close` / `dropdown.reopen` / `ctx.sample` /
 * `dropdown.addRow` drive the open state, the on-demand channel sample
 * and the reactive `items` path.
 *
 * The mobile cases (adapt sheet A-012) are selected the same way:
 *
 *   mobile            real `Dropdown.Trigger` (`id:dd-trigger`, `narrow`
 *                     shrinks its child under 44pt) + `Dropdown.Popover`
 *                     (`id:dd-pop`, derived `dd-pop-panel`/`dd-pop-sheet`
 *                     carrier probes) parameterized by `presentation` /
 *                     `nonmodal` / `kbDismiss` / `retained`, a `Dropdown.Menu`
 *                     of three rows with `onAction`/`onOpenChange` probes,
 *                     and the seam probes (`ctx`/`ctx-pressed`/`ctx-channels`,
 *                     `pan`, `layout`, `events`)
 *   mobile-submenu    the same root layer plus a `Dropdown.SubmenuTrigger`
 *                     whose popover carries `id:dd-sub` (`dd-sub-panel`/
 *                     `dd-sub-sheet` probes); the trigger row's render prop
 *                     reports `isOpen` as text so `aria-expanded` is readable
 *   context-menu      `trigger="contextMenu"` mode, for the M-015 baseline
 *   standalone        `Dropdown.Popover` with `defaultOpen` and no Root —
 *                     the `ownsState` half of the baseline sample
 *   no-close-on-select `shouldCloseOnSelect={false}` on the menu
 *
 * `host.params.input` / `host.params.width` / `host.params.density` inject an
 * `EnvironmentScope` over the whole case (`input` ∈ "pointer"|"touch",
 * `width` ∈ "compact"|"regular", `density` a preset name; absent = host
 * baseline). `Scoped` always mounts, never a bare fragment: the popover unit
 * measured a fragment passthrough breaking the exit-hold unmount. `items`
 * switches the menu to the `items` data path; `hide` gates a row behind
 * `<If>` (the unmounted-key / orphan half of the F-consumption check).
 * `dropdown.close` / `dropdown.reopen` drive the open state from outside.
 *
 * It sits next to harness/nsh.json on purpose: NSH takes the entry's own
 * directory as the app's root, so an entry under harness/tests/... finds no
 * nsh.json and loses the `@heroui/react` alias and the theme.
 */

/* -------------------------------------------------------------------------------------------------
 * DropdownFixture
 * -----------------------------------------------------------------------------------------------*/

function DefaultCase() {
  return (
    <View class="items-start gap-2 p-4">
      <Dropdown>
        <Dropdown.Trigger
          aria-label="Menu"
          onFocus={probe("triggerFocus")}
          onBlur={probe("triggerBlur")}
        >
          Actions
        </Dropdown.Trigger>
        <Dropdown.Popover>
          <Dropdown.Menu onAction={probe("onAction")}>
            <Dropdown.Item id="new-file" textValue="New file">
              <Label>New file</Label>
            </Dropdown.Item>
            <Dropdown.Item id="copy-link" textValue="Copy link">
              <Label>Copy link</Label>
            </Dropdown.Item>
            <Dropdown.Item id="delete-file" textValue="Delete file">
              <Label>Delete file</Label>
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * LongPress: both trigger paths, for the Alt activation keys (X-006)
 * -----------------------------------------------------------------------------------------------*/

/** `trigger="longPress"` with a Button trigger, the upstream LongPressTrigger story. */
function LongPressButtonCase() {
  return (
    <View class="items-start gap-2 p-4">
      <Dropdown trigger="longPress">
        <Button aria-label="Menu" variant="secondary">
          Long Press
        </Button>
        <Dropdown.Popover>
          <Dropdown.Menu onAction={probe("onAction")}>
            <Dropdown.Item id="new-file" textValue="New file">
              <Label>New file</Label>
            </Dropdown.Item>
            <Dropdown.Item id="open-file" textValue="Open file">
              <Label>Open file</Label>
            </Dropdown.Item>
            <Dropdown.Item id="delete-file" textValue="Delete file">
              <Label>Delete file</Label>
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    </View>
  );
}

/** The same long-press mode with `Dropdown.Trigger` as the trigger path. */
function LongPressTriggerCase() {
  return (
    <View class="items-start gap-2 p-4">
      <Dropdown trigger="longPress">
        <Dropdown.Trigger aria-label="Menu">Long Press</Dropdown.Trigger>
        <Dropdown.Popover>
          <Dropdown.Menu onAction={probe("onAction")}>
            <Dropdown.Item id="new-file" textValue="New file">
              <Label>New file</Label>
            </Dropdown.Item>
            <Dropdown.Item id="open-file" textValue="Open file">
              <Label>Open file</Label>
            </Dropdown.Item>
            <Dropdown.Item id="delete-file" textValue="Delete file">
              <Label>Delete file</Label>
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Handoffs: an item opens a modal-level overlay in the same action
 * -----------------------------------------------------------------------------------------------*/

/** Uncontrolled dropdown whose item opens a Dialog in the same action (T-005 / T-007). */
function HandoffCase(props: { row: string; dialogText: string }) {
  const opened = signal(false);

  return (
    <View class="items-start gap-2 p-4">
      <Dropdown>
        <Dropdown.Trigger aria-label="Menu">Actions</Dropdown.Trigger>
        <Dropdown.Popover>
          <Dropdown.Menu
            onAction={() => {
              probe("onAction")();
              opened.set(true);
            }}
          >
            <Dropdown.Item id="open" textValue={props.row}>
              <Label>{props.row}</Label>
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>

      <Dialog open={opened()}>
        <View class="items-start gap-2 p-4">
          <Text>{props.dialogText}</Text>
          <Button>Inside action</Button>
        </View>
      </Dialog>
    </View>
  );
}

/** Controlled dropdown closed inside `onAction`, with a Dialog opened in the same action (T-006 / T-008). */
function ControlledHandoffCase() {
  const menuOpen = signal(false);
  const dialogOpen = signal(false);

  return (
    <View class="items-start gap-2 p-4">
      <Dropdown isOpen={menuOpen()} onOpenChange={(isOpen: boolean) => menuOpen.set(isOpen)}>
        <Dropdown.Trigger aria-label="Menu">Actions</Dropdown.Trigger>
        <Dropdown.Popover>
          <Dropdown.Menu
            onAction={() => {
              probe("onAction")();
              menuOpen.set(false);
              dialogOpen.set(true);
            }}
          >
            <Dropdown.Item id="delete" textValue="Delete project">
              <Label>Delete project</Label>
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>

      <Dialog open={dialogOpen()}>
        <View class="items-start gap-2 p-4">
          <Text>Confirm deletion</Text>
          <Text>This action cannot be undone.</Text>
        </View>
      </Dialog>
    </View>
  );
}

/** A Dropdown inside an open Dialog (T-013). */
function InsideDialogCase() {
  const dialogOpen = signal(false);

  return (
    <View class="items-start gap-2 p-4">
      <Button onPress={() => dialogOpen.set(true)}>Open modal</Button>

      <Dialog
        open={dialogOpen()}
        onOpenChange={(event: { open: boolean }) => {
          if (!event.open) {
            dialogOpen.set(false);
          }
        }}
      >
        <View class="items-start gap-2 p-4">
          <Text>Modal with dropdown</Text>
          <Dropdown>
            <Dropdown.Trigger aria-label="Menu">Actions</Dropdown.Trigger>
            <Dropdown.Popover>
              <Dropdown.Menu onAction={probe("onAction")}>
                <Dropdown.Item id="rename" textValue="Rename">
                  <Label>Rename</Label>
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </View>
      </Dialog>
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * EnvironmentScope wrapper (A-012)
 * -----------------------------------------------------------------------------------------------*/

function Scoped(props: { children?: JSX.Element }) {
  const input = host.params.input;
  const width = host.params.width;
  const density = host.params.density;

  return (
    <EnvironmentScope
      input={input === undefined ? undefined : (String(input) as EnvironmentInput)}
      width={width === undefined ? undefined : (String(width) as EnvironmentWidth)}
      density={
        density === undefined ? undefined : (String(density) as EnvironmentDensity)
      }
    >
      {props.children}
    </EnvironmentScope>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Mobile seam probes (A-012)
 * -----------------------------------------------------------------------------------------------*/

type LayoutEvent = {
  bounds: {
    origin: { x: number; y: number };
    size: { width: number; height: number };
  };
};

/** A named view's `onLayout` box, the only observable input to the hitSlop formula. */
function boxProbe(name: string) {
  return (event: LayoutEvent) =>
    probe("layout")({
      name,
      width: event.bounds.size.width,
      height: event.bounds.size.height,
    });
}

/** The live `PressableFeedbackContext` of the mounted trigger seam. */
let triggerCtx: ReturnType<typeof PressableFeedbackContext> | null = null;

/** Reports the trigger seam's environment half the moment it changes. */
function CtxProbe() {
  const ctx = PressableFeedbackContext();
  const report = probe("ctx");
  const reportPressed = probe("ctx-pressed");

  effect(() => {
    triggerCtx = ctx;
  });

  effect(() => {
    report({
      enabled: ctx.enabled(),
      hitSlop: ctx.hitSlop() ?? null,
    });
  });

  effect(() => {
    reportPressed({ seam: ctx.isPressed() });
  });

  return null;
}

/* On-demand channel read for the negative half: a gated press never raises
 * the seam's `isPressed` edge, so `ctx-pressed` alone cannot prove the
 * channels stayed at rest — `ctx-channels` samples them after the press,
 * driven by `host.send("ctx.sample")` (combo-box's convention). */
function sampleChannels() {
  const report = probe("ctx-channels");
  const c = triggerCtx;
  if (c === null) {
    return;
  }
  void c.pressed.getValue().then((pressed) => {
    void c.scale.getValue().then((scale) => {
      report({
        seamPressed: c.isPressed(),
        pressed,
        scale,
        origin: c.pressOrigin(),
        hitSlop: c.hitSlop() ?? null,
        bounds: c.bounds(),
        enabled: c.enabled(),
      });
    });
  });
}

/* Reports the sheet carrier's content-pan context (A-002's panKeys/scrollKeys
 * convention): `SheetDialog` mounts its `panHandlers`/`scrollProps` under the
 * `SheetContentPanContext` it provides; under the default pointer environment
 * the handlers resolve to an empty object, so `panKeys: 0` proves no gesture
 * path exists. `-1` means no sheet carrier mounted at all (the panel branch
 * has no `SheetDialog`). */
function PanProbe() {
  const contentPan = SheetContentPanContext();
  const report = probe("pan");

  effect(() => {
    report({
      panKeys: contentPan ? Object.keys(contentPan.panHandlers()).length : -1,
      scrollKeys: contentPan ? Object.keys(contentPan.scrollProps()).length : -1,
    });
  });

  return null;
}

/* -------------------------------------------------------------------------------------------------
 * mobile case: the parameterized trigger + carrier shape (A-012)
 * -----------------------------------------------------------------------------------------------*/

const MOBILE_ITEMS = [
  { id: "new-file", name: "New file" },
  { id: "copy-link", name: "Copy link" },
  { id: "delete-file", name: "Delete file" },
];

/** The `✓` text the `selectedOptions` tester counts: `Dropdown.ItemIndicator`'s
 * render prop reports `isSelected`, the built-in check being a View `nsh/test`
 * cannot read (port sheet 4b's convention). */
function CheckRow(props: { id: string; name: string }) {
  return (
    <Dropdown.Item id={props.id} textValue={props.name}>
      <Dropdown.ItemIndicator>
        {(values: MenuItemRenderProps) =>
          values.isSelected() ? <Text>✓</Text> : null
        }
      </Dropdown.ItemIndicator>
      <Label>{props.name}</Label>
    </Dropdown.Item>
  );
}

/** The `hide` param gates the first row: a never-mounted key in the
 * collection is the unmounted half of the F-consumption check (M-016). */
function MobileRows() {
  const hidden = String(host.params.hide ?? "");

  return (
    <>
      <If when={hidden !== "new-file"}>
        <CheckRow id="new-file" name="New file" />
      </If>
      <CheckRow id="copy-link" name="Copy link" />
      <CheckRow id="delete-file" name="Delete file" />
    </>
  );
}

function MobileCase() {
  const open = signal(String(host.params.open ?? "") === "1");
  const onChange = probe("openChange");
  const events = probe("events");
  const action = probe("onAction");

  /* The seam state at the event's own moment: `feedback.pressDown` runs
   * before `props.onPressDown` and `feedback.pressUp` before `props.onPressUp`
   * inside the trigger, so `down` records `seam:true` and `up`/`press`
   * `seam:false` — the full round-trip even where the host collapses the
   * phases into one gesture turn and a reactive probe would only ever see
   * the settle state (the web batching gap menu-item registers). */
  const reportEvent = (ev: string) =>
    events({ ev, seam: triggerCtx?.isPressed() ?? null });

  // The `items` data path's rows are reactive: `dropdown.addRow` appends an
  // entry the collection has never seen (the orphan half of M-016's check),
  // and the mounted `<Each>` picks it up.
  const rows = signal(MOBILE_ITEMS);

  host.on("dropdown.close", () => open.set(false));
  host.on("dropdown.reopen", () => open.set(true));
  host.on("ctx.sample", () => sampleChannels());
  host.on("dropdown.addRow", () =>
    rows.update((list) => [...list, { id: "orphan", name: "Orphan row" }]),
  );

  const narrow = String(host.params.narrow ?? "") === "1";
  const nonModal = String(host.params.nonmodal ?? "") === "1";
  const kbDismiss = String(host.params.kbDismiss ?? "") === "1";
  const retained = String(host.params.retained ?? "") === "1";
  const disabled = String(host.params.disabled ?? "") === "1";
  const pending = String(host.params.pending ?? "") === "1";
  const items = String(host.params.items ?? "") === "1";
  const noClose = String(host.params.case ?? "") === "no-close-on-select";
  const select = String(host.params.select ?? "") === "1";
  const selected = signal<unknown>(["copy-link"]);
  const selectionChange = probe("selectionChange");
  const presentation = String(host.params.presentation ?? "");

  return (
    <Dropdown
      isOpen={open()}
      onOpenChange={(next: boolean) => {
        onChange(next);
        open.set(next);
      }}
      isDisabled={disabled || undefined}
    >
      <Dropdown.Trigger
        testID="dd-trigger"
        isDisabled={disabled || undefined}
        isPending={pending || undefined}
        onPress={() => reportEvent("press")}
        onPressDown={() => reportEvent("down")}
        onPressUp={() => reportEvent("up")}
        onLongPress={() => reportEvent("longPress")}
        onHoverStart={() => reportEvent("hoverStart")}
        onHoverEnd={() => reportEvent("hoverEnd")}
        onHoverChange={(next: boolean) => reportEvent(next ? "hoverOn" : "hoverOff")}
        onMouseEnter={() => reportEvent("mouseEnter")}
        onMouseLeave={() => reportEvent("mouseLeave")}
      >
        {(values: { isHovered: () => boolean }) => (
          <>
            {narrow ? (
              <View class="w-10 items-center" onLayout={boxProbe("trigger-box")}>
                <Text>+</Text>
              </View>
            ) : (
              <View class="min-h-11 p-3" onLayout={boxProbe("trigger-box")}>
                <Text>Actions</Text>
              </View>
            )}
            <Text>{values.isHovered() ? "trigger-hovered" : "trigger-idle"}</Text>
            <CtxProbe />
          </>
        )}
      </Dropdown.Trigger>
      <Dropdown.Popover
        testID="dd-pop"
        presentation={
          presentation === "" ? undefined : (presentation as "auto" | "panel" | "sheet")
        }
        isNonModal={nonModal || undefined}
        isKeyboardDismissDisabled={kbDismiss || undefined}
        isExiting={retained || undefined}
        shouldSkipAnimation={
          String(host.params.skip ?? "") === "1" ? true : undefined
        }
        onLayout={boxProbe("pop")}
      >
        <PanProbe />
        <Dropdown.Menu
          onLayout={boxProbe("menu")}
          onAction={(key: unknown) => action(key)}
          selectionMode={select ? "single" : undefined}
          selectedKeys={select ? (selected() as never) : undefined}
          onSelectionChange={(value: unknown) => {
            selectionChange(value);
            selected.set(value);
          }}
          shouldCloseOnSelect={noClose ? false : undefined}
          items={items ? rows() : undefined}
        >
          {items
            ? (item: { id: string; name: string }) => (
                <CheckRow id={item.id} name={item.name} />
              )
            : <MobileRows />}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}

/* -------------------------------------------------------------------------------------------------
 * mobile-submenu case: a root layer plus one submenu popover (A-012)
 * -----------------------------------------------------------------------------------------------*/

function MobileSubmenuCase() {
  const open = signal(false);
  const onChange = probe("openChange");
  const action = probe("onAction");

  host.on("dropdown.close", () => open.set(false));
  host.on("dropdown.reopen", () => open.set(true));
  host.on("ctx.sample", () => sampleChannels());

  const presentation = String(host.params.presentation ?? "");

  const carrier = () =>
    presentation === "" ? undefined : (presentation as "auto" | "panel" | "sheet");

  return (
    <Dropdown
      isOpen={open()}
      onOpenChange={(next: boolean) => {
        onChange(next);
        open.set(next);
      }}
    >
      <Dropdown.Trigger testID="dd-trigger">
        <View class="min-h-11 p-3">
          <Text>Actions</Text>
        </View>
      </Dropdown.Trigger>
      <Dropdown.Popover testID="dd-pop" presentation={carrier()}>
        <PanProbe />
        <Dropdown.Menu onAction={(key: unknown) => action(key)}>
          <Dropdown.Item id="new-file" textValue="New file">
            <Label>New file</Label>
          </Dropdown.Item>
          <Dropdown.SubmenuTrigger>
            <Dropdown.Item id="share" textValue="Share">
              {(values: MenuItemRenderProps) => (
                <>
                  <Label>Share</Label>
                  <Text>{values.isOpen() ? "sub-expanded" : "sub-collapsed"}</Text>
                </>
              )}
            </Dropdown.Item>
            <Dropdown.Popover
              testID="dd-sub"
              presentation={carrier()}
              onLayout={boxProbe("sub-scroll")}
              className={(values: { placement: () => unknown }) => {
                probe("subpos")({ placement: values.placement() });
                return "";
              }}
            >
              <Dropdown.Menu onAction={(key: unknown) => action(key)}>
                <Dropdown.Item id="share-x" textValue="Share to X">
                  <Label>Share to X</Label>
                </Dropdown.Item>
                <Dropdown.Item id="share-mail" textValue="Share by mail">
                  <Label>Share by mail</Label>
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown.SubmenuTrigger>
          <Dropdown.Item id="delete-file" textValue="Delete file">
            <Label>Delete file</Label>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}

/* -------------------------------------------------------------------------------------------------
 * context-menu / standalone / no-close-on-select cases
 * -----------------------------------------------------------------------------------------------*/

function ContextMenuCase() {
  return (
    <View class="items-start gap-2 p-4">
      <Dropdown trigger="contextMenu">
        <Dropdown.Trigger
          testID="dd-trigger"
          aria-label="Menu"
          onContextMenu={probe("contextMenu")}
        >
          <View class="min-h-11 p-3">
            <Text>Actions</Text>
          </View>
        </Dropdown.Trigger>
        <Dropdown.Popover testID="dd-pop">
          <Dropdown.Menu onAction={probe("onAction")}>
            <Dropdown.Item id="new-file" textValue="New file">
              <Label>New file</Label>
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    </View>
  );
}

function StandaloneCase() {
  return (
    <Dropdown.Popover testID="dd-pop" defaultOpen onOpenChange={probe("openChange")}>
      <Dropdown.Menu onAction={probe("onAction")}>
        <Dropdown.Item id="standalone-row" textValue="Standalone row">
          <Label>Standalone row</Label>
        </Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown.Popover>
  );
}

function Case() {
  const name = String(host.params.case ?? "default");

  if (name === "mobile" || name === "no-close-on-select") {
    return (
      <View class="flex-1 items-start gap-4 bg-background p-6">
        {/* The off-trigger surface: M-013's leave target and M-007's outside
            press — a sized, pressable view (a zero-size view is not a step
            target). */}
        <View testID="dd-outside" class="h-4 w-4" onPress={() => undefined} />
        <Scoped>
          <MobileCase />
        </Scoped>
      </View>
    );
  }

  if (name === "mobile-submenu") {
    return (
      <View class="flex-1 items-start gap-4 bg-background p-6">
        <Scoped>
          <MobileSubmenuCase />
        </Scoped>
      </View>
    );
  }

  if (name === "context-menu") {
    return (
      <Scoped>
        <ContextMenuCase />
      </Scoped>
    );
  }

  if (name === "standalone") {
    return (
      <Scoped>
        <StandaloneCase />
      </Scoped>
    );
  }

  if (name === "modal-handoff") {
    return <HandoffCase dialogText="Modal from dropdown" row="Open modal" />;
  }

  if (name === "drawer-handoff") {
    return <HandoffCase dialogText="Drawer from dropdown" row="Open drawer" />;
  }

  if (name === "dialog-handoff") {
    return <ControlledHandoffCase />;
  }

  if (name === "long-press-button") {
    return <LongPressButtonCase />;
  }

  if (name === "long-press-trigger") {
    return <LongPressTriggerCase />;
  }

  if (name === "inside-dialog") {
    return <InsideDialogCase />;
  }

  return <DefaultCase />;
}

mount(Case);
