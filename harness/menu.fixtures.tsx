import { effect, host, mount, platform, signal, Text, View } from "nsh";
import type { JSX } from "nsh";
import {
  Button,
  Description,
  EnvironmentScope,
  Header,
  Label,
  Menu,
  PressableFeedbackContext,
} from "@heroui/react";
import type {
  PressableFeedbackContextValue,
  SelectionValue,
} from "@heroui/react";
import { MenuContext } from "../src/components/menu/menu-context";
import { probe } from "@scenario/probe";

/*
 * NSH-only fixture for the Menu unit (port sheet 4b).
 *
 * HeroUI's own test wraps the Menu in `MenuTrigger` + `Popover`; this unit has
 * neither (they belong to Dropdown), so a button and a conditionally mounted
 * Menu stand in for them, and `onClose` unmounts it. Every case is selected
 * with `host.params.case`:
 *
 *   log                trigger + Menu, three rows, action / selection / close
 *                      probes (T-001, T-002)
 *   escape             the same with autoFocus, action probe (T-003)
 *   section            Section + Header + two rows, action probe (T-004)
 *   single-log         single selection with probes and ✓ markers
 *   multiple-log       multiple selection with probes and ✓ markers
 *   controlled         the parent holds selectedKeys and ignores changes;
 *                      testID="force" replaces the selection from outside
 *   default-selected   single, defaultSelectedKeys = {2}
 *   group-selection    two Sections with their own single selection, to prove
 *                      the Section manager is independent of the Menu
 *   submenu            aria-haspopup / aria-expanded, the SubmenuIndicator and
 *                      a row that prints hasSubmenu / isOpen from render props
 *   danger-indicator   variant="danger" with the checkmark, the dot and the
 *                      submenu chevron
 *   disabled           disabledKeys = {2} plus one row with isDisabled
 *   empty              renderEmptyState
 *   typeahead          One / Two / Three, autoFocus, a `*` marker on the
 *                      focused row; the test supplies the manual clock
 *   items              the `items` prop with a function child
 *   idless             two static items with no id / value / textValue, whose
 *                      keys must still differ (regression X-001)
 *   keyboard-close     autoFocus, selectionMode from `params.mode`, onClose
 *                      and onAction probes only (regression X-002)
 *
 * Rows print `✓` from `Menu.ItemIndicator`'s render prop because the built-in
 * checkmark and dot carry no text and `nsh test` counts text (port sheet 4b).
 *
 * It sits next to harness/nsh.json on purpose: NSH takes the entry's own
 * directory as the app's root, so an entry under harness/tests/... finds no
 * nsh.json and loses the `@heroui/react` alias and the theme.
 */

function selectionArgs(keys: "all" | Iterable<unknown>): unknown {
  return keys === "all" ? "all" : Array.from(keys);
}

function onSelectionChange(keys: "all" | Iterable<unknown>): void {
  probe("selectionChange")(selectionArgs(keys));
}

function sectionSelectionChange(keys: "all" | Iterable<unknown>): void {
  probe("sectionSelection")(selectionArgs(keys));
}

/* -------------------------------------------------------------------------------------------------
 * Rows
 * -----------------------------------------------------------------------------------------------*/

function Row(props: {
  id: string;
  label: string;
  marker?: string;
  variant?: "default" | "danger";
  disabled?: boolean;
  description?: string;
}) {
  return (
    <Menu.Item
      id={props.id}
      testID={props.marker ?? `item-${props.id}`}
      textValue={props.label}
      variant={props.variant}
      isDisabled={props.disabled}
    >
      <Menu.ItemIndicator>
        {(values) => <Text>{values.isSelected() ? "✓" : ""}</Text>}
      </Menu.ItemIndicator>
      <Label>{props.label}</Label>
      {props.description ? <Description>{props.description}</Description> : null}
    </Menu.Item>
  );
}

const ITEMS: { id: string; label: string }[] = [
  { id: "1", label: "One" },
  { id: "2", label: "Two" },
  { id: "3", label: "Three" },
];

function Rows() {
  return ITEMS.map((item) => <Row id={item.id} label={item.label} />);
}

/* -------------------------------------------------------------------------------------------------
 * A trigger that mounts the menu, the stand-in for MenuTrigger + Popover
 * -----------------------------------------------------------------------------------------------*/

function TriggeredCase(props: { autoFocus?: boolean }) {
  const opened = signal(false);

  return (
    <View class="w-64 items-start gap-2">
      <Button testID="menu-trigger" aria-label="Menu" onPress={() => opened.set(true)}>
        Actions
      </Button>
      <If when={opened()}>
        <Menu
          aria-label="Actions"
          autoFocus={props.autoFocus}
          onAction={probe("onAction")}
          onClose={() => {
            probe("onClose")();
            opened.set(false);
          }}
          onSelectionChange={onSelectionChange}
        >
          <Menu.Item id="new-file" textValue="New file">
            <Label>New file</Label>
          </Menu.Item>
          <Menu.Item id="copy-link" textValue="Copy link">
            <Label>Copy link</Label>
          </Menu.Item>
          <Menu.Item id="delete-file" textValue="Delete file">
            <Label>Delete file</Label>
          </Menu.Item>
        </Menu>
      </If>
    </View>
  );
}

