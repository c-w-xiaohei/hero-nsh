import { host, mount, platform, View } from "nsh";
import type { Component, JSX } from "nsh";
import { createInput, EnvironmentScope, Typography } from "@heroui/react";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";

/*
 * NSH-only Typography fixture. Its first job is the inline code regressions
 * (X-003 / X-004); the mobile adapt unit (adapt-sheets/typography.md §2
 * A-011) extends it with case dispatch and environment injection — every
 * 落点 in that sheet is 保留, so the fixture is the observable half of
 * "文本缩放/换行与排版契约两端恒定".
 *
 * `onTextLayout` is an NSH `Text` host prop with no HeroUI equivalent, so these
 * cases cannot live in a shared scenario: the reference app would receive an
 * unknown attribute. The callback reports every laid-out line's box, which is
 * the only channel that sees a line's height (`spanStyle` reports font size but
 * no leading) — and the only one that sees a line's horizontal placement, which
 * the `align="end"` assertion reads (spanStyle reports no textAlign).
 *
 * `host.params.case` picks the shape; an absent or unknown case keeps the
 * original three-paragraph probe, so `typography.heroui.web.test.tsx` sees
 * the byte-identical baseline it was written against:
 *
 *   lines     Three body-sm paragraphs (14 / 24) at the same width carry the
 *             same copy:
 *
 *               plain-sm   the paragraph alone. Every line is 24; the control.
 *               code-sm    the same copy with `Typography.Code` inline where
 *                          the code goes. Every line must still be 24, and
 *                          the code's resolved size must stay 14: the chip is
 *                          a 20-point attachment inside a 24-point strut, so
 *                          it has no reason to grow the line, and it must
 *                          inherit the paragraph's leading instead of getting
 *                          body's 16 / 28.
 *               base-span  the same copy with a nested body `Typography`
 *                          span, whose 16 / 28 is the shape the port wrongly
 *                          put on the code root. Its line must grow to 28,
 *                          which proves the probe sees growth rather than
 *                          reporting the strut for every line.
 *
 *   variants  One part per interesting variant cell — body, body-xs, an
 *             `h2` Heading, a `sm` Paragraph, a Code chip, `align="end"`,
 *             `color="muted"`, `weight="bold"` — each with a `testID`, the
 *             body carrying the `layout` box probe and the aligned one an
 *             `onTextLayout` probe (M-001, M-005, M-006, M-009).
 *   truncate  The same long copy twice in a `w-40` column, once `truncate`
 *             and once natural — `onTextLayout` reports the line counts and
 *             `layout` the box heights the M-003 compare reads.
 *   scaling   Paragraphs exercising the passthrough scaling/wrapping host
 *             props (M-004, M-007): `allowFontScaling={false}` +
 *             `maxFontSizeMultiplier`, `adjustsFontSizeToFit` +
 *             `minimumFontScale`, and `style={{numberOfLines:2,
 *             textOverflow:"ellipsis-middle"}}` next to an uncapped control.
 *   prose     A `Typography.Prose` holding a Heading, a bold Paragraph with a
 *             nested Code chip (the weight-context inheritance M-009 reads)
 *             and a plain Paragraph, the root carrying a `layout` box probe
 *             (M-002, M-005, M-006).
 *
 * `host.params.input` / `host.params.density` feed `EnvironmentScope`; an
 * absent param keeps the host-derived value, so a case opened without them
 * is the desktop-parity baseline (same convention as `kbd.fixtures.tsx`).
 * `EnvProbe` inside the scope reports the host platform and the resolved
 * `input`, so the test can prove the injection took (M-007, M-010).
 *
 * It sits next to harness/nsh.json on purpose: NSH takes the entry's own
 * directory as the app root, so a fixture under harness/tests/... would find
 * no nsh.json and lose the `@heroui/react` alias and the theme.
 */

const COPY =
  "Typography lays out running text at a fixed size and leading, so an inline code chip has to sit inside the paragraph line instead of stretching it. A chip that carries its own body layout, or one whose box is taller than the line it sits in, breaks the rhythm of every paragraph that mentions an API name.";

