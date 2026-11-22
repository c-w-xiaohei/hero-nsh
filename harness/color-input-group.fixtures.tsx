import { host, mount, signal, Text, View } from "nsh";
import type { InputRef, JSX } from "nsh";
import { ColorInputGroup, EnvironmentScope } from "@heroui/react";
import { ColorInputGroupFieldContext } from "../src/components/color-input-group/context";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";

/*
 * NSH-only ColorInputGroup fixture (port sheet 4b.3), not a shared scenario.
 *
 * HeroUI 3.2.7's package entry does not export ColorInputGroup: the four parts
 * reach the public API only as `ColorField.Group / Input / Prefix / Suffix`, and
 * ColorField is a later unit. A shared scenario built on `@heroui/react` would
 * therefore fail to compile against the reference package, so the upstream
 * module has no shared scene and no screenshots of its own; this fixture
 * exercises the parts through our public entry instead.
 *
 * It sits next to harness/nsh.json on purpose. NSH takes the entry's own
 * directory as the app root, so an entry under harness/tests/... finds no
 * nsh.json and loses the `@heroui/react` alias and the theme.
 *
 * host.params.case picks the shape:
 *   basic          the minimal group with one Input (the default)
 *   variants       primary, secondary, fullWidth and a prefixed group together,
 *                  for the "every variant mounts with its parts" case
 *   full-width     a single fullWidth group
 *   prefix-suffix  Prefix "#", Suffix "%", both as raw strings
 *   disabled       the Input's own disabled, with an onChange probe
 *   readonly       the Input's own readOnly and a default value, with a probe
 *   controlled     the value lives in a signal; onChange records the payload
 *                  and writes it back, so every keystroke is reported
 *   render-props   the Root className function records the rendered accessors;
 *                  a `blur` button unfocuses the input through its ref
 *
 * A-011's mobile cases (sheet §2):
 *   layout         the Root reports `onLayout` bounds; run once per `scope`
 *   hover          hover probes on Root (isHovered render-prop + onHover*)
 *                  and on the Input, plus onPress probes on the container /
 *                  Prefix / Suffix for the no-press-channel negative
 *   submit         standalone Input with `onSubmit` / `blur` / `onChange`
 *                  probes; host.params `submitBehavior` ("" = unset),
 *                  `type` ("" = unset)
 *   field-mock     a `ColorInputGroupFieldContext.Provider` injects a field
 *                  whose `onSubmit` commits the text (probe `field-submit`)
 *                  and whose `enterKeyHint` reads "done";
 *                  `commit=0` withholds `onSubmit` so only the local one runs
 *   kbd            one group per `enterKeyHint` / `returnKeyType` value, plus
 *                  type / inputMode / autofill / maxLength mounts
 *   press          a bare group carrying no press props at all — the surface
 *                  M-003's negative presses; a View with `onPress` is a press
 *                  target (toolbar's press-root case), so the no-press-channel
 *                  assertion needs probes absent, not just silent
 *   events         the `rest` pass-through probes (`onPaste`, `onKeyPress`,
 *                  `onCompositionChange`) M-007 reads in both environments
 *   baseline       every default-environment contract face in one mount —
 *                  affix text, controlled value, disabled, read-only, the
 *                  render-prop hover / focus-within group and the variant
 *                  row — so M-009 needs a single open (sequential web hosts
 *                  exhaust the target)
 *
 * `host.params.scope` wraps any case: "" = the host's default environment
 * (pointer — the desktop-parity side), "touch" = `EnvironmentScope
 * input="touch"`, the same convention switch/checkbox use.
 */

type Scope = "" | "touch";

function Scoped(props: { children?: JSX.Element }) {
  const scope = String(host.params.scope ?? "") as Scope;

  return scope === "touch" ? (
    <EnvironmentScope input="touch">{props.children}</EnvironmentScope>
  ) : (
    <>{props.children}</>
  );
}

function BasicCase() {
  return (
    <Stage>
      <ColorInputGroup testID="group">
        <ColorInputGroup.Input testID="group-input" placeholder="#000000" />
      </ColorInputGroup>
    </Stage>
  );
}

function VariantsCase() {
  return (
    <Stage>
      <ColorInputGroup testID="group" variant="primary">
        <ColorInputGroup.Input testID="group-input" />
      </ColorInputGroup>
      <ColorInputGroup testID="group" variant="secondary">
        <ColorInputGroup.Input testID="group-input" />
      </ColorInputGroup>
      <ColorInputGroup testID="group" fullWidth>
        <ColorInputGroup.Input testID="group-input" />
      </ColorInputGroup>
      <ColorInputGroup testID="group">
        <ColorInputGroup.Prefix>prefix</ColorInputGroup.Prefix>
        <ColorInputGroup.Input testID="group-input" />
      </ColorInputGroup>
    </Stage>
  );
}