function SectionCase() {
  return (
    <View class="w-64">
      <Menu aria-label="File actions" onAction={probe("onAction")}>
        <Menu.Section>
          <Header>File</Header>
          <Menu.Item id="new-file" textValue="New file">
            <Label>New file</Label>
          </Menu.Item>
          <Menu.Item id="copy-link" textValue="Copy link">
            <Label>Copy link</Label>
          </Menu.Item>
        </Menu.Section>
      </Menu>
    </View>
  );
}

function SelectionCase(props: { mode: "single" | "multiple" }) {
  return (
    <View class="w-64">
      <Menu
        aria-label="Options"
        selectionMode={props.mode}
        onSelectionChange={onSelectionChange}
      >
        <Rows />
      </Menu>
    </View>
  );
}

function ControlledCase() {
  const keys = signal<SelectionValue>(new Set(["1"]));

  return (
    <View class="w-64 items-start gap-2">
      <Menu
        aria-label="Options"
        selectionMode="single"
        selectedKeys={keys()}
        onSelectionChange={onSelectionChange}
      >
        <Rows />
      </Menu>
      <View testID="force" role="button" onPress={() => keys.set(new Set(["3"]))}>
        <Text>Force</Text>
      </View>
    </View>
  );
}

function DefaultSelectedCase() {
  return (
    <View class="w-64">
      <Menu aria-label="Options" selectionMode="single" defaultSelectedKeys={new Set(["2"])}>
        <Rows />
      </Menu>
    </View>
  );
}

function GroupSelectionCase() {
  const styles = signal<SelectionValue>(new Set(["bold"]));
  const alignment = signal<SelectionValue>(new Set(["left"]));

  return (
    <View class="w-64">
      <Menu aria-label="Formatting">
        <Menu.Section
          selectedKeys={styles()}
          selectionMode="single"
          onSelectionChange={(keys) => {
            sectionSelectionChange(keys);
            styles.set(keys);
          }}
        >
          <Header>Text Style</Header>
          <Menu.Item id="bold" testID="item-bold" textValue="Bold">
            <Menu.ItemIndicator>
              {(values) => <Text>{values.isSelected() ? "✓" : ""}</Text>}
            </Menu.ItemIndicator>
            <Label>Bold</Label>
          </Menu.Item>
          <Menu.Item id="italic" testID="item-italic" textValue="Italic">
            <Menu.ItemIndicator>
              {(values) => <Text>{values.isSelected() ? "✓" : ""}</Text>}
            </Menu.ItemIndicator>
            <Label>Italic</Label>
          </Menu.Item>
        </Menu.Section>
        <Menu.Section
          selectedKeys={alignment()}
          selectionMode="single"
          onSelectionChange={(keys) => {
            sectionSelectionChange(keys);
            alignment.set(keys);
          }}
        >
          <Header>Text Alignment</Header>
          <Menu.Item id="left" testID="item-left" textValue="Left">
            <Menu.ItemIndicator>
              {(values) => <Text>{values.isSelected() ? "✓" : ""}</Text>}
            </Menu.ItemIndicator>
            <Label>Left</Label>
          </Menu.Item>
          <Menu.Item id="center" testID="item-center" textValue="Center">
            <Menu.ItemIndicator>
              {(values) => <Text>{values.isSelected() ? "✓" : ""}</Text>}
            </Menu.ItemIndicator>
            <Label>Center</Label>
          </Menu.Item>
        </Menu.Section>
      </Menu>
    </View>
  );
}

function SubmenuCase() {
  return (
    <View class="w-64">
      <Menu aria-label="Share">
        <Menu.Item id="copy-link" textValue="Copy link">
          <Label>Copy link</Label>
        </Menu.Item>
        <Menu.Item
          id="share"
          textValue="Share"
          aria-expanded={true}
          aria-haspopup="menu"
        >
          <Label>Share</Label>
          <Menu.Item.SubmenuIndicator />
        </Menu.Item>
        <Menu.Item
          id="mail"
          textValue="Mail"
          aria-expanded={false}
          aria-haspopup="menu"
        >
          <Label>Mail</Label>
          <Menu.Item.SubmenuIndicator />
        </Menu.Item>
        <Menu.Item
          id="probe"
          textValue="Probe"
          aria-label="Probe"
          aria-expanded={true}
          aria-haspopup="menu"
        >
          {(values) => <Text>{`submenu=${values.hasSubmenu()} open=${values.isOpen()}`}</Text>}
        </Menu.Item>
      </Menu>
    </View>
  );
}

function DangerIndicatorCase() {
  return (
    <View class="w-64">
      <Menu
        aria-label="Danger"
        defaultSelectedKeys={new Set(["delete"])}
        selectionMode="single"
      >
        <Menu.Item id="delete" textValue="Delete" variant="danger">
          <Menu.ItemIndicator />
          <Label>Delete</Label>
        </Menu.Item>
        <Menu.Item id="move" textValue="Move" variant="danger">
          <Menu.ItemIndicator type="dot" />
          <Label>Move</Label>
        </Menu.Item>
        <Menu.Item
          id="share"
          textValue="Share"
          variant="danger"
          aria-expanded={false}
          aria-haspopup="menu"
        >
          <Menu.ItemIndicator />
          <Label>Share</Label>
          <Menu.Item.SubmenuIndicator />
        </Menu.Item>
      </Menu>
    </View>
  );
}