const NOSCALE_COPY =
  "An unscaled control paragraph long enough to wrap inside the narrow column, so its lines and box are visible to the layout probes either way.";
const FIT_COPY =
  "A fit-to-box paragraph long enough to wrap inside the narrow column; its shrink-to-fit props reach the host and stay inert without a line cap.";
const CLAMP_COPY =
  "A clamped paragraph long enough to need far more than the two lines its style allows, so the numberOfLines style member plus the middle ellipsis report a capped line count through the layout probe.";

type TextLayoutEvent = {
  lines: Array<{
    text: string;
    bounds: {
      origin: { x: number; y: number };
      size: { width: number; height: number };
    };
  }>;
};

function linesProbe(name: string) {
  return (event: TextLayoutEvent) =>
    probe("lines")({
      name,
      lines: event.lines.map((line) => ({
        text: line.text,
        height: line.bounds.size.height,
        x: line.bounds.origin.x,
        width: line.bounds.size.width,
      })),
    });
}

type LayoutEvent = {
  bounds: {
    origin: { x: number; y: number };
    size: { width: number; height: number };
  };
};

/** A full bounds box: name → x/y/width/height, the cross-environment compare surface. */
function layoutProbe(name: string) {
  return (event: LayoutEvent) =>
    probe("layout")({
      name,
      x: event.bounds.origin.x,
      y: event.bounds.origin.y,
      width: event.bounds.size.width,
      height: event.bounds.size.height,
    });
}

/* -------------------------------------------------------------------------------------------------
 * lines (X-003 / X-004): the original three-paragraph probe, unchanged
 * -----------------------------------------------------------------------------------------------*/

function LinesCase() {
  return (
    <>
      <Typography.Paragraph size="sm" className="w-80" onTextLayout={linesProbe("plain-sm")}>
        {COPY}
      </Typography.Paragraph>
      <Typography.Paragraph size="sm" className="w-80" onTextLayout={linesProbe("code-sm")}>
        {"Typography lays out running text at a fixed size and leading, so an inline code chip has to sit inside the paragraph line instead of stretching it. "}
        <Typography.Code>typographyVariants</Typography.Code>
        {" A chip that carries its own body layout, or one whose box is taller than the line it sits in, breaks the rhythm of every paragraph that mentions an API name."}
      </Typography.Paragraph>
      <Typography.Paragraph size="sm" className="w-80" onTextLayout={linesProbe("base-span")}>
        {"Typography lays out running text at a fixed size and leading, so an inline code chip has to sit inside the paragraph line instead of stretching it. "}
        <Typography className="text-base leading-7">baseSpanVariant</Typography>
        {" A chip that carries its own body layout, or one whose box is taller than the line it sits in, breaks the rhythm of every paragraph that mentions an API name."}
      </Typography.Paragraph>
    </>
  );
}

/* -------------------------------------------------------------------------------------------------
 * variants (M-001, M-005, M-006, M-009): one part per variant cell
 * -----------------------------------------------------------------------------------------------*/