function FullWidthCase() {
  return (
    <Stage>
      <ColorInputGroup testID="group" fullWidth>
        <ColorInputGroup.Input testID="group-input" />
      </ColorInputGroup>
    </Stage>
  );
}

function PrefixSuffixCase() {
  return (
    <Stage>
      <ColorInputGroup testID="group">
        <ColorInputGroup.Prefix>#</ColorInputGroup.Prefix>
        <ColorInputGroup.Input testID="group-input" />
        <ColorInputGroup.Suffix>%</ColorInputGroup.Suffix>
      </ColorInputGroup>
    </Stage>
  );
}

function DisabledCase() {
  return (
    <Stage>
      <ColorInputGroup testID="group">
        <ColorInputGroup.Input disabled testID="group-input" onChange={probe("onChange")} />
      </ColorInputGroup>
    </Stage>
  );
}

function ReadonlyCase() {
  return (
    <Stage>
      <ColorInputGroup testID="group">
        <ColorInputGroup.Input
          readOnly
          defaultValue="#ff0000"
          testID="group-input"
          onChange={probe("onChange")}
        />
      </ColorInputGroup>
    </Stage>
  );
}

function ControlledCase() {
  const value = signal("");

  return (
    <Stage>
      <ColorInputGroup testID="group">
        <ColorInputGroup.Input
          value={value()}
          testID="group-input"
          onChange={(event) => {
            probe("onChange")(event);
            value.set(event.value);
          }}
        />
      </ColorInputGroup>
    </Stage>
  );
}

function RenderPropsCase() {
  const record = probe("root-class");
  let input: InputRef | undefined;

  return (
    <Stage>
      <ColorInputGroup
        testID="group"
        className={({ isHovered, isFocusWithin, isFocusVisible }) => {
          record({
            isHovered: isHovered(),
            isFocusWithin: isFocusWithin(),
            isFocusVisible: isFocusVisible(),
          });

          return "";
        }}
      >
        <ColorInputGroup.Input
          testID="group-input"
          ref={(node) => {
            input = node;
          }}
          onBlur={probe("input-blur")}
          onFocus={probe("input-focus")}
        />
      </ColorInputGroup>
      <View testID="blur" role="button" class="px-3 py-1 bg-default" onPress={() => input?.blur()}>
        <Text>blur</Text>
      </View>
    </Stage>
  );
}

/* A-011: the Root's `onLayout` bounds — M-001 reads `height` under both
 * environments (`min-h-11` lifts the 36 pt row to 44 pt under touch). */
function LayoutCase() {
  const reportLayout = probe("layout");

  return (
    <ColorInputGroup
      testID="group"
      onLayout={(e) =>
        reportLayout({ width: e.bounds.size.width, height: e.bounds.size.height })
      }
    >
      <ColorInputGroup.Prefix>#</ColorInputGroup.Prefix>
      <ColorInputGroup.Input testID="group-input" placeholder="#000000" />
      <ColorInputGroup.Suffix>%</ColorInputGroup.Suffix>
    </ColorInputGroup>
  );
}

/* A-011: the hover face both parts gate on `input` — the Root's `isHovered`
 * render-prop accessor plus its `onHover*` callbacks, and the Input's own
 * pair — and the press probes that prove the container / affixes keep no
 * press channel in either environment (M-002's touch half, M-003). */
function HoverCase() {
  const reportRoot = probe("root-class");

  return (
    <ColorInputGroup
      testID="group"
      className={({ isHovered }) => {
        reportRoot({ isHovered: isHovered() });
        return "";
      }}
      onHoverStart={probe("root-hover-start")}
      onHoverEnd={probe("root-hover-end")}
      onHoverChange={probe("root-hover-change")}
      onMouseEnter={probe("root-mouse-enter")}
      onMouseLeave={probe("root-mouse-leave")}
      onPress={probe("root-press")}
    >
      <ColorInputGroup.Prefix onPress={probe("prefix-press")}>#</ColorInputGroup.Prefix>
      <ColorInputGroup.Input
        testID="group-input"
        placeholder="#000000"
        onHoverStart={probe("input-hover-start")}
        onHoverEnd={probe("input-hover-end")}
        onHoverChange={probe("input-hover-change")}
      />
      <ColorInputGroup.Suffix onPress={probe("suffix-press")}>%</ColorInputGroup.Suffix>
    </ColorInputGroup>
  );
}