function DisabledCase() {
  return (
    <View class="w-64">
      <Menu aria-label="Options" disabledKeys={["2"]} onAction={probe("onAction")}>
        <Row id="1" label="One" />
        <Row id="2" label="Two" />
        <Row id="3" label="Three" disabled />
      </Menu>
    </View>
  );
}

function EmptyCase() {
  return (
    <View class="w-64">
      <Menu aria-label="Options" renderEmptyState={() => <Text>No actions</Text>} />
    </View>
  );
}

const DYNAMIC_ITEMS = [
  { id: "item-a", name: "Alpha" },
  { id: "item-b", name: "Beta" },
];

function ItemsCase() {
  return (
    <View class="w-64">
      <Menu aria-label="Items" items={DYNAMIC_ITEMS} onAction={probe("onAction")}>
        {(item) => (
          <Menu.Item id={item.id} textValue={item.name} aria-label={item.name}>
            <Label>{item.name}</Label>
          </Menu.Item>
        )}
      </Menu>
    </View>
  );
}

const TYPEAHEAD_ITEMS = [
  { id: "1", label: "One" },
  { id: "2", label: "Two" },
  { id: "3", label: "Three" },
];

function TypeaheadCase() {
  return (
    <View class="w-64">
      <Menu aria-label="Options" autoFocus>
        {TYPEAHEAD_ITEMS.map((item) => (
          <Menu.Item id={item.id} textValue={item.label} aria-label={item.label}>
            {(values) => <Text>{`${item.label}${values.isFocused() ? "*" : ""}`}</Text>}
          </Menu.Item>
        ))}
      </Menu>
    </View>
  );
}

/*
 * Regression X-001: two static items without an id, a value object or an index
 * must still get two different collection keys. Both rows print their own
 * selection marker under its own testID, so a shared key shows up as both rows
 * selected at once.
 */
function IdlessCase() {
  return (
    <View class="w-64">
      <Menu aria-label="Options" selectionMode="single">
        <Menu.Item testID="item-alpha" aria-label="Alpha">
          <Menu.ItemIndicator>
            {(values) => <Text>{values.isSelected() ? "✓" : ""}</Text>}
          </Menu.ItemIndicator>
          <Label>Alpha</Label>
        </Menu.Item>
        <Menu.Item testID="item-beta" aria-label="Beta">
          <Menu.ItemIndicator>
            {(values) => <Text>{values.isSelected() ? "✓" : ""}</Text>}
          </Menu.ItemIndicator>
          <Label>Beta</Label>
        </Menu.Item>
      </Menu>
    </View>
  );
}

/*
 * Regression X-002: the menu stays mounted after activation, so `onClose` is
 * counted instead of observed through an unmount, and `onAction` proves the key
 * did activate a row.
 */
function KeyboardCloseCase(props: { mode: "single" | "multiple" }) {
  return (
    <View class="w-64">
      <Menu
        aria-label="Close"
        autoFocus
        selectionMode={props.mode}
        onAction={probe("onAction")}
        onClose={probe("onClose")}
      >
        <Row id="1" label="One" />
        <Row id="2" label="Two" />
      </Menu>
    </View>
  );
}

function Case() {
  const name = String(host.params.case ?? "log");

  if (name === "log") {
    return <TriggeredCase />;
  }

  if (name === "escape") {
    return <TriggeredCase autoFocus />;
  }

  if (name === "section") {
    return <SectionCase />;
  }

  if (name === "single-log") {
    return <SelectionCase mode="single" />;
  }

  if (name === "multiple-log") {
    return <SelectionCase mode="multiple" />;
  }

  if (name === "controlled") {
    return <ControlledCase />;
  }

  if (name === "default-selected") {
    return <DefaultSelectedCase />;
  }

  if (name === "group-selection") {
    return <GroupSelectionCase />;
  }

  if (name === "submenu") {
    return <SubmenuCase />;
  }

  if (name === "danger-indicator") {
    return <DangerIndicatorCase />;
  }

  if (name === "disabled") {
    return <DisabledCase />;
  }

  if (name === "typeahead") {
    return <TypeaheadCase />;
  }

  if (name === "items") {
    return <ItemsCase />;
  }

  if (name === "idless") {
    return <IdlessCase />;
  }

  if (name === "keyboard-close") {
    return <KeyboardCloseCase mode={host.params.mode === "multiple" ? "multiple" : "single"} />;
  }

  if (name === "empty") {
    return <EmptyCase />;
  }

  /* Mobile cases (adapt-sheets/menu.md §2 A-011): the seam probes and the
   * f-collection cases, driven by the same `MenuContext` an owner would read.
   * All of them mount under `Scoped`, so `input`/`density` params inject an
   * `EnvironmentScope` (the tabs/breadcrumbs convention).
   *
   *   m-seam     three ProbeRows (c disabled) + the probe pair inside <Menu>
   *   m-narrow   one 36 pt-wide row for the hitSlop computation
   *   f-items    items collection, `hide`/`toggle` unmounted rows
   *   f-section  items + Section items, minted section keys
   *   f-override row textValue/isDisabled over datum fields + disabledKeys
   *   f-orphan   a row id matching no datum (tail append)
   *   f-dup      an item id colliding with a named section key (#N suffix)
   *   f-nokey    id-less items (positional keys, reorder identity claim)
   *   f-paged    20 rows in an h-40 root (page-key bounds) */
  if (name === "m-seam") {
    return <MobileSeamCase />;
  }

  if (name === "m-narrow") {
    return <MobileNarrowCase />;
  }

  if (name === "f-items") {
    return <MobileItemsMenu mode={param("mode") === "multiple" ? "multiple" : "single"} />;
  }

  if (name === "f-section") {
    return <MobileSectionMenu />;
  }

  if (name === "f-override") {
    return <MobileOverrideMenu />;
  }

  if (name === "f-orphan") {
    return <MobileOrphanMenu />;
  }

  if (name === "f-nokey") {
    return <MobileNoKeyMenu />;
  }

  if (name === "f-dup") {
    return <MobileDupMenu />;
  }

  if (name === "f-paged") {
    return <MobilePagedMenu />;
  }

  return <TriggeredCase />;
}

