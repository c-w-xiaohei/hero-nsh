import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Mobile assertions for the fieldset adapt unit, one test per row of
 * adapt-sheets/fieldset.md §4 (M-001…M-006). The fixture is
 * `harness/fieldset.fixtures.tsx`: case "mobile" mounts the measured tree
 * (Root + Legend + two-member Group + Actions) under `EnvironmentScope`
 * driven by `host.params.input` / `host.params.density`; "mobile-disabled"
 * is the same tree with `disabled` on.
 *
 * The environment axes are always explicit: `input:"pointer"` is the
 * desktop-parity baseline every assertion compares against and
 * `input:"touch"` the injected mobile half, because the host-derived
 * default differs per target (touch on ios/android, pointer on desktop
 * and web). No `platform`/`width` open options — native targets fill the
 * device screen and reject them. The observation channel is what
 * `nsh/test` sees: `onLayout` bounds
 * records for the density axis, `enabled`/`spanStyle` for the contract
 * checks, and the probe channel for press callbacks.
 */

type Box = {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type EnvParams = {
  input?: "pointer" | "touch";
  density?: "default" | "compact";
};

function openMobile(caseName: string, env: EnvParams = {}): Promise<App> {
  return open("../../../fieldset.fixtures.tsx", {
    clock: {},
    host: {
      params: {
        case: caseName,
        ...(env.input ? { input: env.input } : {}),
        ...(env.density ? { density: env.density } : {}),
      },
    },
  });
}

function boxes(app: App): Box[] {
  return callsOf(app, "layout").map((args) => args[0] as Box);
}

const MEASURED = [
  "root",
  "legend",
  "group",
  "member-one",
  "member-two",
  "actions",
  "actions-filler",
  "action-apply",
  "action-cancel",
];

/** Waits until every probed box has reported at least once. */
async function settleLayout(app: App): Promise<void> {
  await app.waitUntil(() =>
    MEASURED.every((name) => boxes(app).some((box) => box.name === name)),
  );
}

/** The latest bounds a probe name reported (onLayout can fire more than once). */
function box(app: App, name: string): Box {
  const found = boxes(app).filter((b) => b.name === name);
  return found[found.length - 1]!;
}

/** name → sorted unique bounds, so repeat firings compare as sets. */
function boxSet(app: App): Record<string, string[]> {
  const groups: Record<string, Set<string>> = {};
  for (const b of boxes(app)) {
    const key = JSON.stringify({ x: b.x, y: b.y, width: b.width, height: b.height });
    (groups[b.name] ??= new Set()).add(key);
  }
  const out: Record<string, string[]> = {};
  for (const [name, set] of Object.entries(groups)) {
    out[name] = [...set].sort();
  }
  return out;
}

/*
 * The four gaps the density axis owns, in points. `onLayout` bounds are
 * parent-relative, so every gap between siblings (same parent) is a direct
 * origin difference; the actions' top padding is the filler child's own y.
 */
function gaps(app: App) {
  const group = box(app, "group");
  const memberOne = box(app, "member-one");
  const memberTwo = box(app, "member-two");
  const actions = box(app, "actions");
  const filler = box(app, "actions-filler");
  const apply = box(app, "action-apply");
  const cancel = box(app, "action-cancel");

  return {
    // legend→group and group→actions are the root's stack gap, twice.
    legendToGroup: Math.round(group.y - box(app, "legend").height),
    memberGap: Math.round(memberTwo.y - (memberOne.y + memberOne.height)),
    groupToActions: Math.round(actions.y - (group.y + group.height)),
    actionsPadTop: Math.round(filler.y),
    actionGap: Math.round(cancel.x - (apply.x + apply.width)),
  };
}

describe("fieldset mobile", () => {
  // adapt-sheets/fieldset.md M-001 (基线, A-011): the default environment is
  // the desktop-parity baseline — every block of the tree lays out with the
  // upstream spacing (24 stack gap, 16 group spacing, 4 actions pad, 8
  // action gap), the legend renders, the bare string child still renders,
  // and `role`/`id` pass through unchanged.
  test("M-001 default environment: every block measures the upstream spacing", async () => {
    const app = await openMobile("mobile", { input: "pointer" });
    await settleLayout(app);

    const g = gaps(app);
    expect(g.legendToGroup).toBe(24);
    expect(g.memberGap).toBe(16);
    expect(g.groupToActions).toBe(24);
    expect(g.actionsPadTop).toBe(4);
    expect(g.actionGap).toBe(8);

    expect(app.texts()).toContain("Settings");
    // The bare string child of the Root goes through `renderChildren` —
    // the X-001 path — and shows as text.
    expect(app.shows("text:Root note")).toBe(true);
    // `role="group"` + `aria-label` surface as the group's role and name;
    // `testID` is the observable id channel (`id` → nativeID has none).
    expect(app.shows("role:group[Mobile fieldset]")).toBe(true);
    expect(app.shows("id:fieldset-root")).toBe(true);
    expect(app.spanStyle("id:legend >> text:Settings").fontSize).toBe(16);
  });

  // adapt-sheets/fieldset.md M-002 (基线, A-008): `disabled` reaches a real
  // control through `FieldsetContext` — a Button inside the disabled tree is
  // `enabled=false` and its press is refused with no callback — and clearing
  // `disabled` on the same tree restores it: the context accessor follows
  // the signal back without a remount (OR merge, zero drift).
  test("M-002 default environment: disabled propagates and clearing it restores the control", async () => {
    const app = await openMobile("mobile-disabled", { input: "pointer" });
    await settleLayout(app);

    expect(app.enabled("id:member-two")).toBe(false);
    await expect(app.press("id:member-two")).rejects.toMatchObject({
      code: "ERR_NSH_TEST_DISABLED",
    });
    expect(callsOf(app, "member-press")).toHaveLength(0);

    // The toggle lives outside the Root, so it stays pressable while the
    // subtree is disabled; clearing the signal re-enables the member.
    await app.press("id:toggle-disabled");
    await app.waitUntil(() => app.enabled("id:member-two"));

    await app.press("id:member-two");
    expect(callsOf(app, "member-press")).toHaveLength(1);
  });

  // adapt-sheets/fieldset.md M-003 (A-006, A-009): injected `input="touch"`
  // changes nothing fieldset owns — no `input` axis cells and no gesture
  // path, so the inert tree's bounds equal the pointer environment's
  // box-for-box, and every fieldset-owned gap around the interactive
  // member is unchanged. (member-two's own height is the button unit's
  // legitimate `input` adaptation — its own sheet's claim — so it is
  // excluded from the box set; group.y→group.bottom→actions.y still
  // brackets it.) A press on the container records no callback.
  test("M-003 injected touch: identical fieldset bounds, container press records nothing", async () => {
    const touch = await openMobile("mobile", { input: "touch" });
    const pointer = await openMobile("mobile", { input: "pointer" });

    await settleLayout(touch);
    await settleLayout(pointer);

    const withoutMember = (set: Record<string, string[]>) => {
      const { "member-two": _memberTwo, "group": _group, "root": _root, "actions": _actions, ...rest } = set;
      return rest;
    };
    expect(withoutMember(boxSet(touch))).toEqual(
      withoutMember(boxSet(pointer)),
    );

    // Fieldset-owned spacing around the adaptive member: same gap above it,
    // same space-y margin, same stack gap to the actions row.
    const g = (app: App) => {
      const memberTwo = box(app, "member-two");
      const memberOne = box(app, "member-one");
      const group = box(app, "group");
      const actions = box(app, "actions");
      return {
        memberGap: Math.round(memberTwo.y - (memberOne.y + memberOne.height)),
        belowToActions: Math.round(
          actions.y - (memberTwo.y + memberTwo.height),
        ),
        memberTop: Math.round(memberTwo.y - group.y),
      };
    };
    expect(g(touch)).toEqual(g(pointer));

    // 负断言: the container itself is not pressable — no gesture path
    // exists under touch — and nothing records a callback.
    await expect(touch.press("id:fieldset-root")).rejects.toMatchObject({
      code: "ERR_NSH_TEST_NOT_FOUND",
    });
    expect(callsOf(touch, "member-press")).toHaveLength(0);
  });

  // adapt-sheets/fieldset.md M-004 (A-001…A-004): `density="compact"`
  // tightens every spacing literal one step — stack gaps 24→16, group
  // spacing 16→8, actions pad 4→2, action gap 8→6 — and an explicit
  // `density="default"` scope lays out exactly like the uninjected one.
  test("M-004 density compact tightens every gap; explicit default matches", async () => {
    const compact = await openMobile("mobile", {
      input: "pointer",
      density: "compact",
    });
    const plain = await openMobile("mobile", { input: "pointer" });
    const explicit = await openMobile("mobile", {
      input: "pointer",
      density: "default",
    });

    await settleLayout(compact);
    await settleLayout(plain);
    await settleLayout(explicit);

    const g = gaps(compact);
    expect(g.legendToGroup).toBe(16);
    expect(g.memberGap).toBe(8);
    expect(g.groupToActions).toBe(16);
    expect(g.actionsPadTop).toBe(2);
    expect(g.actionGap).toBe(6);

    expect(boxSet(explicit)).toEqual(boxSet(plain));
  });

  // adapt-sheets/fieldset.md M-005 (A-005, A-008): under `compact` the
  // legend keeps its 16pt type scale — density owns spacing only — and the
  // disabled contract still reaches the subtree's controls.
  test("M-005 compact: legend font unchanged, disabled still propagates", async () => {
    const app = await openMobile("mobile", {
      input: "pointer",
      density: "compact",
    });
    await settleLayout(app);

    expect(app.spanStyle("id:legend >> text:Settings").fontSize).toBe(16);

    const disabled = await openMobile("mobile-disabled", {
      input: "pointer",
      density: "compact",
    });
    await settleLayout(disabled);

    expect(disabled.enabled("id:member-two")).toBe(false);
  });

  // adapt-sheets/fieldset.md M-006 (A-011): the fixture's `EnvironmentScope`
  // wrapper is what makes M-003/M-004 possible, and the whole measured tree
  // is the shared observation surface those tests read — under the explicit
  // pointer scope that replaces the old desktop pin's derivation.
  test("M-006 scope: the measured tree mounts and reports under the pointer scope", async () => {
    const app = await openMobile("mobile", { input: "pointer" });
    await settleLayout(app);

    const set = boxSet(app);
    for (const name of MEASURED) {
      expect(set[name]).toBeDefined();
      expect(set[name]!.length).toBeGreaterThan(0);
    }

    // The container mounts under the pointer scope — the baseline M-001…
    // M-005 compare against (touch injection is covered by M-003).
    expect(app.enabled("id:member-two")).toBe(true);
  });
});
