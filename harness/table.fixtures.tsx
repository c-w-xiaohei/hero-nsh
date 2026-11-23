import { effect, host, mount, platform, Scroll, Text, View } from "nsh";
import type { JSX, ScrollEvent } from "nsh";
import { Checkbox, EnvironmentScope, PressableFeedbackContext, Table } from "@heroui/react";
import { TableColumnContext, TableResizerContext } from "../src/components/table/table-context";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";

/*
 * NSH-only Table fixture (adapt-sheets/table.md §4 A-010), not a shared
 * scenario. Every case is built from HeroUI's public API and records
 * callbacks through `probe`, so the `.mobile.*` tests read them back from
 * Storage (`app.storage()`).
 *
 * It sits next to harness/nsh.json on purpose: NSH takes the entry's own
 * directory as the app root, so an entry under harness/tests/... finds no
 * nsh.json and loses the `@heroui/react` alias and the theme.
 *
 * host.params.case picks the surface:
 *   rows       three rows with selectionMode="multiple", onAction/href
 *              probes, a `disabledBehavior="selection"` disabled row and a
 *              fully disabled row (M-011/M-012 semantics)
 *   sortable   a sortable `name` column (SortableColumnHeader + indicator)
 *              with onSortChange / onSelectionChange probes
 *   resizable  ResizableContainer with two ColumnResizers inside a horizontal
 *              Scroll (the 320-pt table with ≥500 pt of tracks overflows it),
 *              itself inside a vertical Scroll — the arbitration probes are
 *              `resize` (start/move/end + width map), `scroll` (horizontal
 *              offset.x) and `vscroll` (vertical offset.y)
 *   ctx-probe  one `rows`-style table plus one resizable column carrying
 *              fixture probes: a `SeamProbe` inside a cell and inside the
 *              sortable column (reading `PressableFeedbackContext`) and a
 *              `ResizerProbe` inside the resizer (reading
 *              `TableResizerContext`: feedback channels + `panHandlers()`
 *              key count + `pan.active()`), plus a `ctx-sample` button
 *   events     per-row per-callback press-chain probes (`events`
 *              {part, kind}) plus selection/sort/action probes
 *   layout     cells/columns/footer report `onLayout` bounds (`layout`
 *              probe) for the hit-height and density rows
 *
 * `host.params.input`/`density` feed `EnvironmentScope`; an absent param
 * keeps the host-derived environment — the pointer/desktop-parity half.
 */

type Params = Record<string, string>;

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

/**
 * `host.params.input` / `host.params.density` feed `EnvironmentScope`; an
 * absent or unrecognized param keeps the host-derived value, so a case
 * opened without them is the desktop-parity baseline.
 *
 * Other params shape the case: `mode` selects `selectionMode`
 * (`single`/`none`, default `multiple`), `tree` adds a parent/child pair
 * with `expandedKeys`/`onExpandedChange`/`treeColumn` wired and
 * `onExpandedChange` reported through the `expanded` probe.
 */