/** The probe pair an f-* / m-* case mounts under the menu root. `MenuContext`
 * reaches only the provider's subtree, so they cannot sit outside `<Menu>`;
 * for a static-children menu they are direct `<Menu>` children, and under
 * `items` they ride as sibling elements of the index-0 render output (the
 * render function's siblings are direct children of the menu root, the
 * `RegistryProbe` convention) — outside the `<If>` that hides the row, so a
 * `hide` param never unmounts the probes. */
function probeTail(): JSX.Element[] {
  return [<MenuProbeBar />, <MenuDataProbe />];
}

/* -------------------------------------------------------------------------------------------------
 * Mobile seam probes (adapt sheet §2 A-011)
 *
 * `nsh/test` cannot read a `PressableFeedbackContext` from outside a row, so
 * each probed row mounts `MenuCtxProbe`, the same shape the tabs fixture's
 * `TabCtxProbe` carries:
 *   `<slot>-pressed`  the gated `isPressed` edge (silent under pointer — that
 *                     silence IS the negative assertion, M-001)
 *   `<slot>-state`    every channel sampled on each edge, +600 ms and +1500 ms
 *   `<slot>-env`      the reactive gate, computed `hitSlop` and bounds
 * `hitSlop` serializes `undefined` as `null` — the seam's rest value.
 * -----------------------------------------------------------------------------------------------*/

const liveCtxs: Record<string, PressableFeedbackContextValue | null> = {};

function MenuCtxProbe(props: { slot: string }) {
  const ctx = PressableFeedbackContext();
  const reportPressed = probe(`${props.slot}-pressed`);
  const reportState = probe(`${props.slot}-state`);
  const reportEnv = probe(`${props.slot}-env`);

  effect(() => {
    liveCtxs[props.slot] = ctx;
  });

  effect(() => {
    reportEnv({
      enabled: ctx.enabled(),
      hitSlop: ctx.hitSlop() ?? null,
      bounds: ctx.bounds(),
      allDisabled: ctx.isAllAnimationsDisabled(),
    });
  });

  const sample = () => {
    void ctx.pressed.getValue().then((pressed) => {
      void ctx.scale.getValue().then((scale) => {
        void ctx.highlightOpacity.getValue().then((highlight) => {
          void ctx.rippleProgress.getValue().then((ripple) => {
            reportState({
              seamPressed: ctx.isPressed(),
              pressed,
              scale,
              highlight,
              ripple,
              origin: ctx.pressOrigin(),
              hitSlop: ctx.hitSlop() ?? null,
              bounds: ctx.bounds(),
              enabled: ctx.enabled(),
              allDisabled: ctx.isAllAnimationsDisabled(),
            });
          });
        });
      });
    });
  };

  effect(() => {
    const seam = ctx.isPressed();
    reportPressed(seam);
    setTimeout(sample, 600);
    setTimeout(sample, 1500);
  });

  return null;
}

/* On-demand channel read: a pointer press never raises the seam's `isPressed`
 * edge, so the edge probes alone cannot prove the channels stayed at rest —
 * `sampleCtx` samples them after the press instead (tabs convention). */
function sampleCtx(slot: string) {
  const report = probe(`${slot}-channels`);
  const c = liveCtxs[slot];

  if (c == null) {
    return;
  }

  void c.pressed.getValue().then((pressed) => {
    void c.scale.getValue().then((scale) => {
      void c.highlightOpacity.getValue().then((highlight) => {
        void c.rippleProgress.getValue().then((ripple) => {
          report({
            seamPressed: c.isPressed(),
            pressed,
            scale,
            highlight,
            ripple,
            origin: c.pressOrigin(),
            hitSlop: c.hitSlop() ?? null,
            enabled: c.enabled(),
          });
        });
      });
    });
  });
}