function VariantsCase() {
  return (
    <View class="w-40 flex-col items-stretch gap-3">
      <Typography testID="ty-body" onLayout={layoutProbe("ty-body")}>
        Body copy
      </Typography>
      <Typography type="body-xs" testID="ty-bodyxs">
        Body XS copy
      </Typography>
      <Typography.Heading level={2} testID="ty-h2">
        Section title
      </Typography.Heading>
      <Typography.Paragraph size="sm" testID="ty-parasm">
        Small copy
      </Typography.Paragraph>
      <Typography.Code testID="ty-code">const x = 1;</Typography.Code>
      <Typography
        align="end"
        testID="ty-align"
        onTextLayout={linesProbe("ty-align")}
      >
        Aligned end
      </Typography>
      <Typography color="muted" testID="ty-muted">
        Muted copy
      </Typography>
      <Typography weight="bold" testID="ty-bold">
        Bold copy
      </Typography>
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * truncate (M-003, M-005): one-line ellipsis against natural wrapping
 * -----------------------------------------------------------------------------------------------*/

function TruncateCase() {
  return (
    <View class="w-40 flex-col gap-3">
      <Typography
        truncate
        testID="ty-truncate"
        onLayout={layoutProbe("ty-truncate")}
        onTextLayout={linesProbe("ty-truncate")}
      >
        {COPY}
      </Typography>
      <Typography
        testID="ty-wrap"
        onLayout={layoutProbe("ty-wrap")}
        onTextLayout={linesProbe("ty-wrap")}
      >
        {COPY}
      </Typography>
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * scaling (M-004, M-005, M-007): the passthrough scaling/wrapping host props
 * -----------------------------------------------------------------------------------------------*/

function ScalingCase() {
  return (
    <View class="w-40 flex-col gap-3">
      <Typography.Paragraph
        allowFontScaling={false}
        maxFontSizeMultiplier={1.5}
        testID="ty-noscale"
        onLayout={layoutProbe("ty-noscale")}
      >
        {NOSCALE_COPY}
      </Typography.Paragraph>
      <Typography.Paragraph
        adjustsFontSizeToFit
        minimumFontScale={0.5}
        testID="ty-fit"
        onLayout={layoutProbe("ty-fit")}
      >
        {FIT_COPY}
      </Typography.Paragraph>
      <Typography.Paragraph
        style={{ numberOfLines: 2, textOverflow: "ellipsis-middle" }}
        testID="ty-clamp"
        onLayout={layoutProbe("ty-clamp")}
        onTextLayout={linesProbe("ty-clamp")}
      >
        {CLAMP_COPY}
      </Typography.Paragraph>
      <Typography.Paragraph
        testID="ty-uncapped"
        onLayout={layoutProbe("ty-uncapped")}
        onTextLayout={linesProbe("ty-uncapped")}
      >
        {CLAMP_COPY}
      </Typography.Paragraph>
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * prose (M-002, M-005, M-006, M-009): the standalone article container
 * -----------------------------------------------------------------------------------------------*/

function ProseCase() {
  return (
    <Typography.Prose testID="prose" onLayout={layoutProbe("prose")}>
      <Typography.Heading level={3} testID="prose-h">
        Prose heading
      </Typography.Heading>
      <Typography.Paragraph weight="bold" testID="prose-para">
        {"A bold paragraph mentioning "}
        <Typography.Code testID="prose-code">proseCode</Typography.Code>
        {" inline."}
      </Typography.Paragraph>
      <Typography.Paragraph testID="prose-para2">
        Regular prose copy
      </Typography.Paragraph>
    </Typography.Prose>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Cases table + scope
 * -----------------------------------------------------------------------------------------------*/

const cases: Record<string, Component> = {
  lines: LinesCase,
  variants: VariantsCase,
  truncate: TruncateCase,
  scaling: ScalingCase,
  prose: ProseCase,
};

/**
 * `host.params.input` / `host.params.density` feed `EnvironmentScope`; an
 * absent param keeps the host-derived value, so a case opened without them
 * is the desktop-parity baseline. With neither param it renders the children
 * unwrapped — the `lines` baseline stays exactly what X-003 / X-004 opened.
 */
function ScopedMobile(props: { children?: JSX.Element }) {
  const input = String(host.params.input ?? "");
  const density = String(host.params.density ?? "");

  if (input === "" && density === "") {
    return <>{props.children}</>;
  }

  return (
    <EnvironmentScope
      input={input === "touch" || input === "pointer" ? input : undefined}
      density={density === "compact" || density === "default" ? density : undefined}
    >
      {props.children}
    </EnvironmentScope>
  );
}

/**
 * The host's own platform report plus the scope-resolved `input`: inside
 * `ScopedMobile` it reports the injected environment, outside it the
 * host-derived one (pointer on the desktop pin). M-007 and M-010 read it.
 */
function EnvProbe() {
  probe("env")({
    os: platform.os,
    desktop: platform.desktop,
    idiom: platform.idiom,
    input: createInput()(),
  });

  return null;
}

function Fixture() {
  const name = String(host.params.case ?? "lines");
  const Case = cases[name] ?? LinesCase;

  return (
    <Stage>
      <ScopedMobile>
        <EnvProbe />
        <Case />
      </ScopedMobile>
    </Stage>
  );
}

mount(Fixture);