function ScopedMobile(props: { children?: JSX.Element }) {
  const input = String((host.params as Params).input ?? "");
  const density = String((host.params as Params).density ?? "");

  return (
    <EnvironmentScope
      input={input === "touch" || input === "pointer" ? input : undefined}
      density={density === "compact" || density === "default" ? density : undefined}
    >
      {props.children}
    </EnvironmentScope>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Seam probes (the ctx-probe case's observation surface)
 * -----------------------------------------------------------------------------------------------*/

type Edges = { top: number; right: number; bottom: number; left: number };

/**
 * Reads the `PressableFeedbackContext` of the row or column around it —
 * inside a cell it must see the row's seam (cells own no seam of their
 * own). Reports `ctx-env` (mount-time gate, computed slop, bounds) and a
 * `ctx-pressed` edge per `isPressed` transition; the interval sampler
 * records `ctx-state` while a hold is in flight (the channels'
 * `getValue()` reads, since `viewStyle` cannot resolve AnimatedValue).
 */
function SeamProbe(props: { id: string }) {
  const ctx = PressableFeedbackContext();
  const reportEnv = probe("ctx-env");
  const reportPressed = probe("ctx-pressed");
  const reportState = probe("ctx-state");

  effect(() => {
    reportEnv({
      id: props.id,
      enabled: ctx.enabled(),
      hitSlop: (ctx.hitSlop() as Edges | undefined) ?? null,
      bounds: ctx.bounds(),
    });
  });

  const sample = () => {
    void ctx.pressed.getValue().then((pressed) => {
      void ctx.scale.getValue().then((scale) => {
        reportState({
          id: props.id,
          seamPressed: ctx.isPressed(),
          pressed,
          scale,
          highlight: 0,
          origin: ctx.pressOrigin(),
          hitSlop: (ctx.hitSlop() as Edges | undefined) ?? null,
          bounds: ctx.bounds(),
          enabled: ctx.enabled(),
        });
      });
    });
  };

  effect(() => {
    reportPressed({ id: props.id, pressed: ctx.isPressed() });
  });

  effect(() => {
    const timer = setInterval(() => {
      if (ctx.isPressed()) {
        sample();
      }
    }, 200);

    return () => clearInterval(timer);
  });

  // The sample-on-demand channel: `ctx-channels` rides the button below.
  effect(() => {
    seamContexts[props.id] = ctx;
  });

  return <Text>{ctx.isPressed() ? `seam-${props.id}-pressed` : `seam-${props.id}-idle`}</Text>;
}

const seamContexts: Record<string, ReturnType<typeof PressableFeedbackContext>> = {};

/**
 * The column's `startResize` render channel, captured for the keyboard
 * resize arm button (the programmatic focus the resizer takes itself on
 * press is what a keyboard Enter needs; the button gives the web target
 * the same entry).
 */
let startResizeFn: (() => void) | null = null;

function ColumnProbe() {
  const column = TableColumnContext();

  effect(() => {
    startResizeFn = () => column?.startResize();
  });

  return null;
}

/**
 * Reads the `TableResizerContext` inside the resizer's hit area: the touch
 * feedback's `enabled`/`hitSlop`/`bounds`/`isPressed` and the pan seam's
 * `panHandlers()` key count (0 when `enabled()` is false — the spread
 * mounts no listener at all, the M-004 negative assertion) plus
 * `pan.active()`. Reports `resizer-env` on mount and `resizer-pan` on
 * every claim transition.
 */
function ResizerProbe() {
  const ctx = TableResizerContext();
  const reportEnv = probe("resizer-env");
  const reportPan = probe("resizer-pan");
  const reportState = probe("resizer-state");

  const read = () => ({
    enabled: ctx?.enabled() ?? false,
    hitSlop: (ctx?.feedback.hitSlop() as Edges | undefined) ?? null,
    bounds: ctx?.feedback.bounds() ?? { width: 0, height: 0 },
    seamPressed: ctx?.feedback.isPressed() ?? false,
    // The literal count of props `panHandlers()` would spread — under
    // pointer `enabled()` is false and it resolves to {} (the M-004
    // negative assertion reads exactly this).
    handlerKeys: ctx ? Object.keys(ctx.pan.panHandlers()).length : -1,
    panActive: ctx?.pan.active() ?? false,
  });

  // Mount-time seam surface plus an interval sampler, so both post-layout
  // `hitSlop` and mid-drag `panActive` are observable.
  effect(() => {
    reportEnv(read());
  });

  effect(() => {
    reportPan(read());
  });

  effect(() => {
    const timer = setInterval(() => {
      reportState(read());
    }, 200);

    return () => clearInterval(timer);
  });

  return <Text>{ctx?.pan.active() ? "pan-active" : "pan-idle"}</Text>;
}

function SampleButton() {
  const reportChannels = probe("ctx-channels");

  const sampleChannels = () => {
    for (const id of Object.keys(seamContexts)) {
      const ctx = seamContexts[id];
      if (!ctx) continue;
      void ctx.pressed.getValue().then((pressed) => {
        void ctx.scale.getValue().then((scale) => {
          reportChannels({
            id,
            seamPressed: ctx.isPressed(),
            pressed,
            scale,
            origin: ctx.pressOrigin(),
            hitSlop: (ctx.hitSlop() as Edges | undefined) ?? null,
            enabled: ctx.enabled(),
          });
        });
      });
    }
  };

  return (
    <View testID="ctx-sample" role="button" class="p-2" onPress={sampleChannels}>
      <Text>ctx-sample</Text>
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Shared table parts
 * -----------------------------------------------------------------------------------------------*/

const MEMBERS = [
  { id: "one", name: "Ada", role: "Engineer", note: "Kernel team lead" },
  { id: "two", name: "Grace", role: "Research", note: "COBOL and compilers" },
  { id: "three", name: "Lin", role: "Ops", note: "Fleet reliability" },
];

function SelectionCheckbox(props: { label: string }) {
  return (
    <Checkbox aria-label={props.label} slot="selection">
      <Checkbox.Content>
        <Checkbox.Control>
          <Checkbox.Indicator />
        </Checkbox.Control>
      </Checkbox.Content>
    </Checkbox>
  );
}

/* -------------------------------------------------------------------------------------------------
 * rows case — selection, action, href, disabled behaviors
 * -----------------------------------------------------------------------------------------------*/

const TREE_CHILDREN = [
  { id: "child-one", name: "Child One", role: "Nested" },
  { id: "child-two", name: "Child Two", role: "Nested" },
];

/**
 * The `rows` case's mode knobs come from `host.params`:
 *   mode  `single` | `none` (default `multiple`) — selectionMode axis for
 *         the M-011 dual.
 *   tree  `collapsed` (default when `tree` is set) or `expanded` — a
 *         `parent` row with `hasChildItems`, nested `child-one`/`child-two`
 *         rows rendered inside it, `expandedKeys` held at the matching
 *         set, `treeColumn` set to the name column, and `onExpandedChange`
 *         reported through the `expanded` probe.
 * Every row and cell also carries the raw `onFocus`/`onBlur` probes the
 * keyboard half of M-011 needs, plus `style` functions that translate
 * `isHovered` into an opacity marker so M-009 can read it through
 * `app.viewStyle`.
 */
function RowsCase() {
  const params = host.params as Params;
  const mode = String(params.mode ?? "");
  const tree = String(params.tree ?? "");
  const reportEvent = probe("events");
  const reportFocus = probe("focus");
  const reportBlur = probe("blur");
  const reportExpanded = probe("expanded");

  const selectionMode =
    mode === "single" ? "single" : mode === "none" ? "none" : "multiple";

  // `tree=expanded` holds `expandedKeys` at {parent}; any other `tree`
  // value (including `tree=collapsed`) holds the empty set — the collection
  // then hides the child rows. `onExpandedChange` is still wired so a
  // future toggle path reports through the `expanded` probe.
  const expandedKeys = new Set(tree === "expanded" ? ["parent"] : []);

  // The hover render-prop channel: `style` receives the part's render props
  // (`TableRowRenderProps`/`TableCellRenderProps`) and returns a ViewStyle.
  // `opacity` flips between 1 and 0.5 on `isHovered`, which `app.viewStyle`
  // can read back — the only observable channel for a render-prop value.
  const hoverStyle = (values: { isHovered: () => boolean }) => ({
    opacity: values.isHovered() ? 0.5 : 1,
  });

  return (
    <Stage>
      <Table className="w-[420px]">
        <Table.Content
          aria-label="Members"
          selectionMode={selectionMode}
          disabledKeys={["muted"]}
          disabledBehavior="selection"
          treeColumn={tree ? "name" : undefined}
          expandedKeys={tree ? expandedKeys : undefined}
          onExpandedChange={tree ? (keys) => reportExpanded([...keys]) : undefined}
          onSelectionChange={(keys) =>
            probe("selection")(keys === "all" ? "all" : [...keys])
          }
          onRowAction={(key) => probe("rowAction")(key)}
        >
          <Table.Header>
            <Table.Column>
              <SelectionCheckbox label="Select all" />
            </Table.Column>
            <Table.Column>Member</Table.Column>
            <Table.Column>Role</Table.Column>
          </Table.Header>
          <Table.Body>
            {MEMBERS.map((member) => (
              <Table.Row
                id={member.id}
                testID={`row-${member.id}`}
                style={hoverStyle}
                onAction={() => probe("action")(member.id)}
                onFocus={() => reportFocus(`row-${member.id}`)}
                onBlur={() => reportBlur(`row-${member.id}`)}
                onHoverStart={() => probe("hover")({ part: `row-${member.id}`, kind: "start" })}
                onHoverChange={(isHovering) =>
                  probe("hover")({ part: `row-${member.id}`, kind: "change", value: isHovering })
                }
                onHoverEnd={() => probe("hover")({ part: `row-${member.id}`, kind: "end" })}
                onMouseEnter={() => probe("mouseenter")(`row-${member.id}`)}
                onMouseLeave={() => probe("mouseleave")(`row-${member.id}`)}
                onPressDown={() => reportEvent({ part: `row-${member.id}`, kind: "down" })}
                onPressUp={() => reportEvent({ part: `row-${member.id}`, kind: "up" })}
                onPress={() => reportEvent({ part: `row-${member.id}`, kind: "press" })}
              >
                <Table.Cell>
                  <SelectionCheckbox label={`Select ${member.name}`} />
                </Table.Cell>
                <Table.Cell
                  testID={`cell-${member.id}`}
                  style={hoverStyle}
                  onFocus={() => reportFocus(`cell-${member.id}`)}
                  onBlur={() => reportBlur(`cell-${member.id}`)}
                  onPressDown={() => reportEvent({ part: `cell-${member.id}`, kind: "down" })}
                  onPressUp={() => reportEvent({ part: `cell-${member.id}`, kind: "up" })}
                  onPress={() => reportEvent({ part: `cell-${member.id}`, kind: "press" })}
                >
                  {member.name}
                </Table.Cell>
                <Table.Cell>{member.role}</Table.Cell>
              </Table.Row>
            ))}
            {tree ? (
              <Table.Row
                id="parent"
                testID="row-parent"
                hasChildItems
                onAction={() => probe("action")("parent")}
                onFocus={() => reportFocus("row-parent")}
                onBlur={() => reportBlur("row-parent")}
              >
                <Table.Cell>
                  <SelectionCheckbox label="Select Parent" />
                </Table.Cell>
                <Table.Cell
                  testID="cell-parent"
                  onFocus={() => reportFocus("cell-parent")}
                  onBlur={() => reportBlur("cell-parent")}
                >
                  Parent
                </Table.Cell>
                <Table.Cell>Group</Table.Cell>
                {TREE_CHILDREN.map((child) => (
                  <Table.Row
                    id={child.id}
                    testID={`row-${child.id}`}
                    onAction={() => probe("action")(child.id)}
                    onFocus={() => reportFocus(`row-${child.id}`)}
                    onBlur={() => reportBlur(`row-${child.id}`)}
                  >
                    <Table.Cell />
                    <Table.Cell
                      testID={`cell-${child.id}`}
                      onFocus={() => reportFocus(`cell-${child.id}`)}
                      onBlur={() => reportBlur(`cell-${child.id}`)}
                    >
                      {child.name}
                    </Table.Cell>
                    <Table.Cell>{child.role}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Row>
            ) : null}
            <Table.Row
              id="muted"
              testID="muted"
              onAction={() => probe("action")("muted")}
              onPress={() => reportEvent({ part: "row-muted", kind: "press" })}
            >
              <Table.Cell>Muted</Table.Cell>
              <Table.Cell>Selection-disabled</Table.Cell>
            </Table.Row>
            <Table.Row id="frozen" isDisabled testID="frozen">
              <Table.Cell>Frozen</Table.Cell>
              <Table.Cell>Fully disabled</Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table.Content>
      </Table>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * sortable case
 * -----------------------------------------------------------------------------------------------*/

function SortableCase() {
  // `Table.Column`'s style render-prop receives `TableColumnRenderProps`;
  // the opacity flip is the same M-009 hover channel RowsCase uses.
  const hoverStyle = (values: { isHovered: () => boolean }) => ({
    opacity: values.isHovered() ? 0.5 : 1,
  });

  return (
    <Stage>
      <Table className="w-[420px]">
        <Table.Content
          aria-label="Sortable"
          selectionMode="multiple"
          onSelectionChange={(keys) =>
            probe("selection")(keys === "all" ? "all" : [...keys])
          }
          onSortChange={(descriptor) => probe("sort")(descriptor)}
        >
          <Table.Header>
            <Table.Column allowsSorting isRowHeader id="name" testID="column-name" style={hoverStyle}>
              <Table.SortableColumnHeader>Member</Table.SortableColumnHeader>
            </Table.Column>
            <Table.Column id="role">Role</Table.Column>
          </Table.Header>
          <Table.Body>
            {MEMBERS.map((member) => (
              <Table.Row id={member.id} testID={`row-${member.id}`}>
                <Table.Cell>{member.name}</Table.Cell>
                <Table.Cell>{member.role}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Content>
      </Table>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * resizable case — two resizers inside a horizontal Scroll, inside a
 * vertical Scroll: the arbitration surface.
 * -----------------------------------------------------------------------------------------------*/

function ResizableCase() {
  return (
    <Stage>
      <Scroll
        testID="outer-scroll"
        class="h-[400px]"
        onScroll={(event: ScrollEvent) =>
          probe("vscroll")({ x: event.offset.x, y: event.offset.y })
        }
      >
        <Table className="w-[320px]">
          <Table.ResizableContainer
            testID="hscroll"
            onLayout={boxProbe("hscroll")}
            onScroll={(event: ScrollEvent) =>
              probe("scroll")({ x: event.offset.x, y: event.offset.y })
            }
            onResizeStart={(widths) => probe("resize")({ kind: "start", widths: [...widths] })}
            onResize={(widths) => probe("resize")({ kind: "move", widths: [...widths] })}
            onResizeEnd={(widths) => probe("resize")({ kind: "end", widths: [...widths] })}
          >
            <Table.Content
              aria-label="Resizable"
              selectionMode="multiple"
              className="min-w-[720px]"
            >
              <Table.Header>
                <Table.Column id="name" width={240} minWidth={240}>
                  Member
                  <Table.ColumnResizer aria-label="Resize member" />
                </Table.Column>
                <Table.Column id="role" width={260} minWidth={260}>
                  Role
                  <Table.ColumnResizer aria-label="Resize role" />
                </Table.Column>
                <Table.Column id="note" width={220} minWidth={220}>
                  Note
                </Table.Column>
              </Table.Header>
              <Table.Body>
                {MEMBERS.map((member) => (
                  <Table.Row
                    id={member.id}
                    testID={`row-${member.id}`}
                    onLayout={boxProbe(`resizable-row-${member.id}`)}
                  >
                    <Table.Cell>{member.name}</Table.Cell>
                    <Table.Cell>{member.role}</Table.Cell>
                    <Table.Cell>{member.note}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ResizableContainer>
        </Table>
        {/* Vertical room for the outer scroll to travel. */}
        {Array.from({ length: 24 }, (_, index) => (
          <View class="py-4">
            <Text>{`filler ${index}`}</Text>
          </View>
        ))}
      </Scroll>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * ctx-probe case
 * -----------------------------------------------------------------------------------------------*/

function CtxProbeCase() {
  return (
    <Stage>
      <Table className="w-[420px]">
        <Table.ResizableContainer
          onResizeStart={(widths) => probe("resize")({ kind: "start", widths: [...widths] })}
          onResize={(widths) => probe("resize")({ kind: "move", widths: [...widths] })}
          onResizeEnd={(widths) => probe("resize")({ kind: "end", widths: [...widths] })}
        >
          <Table.Content
            aria-label="Probe"
            selectionMode="multiple"
            onSelectionChange={(keys) =>
              probe("selection")(keys === "all" ? "all" : [...keys])
            }
            onSortChange={(descriptor) => probe("sort")(descriptor)}
          >
            <Table.Header>
              <Table.Column allowsSorting isRowHeader id="name" width={200}>
                <Table.SortableColumnHeader>Member</Table.SortableColumnHeader>
                <SeamProbe id="column" />
                <ColumnProbe />
                <Table.ColumnResizer aria-label="Resize member">
                  {(values: { isHovered: () => boolean }) => (
                    <>
                      <ResizerProbe />
                      <Text>{values.isHovered() ? "resizer-hovered" : "resizer-idle"}</Text>
                    </>
                  )}
                </Table.ColumnResizer>
              </Table.Column>
              <Table.Column id="role" width={200}>
                Role
              </Table.Column>
            </Table.Header>
            <Table.Body>
              {MEMBERS.map((member) => (
                <Table.Row id={member.id} testID={`row-${member.id}`}>
                  <Table.Cell>
                    {member.name}
                    <SeamProbe id={`cell-${member.id}`} />
                  </Table.Cell>
                  <Table.Cell>{member.role}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Content>
        </Table.ResizableContainer>
      </Table>
      <SampleButton />
      {/* Arms the resizer's keyboard-resize entry (`startResize` focuses the
          hit area); the keymap then owns Enter/arrows/Escape. */}
      <View
        testID="resize-key"
        role="button"
        class="p-2"
        onPress={() => startResizeFn?.()}
      >
        <Text>resize-key</Text>
      </View>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * events case — the full press chain per part
 * -----------------------------------------------------------------------------------------------*/

function EventsCase() {
  const reportEvent = probe("events");

  return (
    <Stage>
      <Table className="w-[420px]">
        <Table.Content
          aria-label="Events"
          selectionMode="multiple"
          onSelectionChange={(keys) =>
            probe("selection")(keys === "all" ? "all" : [...keys])
          }
          onSortChange={(descriptor) => probe("sort")(descriptor)}
          onRowAction={(key) => probe("rowAction")(key)}
        >
          <Table.Header>
            <Table.Column
              allowsSorting
              id="name"
              onPressDown={() => reportEvent({ part: "column", kind: "down" })}
              onPressUp={() => reportEvent({ part: "column", kind: "up" })}
              onPress={() => reportEvent({ part: "column", kind: "press" })}
            >
              <Table.SortableColumnHeader>Member</Table.SortableColumnHeader>
            </Table.Column>
            <Table.Column id="role">Role</Table.Column>
          </Table.Header>
          <Table.Body>
            <Table.Row
              id="one"
              testID="row-one"
              onAction={() => probe("action")("one")}
              onPressDown={() => reportEvent({ part: "row", kind: "down" })}
              onPressUp={() => reportEvent({ part: "row", kind: "up" })}
              onPress={() => reportEvent({ part: "row", kind: "press" })}
            >
              <Table.Cell
                onPressDown={() => reportEvent({ part: "cell", kind: "down" })}
                onPressUp={() => reportEvent({ part: "cell", kind: "up" })}
                onPress={() => reportEvent({ part: "cell", kind: "press" })}
                onFocus={() => reportEvent({ part: "cell", kind: "focus" })}
              >
                Ada
              </Table.Cell>
              <Table.Cell>Engineer</Table.Cell>
            </Table.Row>
            <Table.Row id="two" testID="row-two" href="https://example.test/row-two">
              <Table.Cell onFocus={() => reportEvent({ part: "cell-two", kind: "focus" })}>
                Grace
              </Table.Cell>
              <Table.Cell>Research</Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table.Content>
      </Table>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * layout case — bounds of cell/column/resizer/footer in each environment
 * -----------------------------------------------------------------------------------------------*/

function LayoutCase() {
  return (
    <Stage>
      <Table className="w-[420px]">
        <Table.ResizableContainer>
          <Table.Content aria-label="Layout">
            <Table.Header>
              <Table.Column id="name" width={180} onLayout={boxProbe("column-name")}>
                Member
                <Table.ColumnResizer aria-label="Resize member" onLayout={boxProbe("resizer-name")} />
              </Table.Column>
              <Table.Column id="role" onLayout={boxProbe("column-role")}>
                Role
              </Table.Column>
            </Table.Header>
            <Table.Body>
              {MEMBERS.map((member) => (
                <Table.Row id={member.id} onLayout={boxProbe(`row-${member.id}`)}>
                  <Table.Cell onLayout={boxProbe(`cell-${member.id}`)}>{member.name}</Table.Cell>
                  <Table.Cell>{member.role}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Content>
        </Table.ResizableContainer>
        <Table.Footer onLayout={boxProbe("footer")}>Pagination</Table.Footer>
      </Table>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Fixture root
 * -----------------------------------------------------------------------------------------------*/

function Fixture() {
  const name = String((host.params as Params).case ?? "rows");

  // The app reports its own host OS (`platform.os`): `"web"` on
  // `--target web` even though the test opens a desktop platform — the
  // mobile tests branch chain assertions on it (the registered web
  // batching gap).
  probe("platform")(platform.os);

  if (name === "sortable") return <ScopedMobile><SortableCase /></ScopedMobile>;
  if (name === "resizable") return <ScopedMobile><ResizableCase /></ScopedMobile>;
  if (name === "ctx-probe") return <ScopedMobile><CtxProbeCase /></ScopedMobile>;
  if (name === "events") return <ScopedMobile><EventsCase /></ScopedMobile>;
  if (name === "layout") return <ScopedMobile><LayoutCase /></ScopedMobile>;

  return <ScopedMobile><RowsCase /></ScopedMobile>;
}

mount(Fixture);