/* -------------------------------------------------------------------------------------------------
 * The seam-driving bar (A-011, the list-box `OwnerShim` convention)
 *
 * `MenuProbeBar` mounts as a sibling of the rows — the render function's
 * sibling elements are direct children of the menu root, so it sits inside
 * `MenuContext` without belonging to any row. Its buttons drive the context
 * members a fixture (or a future owner) reads: `rowRegistry`, `sendKey`,
 * `activateFocused` and the collection reads — the headless-Windows host gap
 * (no view focus) makes keymap-driven assertions impossible, so the seam is
 * exercised through the same entry the keymap bindings call.
 * -----------------------------------------------------------------------------------------------*/

function param(name: string): string {
  return String(host.params[name] ?? "");
}

function MenuProbeBar(props: { only?: string[] }) {
  const menu = MenuContext();

  if (!menu) {
    return null;
  }

  const probekey = param("probekey");

  const send = (id: string) => {
    if (id === "keys") {
      probe("keys")([...menu.list.collection().getKeys()]);
      return;
    }

    if (id === "node") {
      const node = menu.list.collection().getItem(probekey);
      probe("node")(
        node
          ? {
              type: node.type,
              key: node.key,
              textValue: node.textValue,
              disabled: node.disabled,
            }
          : null,
      );
      return;
    }

    if (id === "focused") {
      probe("focusedKey")(menu.selectionManager().focusedKey() ?? null);
      return;
    }

    if (id === "focuskey") {
      menu.selectionManager().setFocused(true);
      menu.selectionManager().setFocusedKey(probekey);
      probe("focusKey")(probekey);
      return;
    }

    if (id === "activate" || id === "activate-enter" || id === "activate-space") {
      menu.activateFocused(
        undefined,
        id === "activate-space" ? "Space" : "Enter",
      );
      probe("activate")("done");
      return;
    }

    if (id === "hasrow") {
      probe("hasRow")(menu.rowRegistry.has(probekey));
      return;
    }

    if (id === "row") {
      const handle = menu.rowRegistry.get(probekey);
      probe("row")({
        type: handle?.type ?? null,
        key: handle?.key ?? null,
        textValue: handle?.textValue?.() ?? null,
        disabled: handle?.disabled?.() ?? null,
        hasRef: handle?.ref?.() != null,
        hasActivate: handle?.activate != null,
        hasSubmenu: handle?.openSubmenu != null,
      });
      return;
    }

    if (id === "announce") {
      const handle = menu.rowRegistry.get(probekey);
      const node =
        handle == null || handle.type !== "item"
          ? menu.list.collection().getItem(probekey)
          : undefined;
      probe("announce")(handle?.textValue?.() ?? node?.textValue ?? null);
      return;
    }

    if (id.startsWith("nav-")) {
      menu.sendKey(id.slice(4));
      probe("sentKey")(id.slice(4));
      return;
    }
  };

  const allButtons = [
    "keys",
    "node",
    "focused",
    "focuskey",
    "activate",
    "activate-enter",
    "activate-space",
    "hasrow",
    "row",
    "announce",
    "nav-down",
    "nav-up",
    "nav-pageup",
    "nav-pagedown",
    "nav-home",
    "nav-end",
    "nav-d",
    "nav-x",
    "nav-b",
  ];

  // `only` trims the bar for height-limited menus (f-paged): the root's
  // fixed height clips views below the fold, and a clipped probe button is
  // "not pressable" to `app.press`.
  const buttons = props.only ?? allButtons;

  return (
    <View class="w-full flex-row flex-wrap" style={{ gap: 4 }}>
      {buttons.map((id) => (
        <View
          role="button"
          testID={id}
          class="p-1 bg-default"
          onPress={() => send(id)}
        >
          <Text>{id}</Text>
        </View>
      ))}
    </View>
  );
}

/* Renders `menu.list.collection()`'s flat node list into `data` on demand —
 * the `data` probe the sheet names (A-011). */
function MenuDataProbe() {
  const menu = MenuContext();

  if (!menu) {
    return null;
  }

  return (
    <View
      role="button"
      testID="data"
      class="p-1 bg-default"
      onPress={() =>
        probe("data")(
          [...menu.list.collection()].map((node) => ({
            type: node.type,
            key: node.key,
            textValue: node.textValue,
            disabled: node.disabled,
            level: node.level,
          })),
        )
      }
    >
      <Text>data</Text>
    </View>
  );
}

type LayoutEvent = {
  bounds: {
    origin: { x: number; y: number };
    size: { width: number; height: number };
  };
};

function boxProbe(name: string) {
  return (event: LayoutEvent) =>
    probe("layout")({
      name,
      x: event.bounds.origin.x,
      y: event.bounds.origin.y,
      width: event.bounds.size.width,
      height: event.bounds.size.height,
    });
}