/* A-011: the standalone submit chain — `app.submit` reports `onSubmit` once,
 * and the default single-line `submitBehavior` also fires `blur`
 * (blurAndSubmit). host.params: `submitBehavior` overrides it ("submit",
 * "blurAndSubmit", "newline"); `type` feeds the keyboard mapping. */
function SubmitCase() {
  const submitBehavior = String(host.params.submitBehavior ?? "");
  const type = String(host.params.type ?? "");

  return (
    <ColorInputGroup testID="group">
      <ColorInputGroup.Input
        testID="group-input"
        placeholder="#000000"
        type={type === "" ? undefined : type}
        submitBehavior={
          submitBehavior === "" ? undefined : (submitBehavior as "submit" | "blurAndSubmit" | "newline")
        }
        onSubmit={probe("onSubmit")}
        onChange={probe("onChange")}
        onBlur={probe("blur")}
        onFocus={probe("focus")}
      />
    </ColorInputGroup>
  );
}

/* A-011: the field half of the submit chain — a mock
 * `ColorInputGroupFieldContext` stands in for the ColorField root (fixture
 * privilege, the same relative import date-input-group's `trigger-focus`
 * uses). `commit=1` (default) gives the field an `onSubmit` so Return commits
 * in place (`submitBehavior` resolves `"submit"`, the blur probe stays
 * silent); `commit=0` withholds it so only the local callback runs. */
function FieldMockCase() {
  const commit = String(host.params.commit ?? "1") !== "0";
  const field = {
    onSubmit: commit ? (e: { text: string }) => probe("field-submit")(e) : undefined,
    enterKeyHint: () => "done" as const,
  };

  return (
    <ColorInputGroupFieldContext.Provider value={field}>
      <ColorInputGroup testID="group">
        <ColorInputGroup.Input
          testID="group-input"
          placeholder="#000000"
          onSubmit={probe("onSubmit")}
          onChange={probe("onChange")}
          onBlur={probe("blur")}
          onFocus={probe("focus")}
        />
      </ColorInputGroup>
    </ColorInputGroupFieldContext.Provider>
  );
}

/* A-011: every value of the keyboard-props chain mounts — mounting is the
 * channel assertion (M-006); what the soft keyboard labels / autofills with
 * them is a real-device acceptance item (sheet §6). */
function KbdCase() {
  return (
    <View class="flex-col gap-2">
      {(["enter", "done", "go", "next", "previous", "search", "send"] as const).map(
        (hint) => (
          <ColorInputGroup>
            <ColorInputGroup.Input testID={`kh-${hint}`} enterKeyHint={hint} />
          </ColorInputGroup>
        ),
      )}
      {(["done", "go", "next", "search", "send"] as const).map((kind) => (
        <ColorInputGroup>
          <ColorInputGroup.Input testID={`kr-${kind}`} returnKeyType={kind} />
        </ColorInputGroup>
      ))}
      <ColorInputGroup>
        <ColorInputGroup.Input testID="k-type" type="email" />
      </ColorInputGroup>
      <ColorInputGroup>
        <ColorInputGroup.Input testID="k-mode" inputMode="numeric" />
      </ColorInputGroup>
      <ColorInputGroup>
        <ColorInputGroup.Input
          testID="k-fill"
          autoComplete="email"
          autoCorrect="off"
          autoCapitalize="none"
        />
      </ColorInputGroup>
      <ColorInputGroup>
        <ColorInputGroup.Input testID="k-max" maxLength={7} />
      </ColorInputGroup>
    </View>
  );
}

/* A-011: the no-press-channel negative (M-003) needs a surface with NO
 * caller press props — a View that hears presses is a press target, so the
 * `hover` case's onPress probes would themselves answer `app.press`. This
 * bare group carries none: `app.press` on an affix must find nothing
 * (NOT_FOUND, the same form toolbar's bare-surface rows use), and the
 * focus/blur probes prove the container never routes a press into the
 * input — there is no press-to-focus channel here. */
function PressCase() {
  return (
    <ColorInputGroup testID="group">
      <ColorInputGroup.Prefix>#</ColorInputGroup.Prefix>
      <ColorInputGroup.Input
        testID="group-input"
        placeholder="#000000"
        onFocus={probe("focus")}
        onBlur={probe("blur")}
      />
      <ColorInputGroup.Suffix>%</ColorInputGroup.Suffix>
    </ColorInputGroup>
  );
}

/* A-011: the `rest` pass-through recorders (M-007) — `onPaste`,
 * `onKeyPress` and `onCompositionChange` ride `rest` to the host input in
 * both environments; the case only wires the recorders, nothing in the
 * component reads them. */
