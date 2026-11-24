import { describe, expect, open, test } from "nsh/test";
import type { App, OpenOptions } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Headless mobile assertions for the search-field adapt unit — the rows of
 * adapt-sheets/search-field.md §4 that need capabilities only the headless
 * engine has:
 *
 *   M-002  `app.hover` — the touch hover-suppression row. The native
 *          ios/android CI lanes have no mouse channel, so the row moved
 *          here whole rather than split; `testInput` picks the fixture's
 *          environment exactly as the shared file does.
 *   M-010  `open({platform:"ios"})` host derivation — `--target web`
 *          rejects a `platform` option outright.
 *
 * The fixture is `harness/search-field.fixtures.tsx`; `host.params`:
 * `case` (`layout` for the bounds probes, `basic` for the press→type
 * chain, `hover` for the hover probes) plus `testInput` ("pointer"/"touch"
 * — the same explicit environment pick the shared file uses). M-010's ios
 * opens pass no environment param: the phone-sized host deriving
 * `input == "touch"` on its own is the subject (the switch / tabs /
 * date-input-group headless convention).
 */

type Bounds = { origin: { x: number; y: number }; size: { width: number; height: number } };

type GroupProps = {
  isHovered: boolean;
  isFocusWithin: boolean;
  isFocusVisible: boolean;
  isDisabled: boolean;
  isInvalid: boolean;
};

type InputProps = {
  isHovered: boolean;
  isFocused: boolean;
  isFocusVisible: boolean;
  isDisabled: boolean;
  isInvalid: boolean;
};

function openCase(
  name: string,
  params: Record<string, string> = {},
  options: Pick<OpenOptions, "platform" | "width" | "height"> = {},
): Promise<App> {
  return open("../../../search-field.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    ...options,
    host: { params: { case: name, ...params } },
  });
}

function openIos(name: string): Promise<App> {
  return openCase(name, {}, { platform: "ios", width: 390, height: 844 });
}

const INPUT = "label:Search";

function lastOf<T>(app: App, name: string): T {
  const all = callsOf(app, name);
  const found = all[all.length - 1]?.[0] as T | undefined;

  if (found === undefined) throw new Error(`the fixture recorded no ${name} call`);

  return found;
}

describe("search-field mobile (headless)", () => {
  // adapt-sheets/search-field.md M-010 (A-001, A-006): `platform:"ios"`
  // with no `EnvironmentScope` — the host derives `input()==="touch"` on
  // its own, so the `min-h-11` group floor applies (the `layout` case's
  // `group-layout` probe reports the bounds) and the press→focus→type
  // editing chain works exactly as the injected half (M-005) does.
  test("M-010 ios host derivation: 44pt group floor and the press-to-type chain without a scope", async () => {
    const layout = await openIos("layout");
    await layout.waitUntil(() => callsOf(layout, "group-layout").length > 0);
    const bounds = lastOf<Bounds>(layout, "group-layout");
    expect(bounds.size.height).toBeGreaterThanOrEqual(44);

    const app = await openIos("basic");

    await app.press("label:Search");
    await app.waitUntil(() => callsOf(app, "onFocus").length > 0);

    await app.type("label:Search", "ios");
    await app.waitUntil(() => callsOf(app, "onChange").length > 0);

    expect(app.value("label:Search")).toBe("ios");
    expect(callsOf(app, "onChange").at(-1)?.[0]).toBe("ios");
    expect(callsOf(app, "onBlur")).toHaveLength(0);
  }, 120_000);

  // adapt-sheets/search-field.md M-002 (A-002, A-003): under touch neither a
  // hover nor a press (whose sticky web hover is the registered hazard)
  // raises `isHovered` — the Group and Input render props stay false and
  // the four `onHover*` callbacks record nothing, which is also what keeps
  // the hover fill classes off (they ride the same `hovered` signal; class
  // names are not observable). The press itself still lands: the input
  // focuses. Under pointer the hover round-trips exactly as on desktop.
  test("M-002 injected touch suppresses group and input hover; pointer keeps it", async () => {
    const touch = await openCase("hover", { testInput: "touch" });

    await touch.hover("id:sf-group");
    await touch.hover("id:sf-input");
    // The press itself still lands: the input's `isFocused` render prop
    // rises (the hover case wires no `onFocus` probe — the render props
    // are its focus channel).
    await touch.press(INPUT);
    await touch.waitUntil(() => lastOf<InputProps>(touch, "input-props").isFocused === true);
    await touch.wait(50);

    expect(callsOf(touch, "hover")).toHaveLength(0);
    for (const c of callsOf(touch, "group-props")) {
      expect((c[0] as GroupProps).isHovered).toBe(false);
    }
    for (const c of callsOf(touch, "input-props")) {
      expect((c[0] as InputProps).isHovered).toBe(false);
    }
    touch.dispose();

    const pointer = await openCase("hover", { testInput: "pointer" });

    await pointer.hover("id:sf-input");
    await pointer.waitUntil(() => callsOf(pointer, "hover").length > 0);

    const hoverCalls = callsOf(pointer, "hover").map((c) => c[0] as unknown[]);
    expect(hoverCalls).toContainEqual(["input", "start"]);
    expect(hoverCalls).toContainEqual(["input", "change", true]);
    expect(lastOf<InputProps>(pointer, "input-props").isHovered).toBe(true);
    expect(lastOf<GroupProps>(pointer, "group-props").isHovered).toBe(true);

    // Moving onto the Label (outside the group) ends both hovers.
    await pointer.hover("text:Search");
    await pointer.waitUntil(() => {
      const ends = callsOf(pointer, "hover").filter(
        (c) => (c[0] as unknown[])[1] === "end",
      );
      return ends.length > 0 && lastOf<GroupProps>(pointer, "group-props").isHovered === false;
    });
    expect(lastOf<InputProps>(pointer, "input-props").isHovered).toBe(false);
    pointer.dispose();
  }, 120_000);

  // The typed-half of search-field.mobile.test.tsx M-009's disabled and
  // readonly rows: the shared file drops `app.type` on the non-editable
  // inputs because on a real iOS host the step kills the tester session
  // outright ("no host that takes test steps is connected") and on a
  // focused sibling it leaks the keys in instead. Headless, where the
  // type step simply refuses a non-editable target, the refusal itself
  // is the assertion.
  test("M-009 (typed half): disabled and readonly inputs refuse typed keys", async () => {
    const disabled = await openCase("disabled", { testInput: "pointer" });
    expect(disabled.enabled(INPUT)).toBe(false);
    await disabled.type(INPUT, "x").catch(() => undefined);
    expect(disabled.value(INPUT)).toBe("hero");

    const readonly = await openCase("readonly", { testInput: "pointer" });
    expect(readonly.enabled(INPUT)).toBe(false);
    await readonly.type(INPUT, "x").catch(() => undefined);
    expect(readonly.value(INPUT)).toBe("hero");
  }, 120_000);
});