/** The press/hover chain probes a probed row carries (M-003, M-004). */
function seamHandlers(id: string) {
  return {
    onPressStart: () => probe("events")({ row: id, kind: "start" }),
    onPressDown: () => probe("events")({ row: id, kind: "down" }),
    onPressChange: (isPressed: boolean) =>
      probe("events")({ row: id, kind: "chg", value: isPressed }),
    onPressUp: () => probe("events")({ row: id, kind: "up" }),
    onPressEnd: () => probe("events")({ row: id, kind: "end" }),
    onPress: () => probe("events")({ row: id, kind: "press" }),
    onHoverStart: () => probe("hover")({ row: id, kind: "start" }),
    onHoverEnd: () => probe("hover")({ row: id, kind: "end" }),
    onHoverChange: (isHovered: boolean) =>
      probe("hover")({ row: id, kind: "change", value: isHovered }),
    onMouseEnter: () => probe("hover")({ row: id, kind: "mouseenter" }),
    onMouseLeave: () => probe("hover")({ row: id, kind: "mouseleave" }),
    onFocusChange: (isFocused: boolean) =>
      probe("focusChange")({ row: id, value: isFocused }),
  };
}

/* -------------------------------------------------------------------------------------------------
 * `m-seam` — the B(项) assertion carrier (M-001 … M-004): three rows with
 * full event/hover probes, a disabled row for the enabled-gate half, render
 * props printed as text (`H*` hovered, `F*` focusedKey marker) and the ctx
 * probes. The probe pair mounts as direct `<Menu>` children — a static
 * children menu renders them under the root View inside `MenuContext` —
 * not inside a row: NSH presses do not bubble (R-006), but a sibling inside
 * a row would inflate that row's `onLayout` bounds and sit behind its
 * role/accessibility label. `ctx-sample` stays outside the menu entirely so
 * its press never reads as a row activation.
 * -----------------------------------------------------------------------------------------------*/

function ProbeRow(props: {
  id: string;
  label: string;
  disabled?: boolean;
}) {
  return (
    <Menu.Item
      id={props.id}
      testID={`row-${props.id}`}
      textValue={props.label}
      isDisabled={props.disabled}
      onLayout={boxProbe(`row-${props.id}`)}
      {...seamHandlers(props.id)}
    >
      {(values) => (
        <>
          <Text>{`${props.label}${values.isHovered() ? " H" : ""}${values.isFocused() ? " F" : ""}`}</Text>
          <MenuCtxProbe slot={`ctx-${props.id}`} />
        </>
      )}
    </Menu.Item>
  );
}

function MobileSeamCase() {
  return (
    <View class="w-64">
      <Menu
        aria-label="Seam"
        onAction={probe("onAction")}
        onClose={probe("onClose")}
        onSelectionChange={onSelectionChange}
        onLayout={boxProbe("menu-root")}
      >
        <ProbeRow id="a" label="Alpha" />
        <ProbeRow id="b" label="Beta" />
        <ProbeRow id="c" label="Charlie" disabled />
        <MenuProbeBar />
        <MenuDataProbe />
      </Menu>
      <View
        testID="ctx-sample"
        role="button"
        class="p-2"
        onPress={() => sampleCtx(param("ctx") || "ctx-a")}
      >
        <Text>ctx sample</Text>
      </View>
      <View testID="after" role="button" class="p-2" onPress={() => undefined}>
        <Text>After</Text>
      </View>
    </View>
  );
}

/* `m-narrow` — a width-limited row under the 44 pt touch minimum so the
 * seam's `hitSlop` computes a padding (M-002/M-004): `w-9` (36 pt) beats the
 * item base's `w-full` by append order. Height stays `min-h-9` under pointer
 * (36 pt → y slop) and `min-h-11` under touch. */