function EventsCase() {
  return (
    <ColorInputGroup testID="group">
      <ColorInputGroup.Input
        testID="group-input"
        placeholder="#000000"
        onPaste={probe("onPaste")}
        onKeyPress={probe("onKeyPress")}
        onCompositionChange={probe("onCompositionChange")}
      />
    </ColorInputGroup>
  );
}

/* A-011: M-009's whole default-environment surface in ONE app — a dozen
 * sequential web hosts in a single test exhausts the `--target web`
 * browser pool, so the baseline row mounts every face it reads at once.
 * Probe names stay the per-case ones (`onChange`, `root-class`,
 * `input-focus`/`input-blur`); only `b-`-prefixed testIDs distinguish the
 * groups. `Stage` wraps nothing: the scroll is part of the mount cost
 * the single open buys. */
function BaselineCase() {
  const value = signal("");
  const record = probe("root-class");
  let input: InputRef | undefined;

  return (
    <View class="flex-col gap-3 p-4">
      <ColorInputGroup testID="b-affix">
        <ColorInputGroup.Prefix>#</ColorInputGroup.Prefix>
        <ColorInputGroup.Input testID="b-affix-input" placeholder="#000000" />
        <ColorInputGroup.Suffix>%</ColorInputGroup.Suffix>
      </ColorInputGroup>

      <ColorInputGroup testID="b-controlled">
        <ColorInputGroup.Input
          testID="b-controlled-input"
          value={value()}
          onChange={(event) => {
            probe("onChange")(event);
            value.set(event.value);
          }}
        />
      </ColorInputGroup>

      <ColorInputGroup testID="b-disabled">
        <ColorInputGroup.Input testID="b-disabled-input" disabled />
      </ColorInputGroup>

      <ColorInputGroup testID="b-readonly">
        <ColorInputGroup.Input
          testID="b-readonly-input"
          readOnly
          defaultValue="#ff0000"
        />
      </ColorInputGroup>

      <ColorInputGroup
        testID="b-rp"
        className={({ isHovered, isFocusWithin, isFocusVisible }) => {
          record({
            isHovered: isHovered(),
            isFocusWithin: isFocusWithin(),
            isFocusVisible: isFocusVisible(),
          });

          return "";
        }}
      >
        <ColorInputGroup.Input
          testID="b-rp-input"
          ref={(node) => {
            input = node;
          }}
          onFocus={probe("input-focus")}
          onBlur={probe("input-blur")}
        />
      </ColorInputGroup>
      <View testID="b-blur" role="button" class="px-3 py-1 bg-default" onPress={() => input?.blur()}>
        <Text>blur</Text>
      </View>

      <ColorInputGroup testID="b-variant" variant="primary">
        <ColorInputGroup.Input />
      </ColorInputGroup>
      <ColorInputGroup testID="b-variant" variant="secondary">
        <ColorInputGroup.Input />
      </ColorInputGroup>
      <ColorInputGroup testID="b-variant" fullWidth>
        <ColorInputGroup.Input />
      </ColorInputGroup>
      <ColorInputGroup testID="b-variant">
        <ColorInputGroup.Prefix>prefix</ColorInputGroup.Prefix>
        <ColorInputGroup.Input />
      </ColorInputGroup>
    </View>
  );
}

function Fixture() {
  const name = String(host.params.case ?? "basic");

  if (name === "variants") return <Scoped><VariantsCase /></Scoped>;
  if (name === "full-width") return <Scoped><FullWidthCase /></Scoped>;
  if (name === "prefix-suffix") return <Scoped><PrefixSuffixCase /></Scoped>;
  if (name === "disabled") return <Scoped><DisabledCase /></Scoped>;
  if (name === "readonly") return <Scoped><ReadonlyCase /></Scoped>;
  if (name === "controlled") return <Scoped><ControlledCase /></Scoped>;
  if (name === "render-props") return <Scoped><RenderPropsCase /></Scoped>;
  if (name === "layout") return <Scoped><LayoutCase /></Scoped>;
  if (name === "hover") return <Scoped><HoverCase /></Scoped>;
  if (name === "submit") return <Scoped><SubmitCase /></Scoped>;
  if (name === "field-mock") return <Scoped><FieldMockCase /></Scoped>;
  if (name === "kbd") return <Scoped><KbdCase /></Scoped>;
  if (name === "press") return <Scoped><PressCase /></Scoped>;
  if (name === "events") return <Scoped><EventsCase /></Scoped>;
  if (name === "baseline") return <Scoped><BaselineCase /></Scoped>;

  return <Scoped><BasicCase /></Scoped>;
}

mount(Fixture);
