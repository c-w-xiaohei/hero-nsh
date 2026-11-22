import { effect, host, mount, platform, signal, Text, View } from "nsh";
import type { JSX, ViewRef } from "nsh";
import { Tabs } from "@heroui/react";
import { EnvironmentScope, PressableFeedbackContext } from "@heroui/react";
import type { PressableFeedbackContextValue, TabRenderProps } from "@heroui/react";
import { TabsContext } from "../src/components/tabs/tabs-context";
import { probe } from "@scenario/probe";

/*
 * NSH-only fixture for the Tabs unit (port sheet 4b).
 *
 * A shared scenario cannot carry the probes the cases read back, so every case
 * is selected with `host.params.case`:
 *
 *   heroui                  the HeroUI unit fixture: overview / analytics /
 *                           reports, the third one disabled (T-005, T-006,
 *                           T-007)
 *   kobalte-plain           the Kobalte fixture: the same three tabs, nothing
 *                           disabled, first one selected (T-010, T-016, T-023)
 *   kobalte-vertical        the same, orientation="vertical" (T-012)
 *   kobalte-manual          keyboardActivation="manual" with
 *                           defaultSelectedKey="overview" (T-015)
 *   kobalte-default-analytics
 *                           defaultSelectedKey="analytics" (T-017)
 *   kobalte-disabled-group  isDisabled on the root, so the whole group is
 *                           disabled (T-018)
 *   kobalte-disabled-middle the second tab is disabled (T-019, T-020)
 *   kobalte-all-disabled    every tab disabled (T-021)
 *   kobalte-default-disabled
 *                           `defaultSelectedKey="reports"` on a disabled Reports
 *                           tab (X-001)
 *   kobalte-focus-ring      every tab renders its `isFocusVisible` render value
 *                           as visible text, so the focus ring's presence is
 *                           observable without computed style (X-002, X-003)
 *
 * `nsh/test` has no `document.activeElement`, so each tab records a focus event
 * and a pressable `after` station sits behind the group: Tab that leaves the
 * last tab lands there, which makes "focus went elsewhere" observable instead
 * of being an absent event. `onSelectionChange` payloads are recorded the same
 * way (see `harness/tests/testers/tabs.ts`).
 *
 * Everything here uses HeroUI's API; the extra station is a plain pressable
 * view, not part of the component.
 */

const TAB_IDS = ["overview", "analytics", "reports"] as const;

const TAB_LABELS: Record<string, string> = {
  overview: "Overview",
  analytics: "Analytics",
  reports: "Reports",
};

/* -------------------------------------------------------------------------------------------------
 * HeroUI unit fixture
 * -----------------------------------------------------------------------------------------------*/