function MobileNarrowCase() {
  return (
    <View class="w-64">
      <Menu aria-label="Narrow" onLayout={boxProbe("menu-root")}>
        <Menu.Item
          id="n"
          testID="row-n"
          textValue="Narrow"
          className="w-9"
          onLayout={boxProbe("row-n")}
          {...seamHandlers("n")}
        >
          <Text>N</Text>
          <MenuCtxProbe slot="ctx-n" />
        </Menu.Item>
        <MenuProbeBar />
        <MenuDataProbe />
      </Menu>
      <View
        testID="ctx-sample"
        role="button"
        class="p-2"
        onPress={() => sampleCtx("ctx-n")}
      >
        <Text>ctx sample</Text>
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * f-* — the F(collection) assertion carriers (M-006 … M-012): the data side
 * holds the complete collection while `hide` keeps rows unmounted at mount
 * time (the `<If>`-in-`<Each>` host gap — a row that never mounted is the
 * honest "unmounted" state, the list-box convention).
 * -----------------------------------------------------------------------------------------------*/

const F_ITEMS = [
  { id: "1", name: "Alpha" },
  { id: "2", name: "Bravo" },
  { id: "3", name: "Charlie" },
  { id: "4", name: "Delta" },
  { id: "5", name: "Echo" },
];

function MobileItemsMenu(props: { mode: "single" | "multiple" }) {
  const hidden = signal<string[]>(param("hide") === "" ? [] : [param("hide")]);

  return (
    <View class="w-64">
      <Menu
        aria-label="F items"
        selectionMode={props.mode}
        onAction={probe("onAction")}
        onClose={probe("onClose")}
        onSelectionChange={onSelectionChange}
        items={F_ITEMS}
      >
        {(item, index) =>
          index === 0
            ? [
                <If when={!hidden().includes(item.id)}>
                  {() => (
                    <Menu.Item
                      id={item.id}
                      textValue={item.name}
                      aria-label={item.name}
                    >
                      <Label>{item.name}</Label>
                    </Menu.Item>
                  )}
                </If>,
                ...probeTail(),
              ]
            : [
                <If when={!hidden().includes(item.id)}>
                  {() => (
                    <Menu.Item
                      id={item.id}
                      textValue={item.name}
                      aria-label={item.name}
                    >
                      <Label>{item.name}</Label>
                    </Menu.Item>
                  )}
                </If>,
              ]
        }
      </Menu>
      <View
        testID="toggle"
        role="button"
        class="p-2"
        onPress={() => {
          hidden.set(hidden().length ? [] : [param("toggle")]);
          probe("toggle")(param("toggle"));
        }}
      >
        <Text>toggle</Text>
      </View>
    </View>
  );
}

const F_SECTION_ITEMS = [
  {
    name: "Fruits",
    items: [
      { id: "a", name: "Apple" },
      { id: "b", name: "Banana" },
    ],
  },
  {
    name: "Veggies",
    items: [
      { id: "c", name: "Carrot" },
      { id: "d", name: "Daikon" },
    ],
  },
];

function MobileSectionMenu() {
  return (
    <View class="w-64">
      <Menu
        aria-label="F sections"
        selectionMode="single"
        onAction={probe("onAction")}
        onSelectionChange={onSelectionChange}
        items={F_SECTION_ITEMS}
      >
        {(group, index) =>
          index === 0
            ? [
                <Menu.Section aria-label={group.name} items={group.items}>
                  {(item) => (
                    <Menu.Item
                      id={item.id}
                      textValue={item.name}
                      aria-label={item.name}
                    >
                      <Label>{item.name}</Label>
                    </Menu.Item>
                  )}
                </Menu.Section>,
                ...probeTail(),
              ]
            : [
                <Menu.Section aria-label={group.name} items={group.items}>
                  {(item) => (
                    <Menu.Item
                      id={item.id}
                      textValue={item.name}
                      aria-label={item.name}
                    >
                      <Label>{item.name}</Label>
                    </Menu.Item>
                  )}
                </Menu.Section>,
              ]
        }
      </Menu>
    </View>
  );
}

const F_OVERRIDE_ITEMS = [
  { id: "x" },
  { id: "y", name: "Wye", disabled: true },
  { id: "z", name: "Zulu" },
];

function MobileOverrideMenu() {
  const hidden = signal<string[]>(param("hide") === "" ? [] : [param("hide")]);

  return (
    <View class="w-64">
      <Menu
        aria-label="F override"
        selectionMode="single"
        disabledKeys={["z"]}
        onAction={probe("onAction")}
        onSelectionChange={onSelectionChange}
        items={F_OVERRIDE_ITEMS}
      >
        {(item, index) => {
          const row = (
            <If when={!hidden().includes(item.id)}>
              {() => (
                <Menu.Item
                  id={item.id}
                  textValue={item.id === "x" ? "Xray" : item.name}
                  aria-label={item.id === "x" ? "Xray" : item.name}
                  isDisabled={item.id === "y" ? false : undefined}
                >
                  <Label>{item.id === "x" ? "Xray" : item.name}</Label>
                </Menu.Item>
              )}
            </If>
          );

          return index === 0 ? [row, ...probeTail()] : row;
        }}
      </Menu>
      <View
        testID="toggle"
        role="button"
        class="p-2"
        onPress={() => {
          hidden.set(hidden().length ? [] : [param("toggle")]);
          probe("toggle")(param("toggle"));
        }}
      >
        <Text>toggle</Text>
      </View>
    </View>
  );
}

const F_ORPHAN_ITEMS = [
  { id: "1", name: "One" },
  { id: "2", name: "Two" },
];

function MobileOrphanMenu() {
  return (
    <View class="w-64">
      <Menu
        aria-label="F orphan"
        onAction={probe("onAction")}
        onSelectionChange={onSelectionChange}
        items={F_ORPHAN_ITEMS}
      >
        {(item, index) =>
          index === 0
            ? [
                <Menu.Item
                  id={item.id === "1" ? "orphan" : item.id}
                  textValue={item.name}
                  aria-label={item.name}
                >
                  <Label>{item.name}</Label>
                </Menu.Item>,
                /* A second orphan that claims the same key the first one
                   took: the `#N` suffix rule keeps both collection entries
                   (M-010). */
                item.id === "1" ? (
                  <Menu.Item id="orphan" textValue="Dup" aria-label="Dup">
                    <Label>Dup</Label>
                  </Menu.Item>
                ) : null,
                ...probeTail(),
              ]
            : [
                <Menu.Item
                  id={item.id === "1" ? "orphan" : item.id}
                  textValue={item.name}
                  aria-label={item.name}
                >
                  <Label>{item.name}</Label>
                </Menu.Item>,
              ]
        }
      </Menu>
    </View>
  );
}

const F_DUP_ITEMS = [
  {
    id: "s1",
    items: [
      { id: "i1", name: "First" },
      { id: "i2", name: "Second" },
    ],
  },
];

/* `f-dup` — an item row whose `id` collides with an already-merged key: the
 * section datum owns "s1", so the row can never claim it (sections never
 * take handles); it lands in the orphan pass, where the `#N` suffix keeps
 * its entry instead of letting `ListCollection` silently drop the colliding
 * key (M-010). Two same-key *rows* cannot produce it — the registry map
 * dedups handles by key before the merge ever sees them. */
function MobileDupMenu() {
  return (
    <View class="w-64">
      <Menu
        aria-label="F dup"
        onAction={probe("onAction")}
        onSelectionChange={onSelectionChange}
        items={F_DUP_ITEMS}
      >
        {(group, index) =>
          index === 0
            ? [
                <Menu.Section id={group.id} items={group.items}>
                  {(item) => (
                    <Menu.Item
                      id={item.id}
                      textValue={item.name}
                      aria-label={item.name}
                    >
                      <Label>{item.name}</Label>
                    </Menu.Item>
                  )}
                </Menu.Section>,
                <Menu.Item id="s1" textValue="Dup" aria-label="Dup">
                  <Label>Dup</Label>
                </Menu.Item>,
                ...probeTail(),
              ]
            : []
        }
      </Menu>
    </View>
  );
}

const F_NOKEY_ITEMS = [{ name: "Plain A" }, { name: "Plain B" }];

function MobileNoKeyMenu() {
  const items = signal(F_NOKEY_ITEMS);

  return (
    <View class="w-64">
      <Menu
        aria-label="F nokey"
        onAction={probe("onAction")}
        onSelectionChange={onSelectionChange}
        items={items()}
      >
        {(item, index) => {
          const row = (
            <Menu.Item textValue={item.name} aria-label={item.name}>
              <Label>{item.name}</Label>
            </Menu.Item>
          );

          return index === 0 ? [row, ...probeTail()] : row;
        }}
      </Menu>
      <View
        testID="reorder"
        role="button"
        class="p-2"
        onPress={() => {
          items.set([...items()].reverse());
          probe("reorder")("done");
        }}
      >
        <Text>reorder</Text>
      </View>
    </View>
  );
}

const F_PAGED_ITEMS = Array.from({ length: 20 }, (_, i) => ({
  id: String(i + 1),
  name: `Row ${i + 1}`,
}));

function MobilePagedMenu() {
  const hidden = signal<string[]>(param("hide") === "" ? [] : [param("hide")]);

  return (
    <View class="h-40 w-64">
      <Menu
        aria-label="F paged"
        className="h-40 w-full"
        onAction={probe("onAction")}
        items={F_PAGED_ITEMS}
      >
        {(item, index) => {
          const row = (
            <If when={!hidden().includes(item.id)}>
              {() => (
                <Menu.Item
                  id={item.id}
                  textValue={item.name}
                  aria-label={item.name}
                  className="h-10"
                >
                  <Label>{item.name}</Label>
                </Menu.Item>
              )}
            </If>
          );

          return index === 0
            ? [
                row,
                <MenuProbeBar
                  only={[
                    "keys",
                    "focused",
                    "focuskey",
                    "nav-pagedown",
                    "nav-pageup",
                    "nav-home",
                    "nav-end",
                  ]}
                />,
              ]
            : row;
        }}
      </Menu>
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * EnvironmentScope wrapper + entry
 * -----------------------------------------------------------------------------------------------*/

/**
 * `host.params.input` / `host.params.density` feed `EnvironmentScope`; an
 * absent param keeps the host-derived value, so a case opened without them
 * is the desktop-parity baseline. Wrapping every case lets the mobile tests
 * reopen the existing shapes under `input="touch"` (M-005's parity rows)
 * without a second fixture (the tabs/breadcrumbs convention).
 */
function Scoped(props: { children?: JSX.Element }) {
  const input = String(host.params.input ?? "");
  const density = String(host.params.density ?? "");

  return (
    <EnvironmentScope
      input={input === "touch" || input === "pointer" ? input : undefined}
      density={density === "compact" || density === "default" ? density : undefined}
    >
      {props.children}
    </EnvironmentScope>
  );
}

function Fixture() {
  // The host OS as the app sees it — `"web"` on `--target web` even when the
  // test opens with a desktop `platform` — so tests can tell which gesture
  // tails the host actually delivers (the tabs convention).
  probe("platform")(platform.os);

  // Every case mounts inside `Scoped` through `Case`: NSH context reaches a
  // subtree only for elements created under the provider, so the case element
  // must be built inside `Case`'s body (which mounts under the scope) — a
  // `content` variable assigned here would keep `Fixture` as its owner and
  // bypass `EnvironmentScope`.
  return (
    <Scoped>
      <Case />
    </Scoped>
  );
}

mount(Fixture);