function HeroTabs() {
  return (
    <View class="w-[480px]">
      <Tabs onSelectionChange={(key: string | number) => probe("selectionChange")(key)}>
        <Tabs.ListContainer>
          <Tabs.List aria-label="Options">
            <Tabs.Tab id="overview">
              Overview
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="analytics">
              Analytics
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab isDisabled id="reports">
              Reports
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>
        <Tabs.Panel id="overview">
          <Text>Overview panel</Text>
        </Tabs.Panel>
        <Tabs.Panel id="analytics">
          <Text>Analytics panel</Text>
        </Tabs.Panel>
        <Tabs.Panel id="reports">
          <Text>Reports panel</Text>
        </Tabs.Panel>
      </Tabs>
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Kobalte fixtures
 * -----------------------------------------------------------------------------------------------*/

function KobalteTabs(props: {
  orientation?: "horizontal" | "vertical";
  keyboardActivation?: "automatic" | "manual";
  defaultSelectedKey?: string;
  disabledTabs?: string[];
  isDisabled?: boolean;
}) {
  return (
    <View class="w-[480px]">
      <Tabs
        orientation={props.orientation}
        keyboardActivation={props.keyboardActivation}
        defaultSelectedKey={props.defaultSelectedKey}
        isDisabled={props.isDisabled}
        onSelectionChange={(key: string | number) => probe("selectionChange")(key)}
      >
        <Tabs.ListContainer>
          <Tabs.List aria-label="Options">
            {TAB_IDS.map((id) => (
              <Tabs.Tab
                id={id}
                isDisabled={props.disabledTabs?.includes(id)}
                onFocus={() => probe("focus")(id)}
              >
                {TAB_LABELS[id]}
                <Tabs.Indicator />
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>
        {TAB_IDS.map((id) => (
          <Tabs.Panel id={id}>
            <Text>{`${TAB_LABELS[id]} panel`}</Text>
          </Tabs.Panel>
        ))}
      </Tabs>
      <View
        role="button"
        testID="after"
        onPress={() => undefined}
        onFocus={() => probe("focus")("after")}
      >
        <Text>After</Text>
      </View>
    </View>
  );
}

/*
 * The focus ring is a painted result (`focus-visible:` has no query in
 * `nsh/test`), so each tab renders its `isFocusVisible` render value as the
 * visible text: "Ring analytics" means that tab has the ring, "NoRing
 * analytics" means it does not. An assertion on either can fail when the
 * modality wiring behind it breaks.
 */
function FocusTabs() {
  return (
    <View class="w-[480px]">
      <Tabs onSelectionChange={(key: string | number) => probe("selectionChange")(key)}>
        <Tabs.ListContainer>
          <Tabs.List aria-label="Options">
            {TAB_IDS.map((id) => (
              <Tabs.Tab id={id}>
                {(renderProps) => (
                  <Text>{`${renderProps.isFocusVisible() ? "Ring" : "NoRing"} ${id}`}</Text>
                )}
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>
        {TAB_IDS.map((id) => (
          <Tabs.Panel id={id}>
            <Text>{`${TAB_LABELS[id]} panel`}</Text>
          </Tabs.Panel>
        ))}
      </Tabs>
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Mobile-environment cases (adapt-sheets/tabs.md §4 M-001…M-013)
 * -----------------------------------------------------------------------------------------------*/

type LayoutEvent = {
  bounds: {
    origin: { x: number; y: number };
    size: { width: number; height: number };
  };
};

/** A full bounds box: origin and size, for geometry assertions. */
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
 * Reads `PressableFeedbackContext` inside a `Tabs.Tab` (the tab provides the
 * seam's context to its children — A-003) and reports the seam's state, the
 * calendar-year-picker fixture's probe shape, merged with the live-context
 * store `sampleCtxChannels` reads on demand:
 *   `<slot>-pressed`  the gated `isPressed` edge (silent under pointer — that
 *                     silence IS the negative assertion)
 *   `<slot>-state`    every channel sampled on each edge, +600 ms and +1500 ms
 *                     so a held press reports its settled end values
 *   `<slot>-env`      the reactive gate, computed `hitSlop` and bounds
 * `hitSlop` serializes `undefined` as `null` — the seam's rest value.
 */
const liveCtxs: Record<string, PressableFeedbackContextValue | null> = {};

function TabCtxProbe(props: { slot: string }) {
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

/* On-demand channel read for the negative half: a pointer press never raises
 * the seam's `isPressed` edge, so `ctx-state` alone cannot prove the channels
 * stayed at rest — `ctx-sample-*` samples them after the press instead. */
function sampleCtxChannels(slot: string) {
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
 * The `mobile` case: a 280 pt tab strip with eight 48 pt tabs (the list's
 * `gap-2` produces no measurable gap — pitch is the tab width itself), a
 * 48 pt `pxprobe` tab whose only child is a `w-full` view (the `px-*`
 * density padding's content-box probe) and a 36 pt `narrow` tab (under the
 * 44 pt touch minimum, so the seam's `hitSlop` computes). 524 pt of content
 * in a 280 pt viewport overflows, so both chevrons show once the strip
 * scrolls (measured: contentSize 524×52, viewport 280×52, maxScroll 244).
 *
 * Every tab is fixed-width (`flex:none`-equivalent inline style: the slot's
 * `flex-1` would otherwise win over a bare width — the calendar-year-picker
 * fixture's precedent), so tab centers sit on an exact 48 pt grid:
 *
 *   content-x centers: t1=28, t2=76, …, t8=364, pxprobe=412, narrow=454
 *   scroll offset puts a tab's center at viewport-x = center_i − offset.
 *
 * The `scroll-prev`/`scroll-next` chevrons anchor `start-1`/`end-1` (4 pt)
 * of the 280 pt container, vertically centered: under pointer they are
 * 16×16 (`size-4`), under touch 44×44 (`min-h-11 min-w-11` — verified by
 * instrumented `onLayout`: 44×44 at x 4 / 232, 16×16 at x 260).  A tab
 * center in viewport-x [20,48) is covered by the 44 pt prev chevron but
 * clear of the 16 pt one; [232,260) is the same for next.  The 48 pt
 * pitch makes the residues work out: centers ≡ 28 (mod 48) and the touch
 * centering offset ≡ 32 (mod 48), so visible centers land at
 * viewport-x ≡ 44 (mod 48) = {44, 92, 140, 188, 236} — 44 and 236 sit
 * inside both discriminating bands at every centered offset.  With
 * `select-t5` the strip rests at offset 80: t3's center is at viewport-x
 * 44 and t7's at 236.  Whether `app.press` on those tabs reports
 * `ERR_NSH_TEST_COVERED` is the covered-press half of M-003 — the
 * chevron's 44 pt box overlaps them on paper, so a covered verdict is
 * the contract and a landed press is the hit-ordering bug's evidence.
 *
 * Probes: `selectionChange` (decoded key), `events` ({tab,kind} press-chain
 * records on every tab), `hover` ({tab,kind,value} hover records), `focus`
 * (tab id), `layout` ({name,x,y,width,height} on every tab, the list
 * container, the list, every panel and the pxprobe child), `measure`
 * ({name,…,px,py} page-space boxes via `measure()` on demand — scroll
 * offsets are applied there, so it is the scroll-position channel),
 * `ctx-*`/`narrow-ctx-*`/`t4-ctx-*` seam channels, `ctx-channels`/
 * `narrow-ctx-channels` on-demand reads.
 *
 * `host.params`:
 *   rtl="1"          `dir="rtl"` on the root (M-006's rtl half, M-011)
 *   tabdisabled="1"  `isDisabled` on t4 only (M-007's single-tab half)
 *   disabled="1"     `isDisabled` on the root (M-007's group half)
 *   input / density  the `EnvironmentScope` axes (ScopedMobile below)
 * -----------------------------------------------------------------------------------------------*/

const MOBILE_TAB_IDS = [
  "t1",
  "t2",
  "t3",
  "t4",
  "t5",
  "t6",
  "t7",
  "t8",
] as const;

/** Fixed-width tab style: overrides the slot's `flex-1` (basis 0 + grow). */
function fixedTabStyle(width: number) {
  return { width, flexGrow: 0, flexShrink: 0, flexBasis: width };
}

const tabRefs = new Map<string, ViewRef>();
const panelRefs = new Map<string, ViewRef>();
let containerRef: ViewRef | undefined;

function measureAll() {
  const report = probe("measure");
  const targets: [string, ViewRef | undefined][] = [
    ["listcontainer", containerRef],
    ...MOBILE_TAB_IDS.map((id): [string, ViewRef | undefined] => [`tab-${id}`, tabRefs.get(id)]),
    ["tab-pxprobe", tabRefs.get("pxprobe")],
    ["tab-narrow", tabRefs.get("narrow")],
    ...MOBILE_TAB_IDS.map((id): [string, ViewRef | undefined] => [`panel-${id}`, panelRefs.get(id)]),
  ];

  for (const [name, node] of targets) {
    if (node == null) {
      continue;
    }
    void node.measure().then((m) => {
      if (m == null) {
        return;
      }
      report({
        name,
        x: m.bounds.origin.x,
        y: m.bounds.origin.y,
        width: m.bounds.size.width,
        height: m.bounds.size.height,
        px: m.pagePosition.x,
        py: m.pagePosition.y,
      });
    });
  }
}

/* Reports the scroll geometry `Tabs.ListContainer` publishes into the root
 * context — `contentSize` (the list's frame) and `viewportSize` (the
 * scroller's) — plus the selected key, so tests can assert what `scrollBy`
 * computed against without a geometry API. */
function TabsGeomProbe() {
  const tabs = TabsContext();
  const report = probe("geom");

  effect(() => {
    if (tabs == null) {
      return;
    }
    report({
      contentSize: tabs.contentSize(),
      viewportSize: tabs.viewportSize(),
      selectedKey: tabs.selectedKey(),
      focusedKey: tabs.selectionManager().focusedKey(),
    });
  });

  return null;
}

function MobileTabs() {
  const selected = signal("t1");
  const rtl = String(host.params.rtl ?? "") === "1";
  const tabDisabled = String(host.params.tabdisabled ?? "") === "1";
  const rootDisabled = String(host.params.disabled ?? "") === "1";

  const onSelection = (key: string | number) => {
    probe("selectionChange")(key);
    selected.set(String(key));
  };

  const tabHandlers = (id: string) => ({
    onPressStart: () => probe("events")({ tab: id, kind: "start" }),
    onPressDown: () => probe("events")({ tab: id, kind: "down" }),
    onPressChange: (isPressed: boolean) =>
      probe("events")({ tab: id, kind: "chg", value: isPressed }),
    onPressUp: () => probe("events")({ tab: id, kind: "up" }),
    onPressEnd: () => probe("events")({ tab: id, kind: "end" }),
    onPress: () => probe("events")({ tab: id, kind: "press" }),
    onClick: () => probe("events")({ tab: id, kind: "click" }),
    onLongPress: () => probe("events")({ tab: id, kind: "long" }),
    onHoverStart: () => probe("hover")({ tab: id, kind: "start" }),
    onHoverEnd: () => probe("hover")({ tab: id, kind: "end" }),
    onHoverChange: (isHovered: boolean) =>
      probe("hover")({ tab: id, kind: "change", value: isHovered }),
    onFocus: () => probe("focus")(id),
  });

  /* Each tab's children: a render function takes the `TabRenderProps`
   * accessors; every other tab gets an element. The `Tabs.Separator` sits
   * INSIDE the child (element or render result) — a sibling function +
   * element pair would make `props.children` an array whose `content()`
   * only reaches the function member (children.tsx calls a function child
   * once and passes the rest through renderChildren). */
  const tabContent = (id: string) => {
    const label = id === "narrow" ? "Narrow" : `Tab ${id.slice(1)}`;
    const ctxSlot =
      id === "t1" ? "ctx" : id === "narrow" ? "narrow-ctx" : id === "t4" ? "t4-ctx" : null;
    const probes = (
      <>
        {ctxSlot != null ? <TabCtxProbe slot={ctxSlot} /> : null}
        <Tabs.Separator testID={`sep-${id}`} />
      </>
    );

    if (id === "t1") {
      return (rp: TabRenderProps) => (
        <>
          <Text>Tab 1</Text>
          <Text>{`${rp.isHovered() ? "H1" : "H0"}${rp.isPressed() ? "P1" : "P0"}${rp.isSelected() ? "S1" : "S0"}${rp.isDisabled() ? "D1" : "D0"}`}</Text>
          {probes}
        </>
      );
    }

    if (id === "pxprobe") {
      return (
        <>
          <View class="w-full" onLayout={boxProbe("pxprobe-inner")} />
          {probes}
        </>
      );
    }

    return (
      <>
        <Text>{label}</Text>
        {probes}
      </>
    );
  };

  const renderTab = (id: string) => {
    const width = id === "narrow" ? 36 : 48;

    return (
      <Tabs.Tab
        id={id}
        testID={`tab-${id}`}
        isDisabled={id === "t4" && tabDisabled}
        style={fixedTabStyle(width)}
        ref={(node) => {
          tabRefs.set(id, node);
        }}
        onLayout={boxProbe(`tab-${id}`)}
        {...tabHandlers(id)}
      >
        {tabContent(id)}
      </Tabs.Tab>
    );
  };

  const allIds = [...MOBILE_TAB_IDS, "pxprobe", "narrow"] as const;

  return (
    <View style={{ width: 280 }}>
      <Tabs
        dir={rtl ? "rtl" : undefined}
        isDisabled={rootDisabled}
        selectedKey={selected()}
        onSelectionChange={onSelection}
      >
        <Tabs.ListContainer
          ref={(node) => {
            containerRef = node;
          }}
          onLayout={boxProbe("listcontainer")}
        >
          <Tabs.List aria-label="Pages" onLayout={boxProbe("tablist")}>
            {allIds.map(renderTab)}
            {/* A non-pressable tail inside the scroll content: every drag or
                `app.scroll` that starts on a tab is claimed by the tab's press
                responder after the pan-activation offset (~4 pt), so scroll
                gestures need a surface no tab covers. */}
            <View testID="scroll-surface" style={{ width: 48, height: 44 }} />
          </Tabs.List>
          <TabsGeomProbe />
        </Tabs.ListContainer>
        {MOBILE_TAB_IDS.map((id) => (
          <Tabs.Panel
            id={id}
            testID={`panel-${id}`}
            ref={(node) => {
              panelRefs.set(id, node);
            }}
            onLayout={boxProbe(`panel-${id}`)}
          >
            <Text>{`Tab ${id.slice(1)} panel`}</Text>
          </Tabs.Panel>
        ))}
      </Tabs>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
        {(["t1", "t5", "t6", "t7"] as const).map((id) => (
          <View
            testID={`select-${id}`}
            role="button"
            class="p-2 bg-default"
            onPress={() => selected.set(id)}
          >
            <Text>{`sel ${id}`}</Text>
          </View>
        ))}
        <View
          testID="measure-all"
          role="button"
          class="p-2 bg-default"
          onPress={measureAll}
        >
          <Text>measure</Text>
        </View>
        <View testID="ctx-sample-t1" role="button" class="p-2 bg-default" onPress={() => sampleCtxChannels("ctx")}>
          <Text>ctx1</Text>
        </View>
        <View testID="ctx-sample-narrow" role="button" class="p-2 bg-default" onPress={() => sampleCtxChannels("narrow-ctx")}>
          <Text>ctxn</Text>
        </View>
        {/* Deterministic scroll offsets for the chevron-coverage geometry:
            `reveal` aligns a tab's edge to the viewport's, instantly. */}
        <View
          testID="reveal-t3"
          role="button"
          class="p-2 bg-default"
          onPress={() => tabRefs.get("t3")?.reveal({ horizontal: "start", animated: false })}
        >
          <Text>r-t3</Text>
        </View>
        <View
          testID="reveal-t6"
          role="button"
          class="p-2 bg-default"
          onPress={() => tabRefs.get("t6")?.reveal({ horizontal: "end", animated: false })}
        >
          <Text>r-t6</Text>
        </View>
        <View
          testID="reveal-t7"
          role="button"
          class="p-2 bg-default"
          onPress={() => tabRefs.get("t7")?.reveal({ horizontal: "center", animated: false })}
        >
          <Text>r-t7</Text>
        </View>
      </View>
      <View testID="after" role="button" class="p-2" onPress={() => undefined} onFocus={() => probe("focus")("after")}>
        <Text>After</Text>
      </View>
    </View>
  );
}

function Fixture() {
  const name = String(host.params.case ?? "heroui");

  // The host OS as the app sees it — `"web"` on `--target web` even when the
  // test opens with a desktop `platform` — so tests can tell which gesture
  // tails the host actually delivers (the web chain gap, sheet §6).
  probe("platform")(platform.os);

  // Every case mounts inside `ScopedMobile` through `Case`: NSH context
  // reaches a subtree only for elements created under the provider, so the
  // case element must be built inside `Case`'s body (which mounts under the
  // scope) — a `content` variable assigned in this body keeps `Fixture` as
  // its owner and bypasses `EnvironmentScope` (the breadcrumbs convention).
  return (
    <ScopedMobile>
      <Case name={name} />
    </ScopedMobile>
  );
}

function Case(props: { name: string }) {
  const name = props.name;

  if (name === "mobile") {
    return <MobileTabs />;
  }

  if (name === "kobalte-plain") {
    return <KobalteTabs />;
  }

  if (name === "kobalte-vertical") {
    return <KobalteTabs orientation="vertical" />;
  }

  if (name === "kobalte-manual") {
    return <KobalteTabs keyboardActivation="manual" defaultSelectedKey="overview" />;
  }

  if (name === "kobalte-default-analytics") {
    return <KobalteTabs defaultSelectedKey="analytics" />;
  }

  if (name === "kobalte-disabled-group") {
    return <KobalteTabs isDisabled />;
  }

  if (name === "kobalte-disabled-middle") {
    return <KobalteTabs disabledTabs={["analytics"]} />;
  }

  if (name === "kobalte-all-disabled") {
    return <KobalteTabs disabledTabs={[...TAB_IDS]} />;
  }

  if (name === "kobalte-default-disabled") {
    return <KobalteTabs defaultSelectedKey="reports" disabledTabs={["reports"]} />;
  }

  if (name === "kobalte-focus-ring") {
    return <FocusTabs />;
  }

  return <HeroTabs />;
}

/**
 * `host.params.input` / `host.params.density` feed `EnvironmentScope`; an
 * absent param keeps the host-derived value, so a case opened without them
 * is the desktop-parity baseline. Wrapping every case lets the mobile tests
 * reopen the existing `heroui`/`kobalte-*` shapes under `input="touch"`
 * (M-010) without a second fixture.
 */
function ScopedMobile(props: { children?: JSX.Element }) {
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

mount(Fixture);
