import { host, mount, signal, Text, View } from "nsh";
import { Label, Slider } from "@heroui/react";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";

/*
 * NSH-only Slider fixtures (port sheet 4b), not shared scenarios.
 *
 * `nsh/test` cannot read the hidden `type="range"` input, `data-value` /
 * `data-filled` / `data-disabled` or computed styles, so every case records
 * through `probe` what a test can read instead: callbacks, the boxes of Track /
 * Fill / Thumb / Mark from `onLayout`, and the value a Root render prop prints.
 *
 * `onLayout` gives a view's frame before its `translate` (NSH's `measure()`
 * leaves transforms out), so a Thumb's or Mark's percentage anchor is an edge
 * of its box: left/top when it is positioned with `left` / `top`, right or
 * bottom when the direction or the orientation flips it (RTL horizontal,
 * vertical). The tests rebuild the anchor from these boxes.
 *
 * Cases (`host.params.case`):
 *
 *   geometry          value / defaultValue / minValue / maxValue / step /
 *                     orientation / marks / dir; root 400 wide (300 tall when
 *                     vertical); every part reports its box
 *                     (T-003, T-009, T-011, T-024, T-025)
 *   keyboard          uncontrolled 30, onChange / onChangeEnd / onFocus /
 *                     onBlur probes, a value readout and a focus-ring readout
 *                     (T-004 … T-006, T-010)
 *   range-keyboard    [100, 500], max 1000, step 50, two indexed thumbs (T-012)
 *   controlled        value bound to a signal; force-60 sets it (T-007)
 *   controlled-range  a range value, a step and min/max, with two preset
 *                     switches for the parent-driven updates (T-018)
 *   disabled          isDisabled with the same probes and marks
 *                     (T-008, T-021)
 *   indicators        the upstream SliderIndicatorsFixture: 50 at step 25 with
 *                     Steps, default marks and focus probes; marks and Slider
 *                     props overridable from host.params
 *                     (T-014, T-015, T-016, T-017, T-020)
 *   labels            Budget in USD: bare "Free", a formatted 25 and
 *                     "Maximum", with the Mark boxes (T-019)
 *   drag              400 wide, value 0, step 25, marks and probes (T-026)
 *   refs              Steps / Marks / Mark ref callbacks, testID passthrough,
 *                     a custom Mark child and a style object (T-022)
 *   state-defaults    the Root render prop prints `state.defaultValues`; the
 *                     defaultValue / value / minValue / maxValue come from
 *                     host.params (X-001)
 *   mark-children     a Mark whose child probes its own build, so a second read
 *                     of the children shows up as an extra probe (X-002)
 *
 * It sits next to harness/nsh.json on purpose. NSH takes the entry's own
 * directory as the app root, so an entry under harness/tests/... finds no
 * nsh.json and loses the `@heroui/react` alias and the theme.
 */

type LayoutEvent = {
  bounds: {
    origin: { x: number; y: number };
    size: { width: number; height: number };
  };
};

function layoutProbe(name: string, index = 0) {
  return (event: LayoutEvent) =>
    probe("layout")({
      name,
      index,
      x: event.bounds.origin.x,
      y: event.bounds.origin.y,
      width: event.bounds.size.width,
      height: event.bounds.size.height,
    });
}

function num(name: string): number | undefined {
  const raw = host.params[name];

  if (raw === undefined || raw === null || raw === "") return undefined;

  return typeof raw === "number" ? raw : Number(raw);
}

/** A comma list; "NaN" and "Infinity" parse to what a Mark needs to refuse. */
function list(name: string): number[] | undefined {
  const raw = host.params[name];

  if (raw === undefined || raw === null || raw === "") return undefined;

  return String(raw)
    .split(",")
    .map((part) => Number(part.trim()));
}

/** HeroUI's payload: one value stays a number, several become an array. */
function sliderValue(name: string): number | number[] | undefined {
  const parsed = list(name);

  if (!parsed) return undefined;

  return parsed.length === 1 ? parsed[0] : parsed;
}

function thumbIndexes(): number[] {
  const parsed = list("defaultValue") ?? list("value");

  return parsed && parsed.length > 1 ? parsed.map((_, index) => index) : [0];
}

const DEFAULT_MARKS = [0, 25, 50, 75, 100];

/* -------------------------------------------------------------------------------------------------
 * Geometry (T-003, T-009, T-011, T-024, T-025)
 * -----------------------------------------------------------------------------------------------*/

function GeometryCase() {
  const vertical = host.params.orientation === "vertical";
  const dir = host.params.dir === "rtl" ? "rtl" : "ltr";
  const marks = list("marks") ?? DEFAULT_MARKS;
  const indexes = thumbIndexes();

  return (
    <Stage direction={dir}>
      <Slider
        aria-label="Volume"
        className={vertical ? "h-[300px]" : "w-[400px]"}
        defaultValue={sliderValue("defaultValue")}
        maxValue={num("maxValue")}
        minValue={num("minValue")}
        onChange={probe("onChange")}
        onChangeEnd={probe("onChangeEnd")}
        orientation={vertical ? "vertical" : "horizontal"}
        step={num("step")}
      >
        <Label>Volume</Label>
        <Slider.Output testID="output" />
        <Slider.Track testID="track" onLayout={layoutProbe("track")}>
          <Slider.Fill testID="fill" onLayout={layoutProbe("fill")} />
          <Slider.Steps testID="steps" />
          {indexes.map((index) => (
            <Slider.Thumb
              index={index}
              onLayout={layoutProbe("thumb", index)}
              testID="thumb"
            />
          ))}
        </Slider.Track>
        <Slider.Marks testID="marks" onLayout={layoutProbe("marks")}>
          {marks.map((value) => (
            <Slider.Mark
              onLayout={layoutProbe(`mark-${value}`)}
              testID={`mark-${value}`}
              value={value}
            />
          ))}
        </Slider.Marks>
      </Slider>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Keyboard (T-004 … T-006, T-010)
 * -----------------------------------------------------------------------------------------------*/

function KeyboardCase() {
  return (
    <Stage>
      <View class="w-[400px]">
        <Slider defaultValue={30} onChange={probe("onChange")} onChangeEnd={probe("onChangeEnd")}>
          {({ state }) => (
            <>
              <Label>Volume</Label>
              <Slider.Output testID="output" />
              <Slider.Track>
                <Slider.Fill />
                <Slider.Thumb onBlur={probe("onBlur")} onFocus={probe("onFocus")}>
                  {({ isFocusVisible }) => (
                    <Text testID="ring">{isFocusVisible() ? "FocusRing" : "NoRing"}</Text>
                  )}
                </Slider.Thumb>
              </Slider.Track>
              <Text testID="value">{state.values().join(",")}</Text>
            </>
          )}
        </Slider>
      </View>
    </Stage>
  );
}

function RangeKeyboardCase() {
  return (
    <Stage>
      <View class="w-[500px]">
        <Slider
          defaultValue={[100, 500]}
          maxValue={1000}
          minValue={0}
          onChange={probe("onChange")}
          onChangeEnd={probe("onChangeEnd")}
          step={50}
        >
          {({ state }) => (
            <>
              <Label>Price Range</Label>
              <Slider.Output testID="output" />
              <Slider.Track>
                <Slider.Fill />
                <Slider.Thumb index={0} onBlur={probe("onBlur")} onFocus={probe("onFocus")} />
                <Slider.Thumb index={1} onBlur={probe("onBlur")} onFocus={probe("onFocus")} />
              </Slider.Track>
              <Text testID="value">{state.values().join(",")}</Text>
            </>
          )}
        </Slider>
      </View>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Controlled value (T-007, T-018)
 * -----------------------------------------------------------------------------------------------*/

function ControlledCase() {
  const value = signal(40);

  return (
    <Stage>
      <View class="w-[400px]">
        <Slider onChange={probe("onChange")} value={value()}>
          <Label>Volume</Label>
          <Slider.Output testID="output" />
          <Slider.Track>
            <Slider.Fill />
            <Slider.Thumb />
          </Slider.Track>
        </Slider>
      </View>
      <View
        class="bg-default px-3 py-1"
        onPress={() => value.set(60)}
        role="button"
        testID="force-60"
      >
        <Text>force 60</Text>
      </View>
    </Stage>
  );
}

function ControlledRangeCase() {
  const value = signal<number[]>(list("initial") ?? [25, 75]);
  const step = signal<number | undefined>(num("step") ?? 25);
  const min = signal<number | undefined>(num("minValue"));
  const max = signal<number | undefined>(num("maxValue"));
  const marks = list("marks") ?? DEFAULT_MARKS;

  const preset = (suffix: string) => () => {
    const next = list(`next${suffix}Value`);

    if (next) value.set(next);
    step.set(num(`next${suffix}Step`));
    min.set(num(`next${suffix}Min`));
    max.set(num(`next${suffix}Max`));
  };

  return (
    <Stage>
      <View class="w-[400px]">
        <Slider
          maxValue={max()}
          minValue={min()}
          onChange={probe("onChange")}
          step={step()}
          value={value()}
        >
          <Label>Volume</Label>
          <Slider.Output testID="output" />
          <Slider.Track>
            <Slider.Fill />
            <Slider.Thumb index={0} />
            <Slider.Thumb index={1} />
          </Slider.Track>
          <Slider.Marks testID="marks">
            {marks.map((mark) => (
              <Slider.Mark testID={`mark-${mark}`} value={mark} />
            ))}
          </Slider.Marks>
        </Slider>
      </View>
      <View class="bg-default px-3 py-1" onPress={preset("1")} role="button" testID="next-1">
        <Text>next 1</Text>
      </View>
      <View class="bg-default px-3 py-1" onPress={preset("2")} role="button" testID="next-2">
        <Text>next 2</Text>
      </View>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Disabled (T-008, T-021)
 * -----------------------------------------------------------------------------------------------*/

function DisabledCase() {
  return (
    <Stage>
      <View class="w-[400px]">
        <Slider
          defaultValue={50}
          isDisabled
          onChange={probe("onChange")}
          onChangeEnd={probe("onChangeEnd")}
          step={25}
        >
          <Label>Volume</Label>
          <Slider.Output testID="output" />
          <Slider.Track>
            <Slider.Fill />
            <Slider.Thumb
              onBlur={probe("onBlur")}
              onFocus={probe("onFocus")}
              testID="thumb"
            />
          </Slider.Track>
          <Slider.Marks testID="marks">
            {DEFAULT_MARKS.map((mark) => (
              <Slider.Mark testID={`mark-${mark}`} value={mark} />
            ))}
          </Slider.Marks>
        </Slider>
      </View>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Indicators (T-014, T-015, T-016, T-017, T-020)
 * -----------------------------------------------------------------------------------------------*/

function IndicatorsCase() {
  const marks = list("marks") ?? DEFAULT_MARKS;

  return (
    <Stage>
      <View class="w-[400px]">
        <Slider
          defaultValue={sliderValue("defaultValue") ?? 50}
          maxValue={num("maxValue")}
          minValue={num("minValue")}
          onChange={probe("onChange")}
          onChangeEnd={probe("onChangeEnd")}
          step={num("step") ?? 25}
        >
          {({ state }) => (
            <>
              <Label>Volume</Label>
              <Slider.Output testID="output" />
              <Slider.Track testID="track">
                <Slider.Steps testID="steps" />
                <Slider.Fill />
                {state.values().map((_, index) => (
                  <Slider.Thumb
                    index={index}
                    onBlur={probe("onBlur")}
                    onFocus={probe("onFocus")}
                  />
                ))}
              </Slider.Track>
              <Slider.Marks testID="marks">
                {marks.map((value) => (
                  <Slider.Mark testID={`mark-${value}`} value={value} />
                ))}
              </Slider.Marks>
            </>
          )}
        </Slider>
      </View>
      <View
        class="bg-default px-3 py-1"
        onFocus={probe("afterFocus")}
        onPress={probe("afterPress")}
        role="button"
        testID="after"
      >
        <Text>after</Text>
      </View>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Labels (T-019)
 * -----------------------------------------------------------------------------------------------*/

function LabelsCase() {
  return (
    <Stage>
      <View class="w-96">
        <Slider defaultValue={50} formatOptions={{ currency: "USD", style: "currency" }}>
          <Label>Budget</Label>
          <Slider.Track onLayout={layoutProbe("track")} testID="track">
            <Slider.Thumb onLayout={layoutProbe("thumb")} testID="thumb" />
          </Slider.Track>
          <Slider.Marks onLayout={layoutProbe("marks")} testID="marks">
            <Slider.Mark onLayout={layoutProbe("mark-0")} testID="mark-0" value={0}>
              <Text>Free</Text>
            </Slider.Mark>
            <Slider.Mark onLayout={layoutProbe("mark-25")} testID="mark-25" value={25} />
            <Slider.Mark onLayout={layoutProbe("mark-100")} testID="mark-100" value={100}>
              <Text>Maximum</Text>
            </Slider.Mark>
          </Slider.Marks>
        </Slider>
      </View>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Drag (T-026)
 * -----------------------------------------------------------------------------------------------*/

function DragCase() {
  return (
    <Stage>
      <View class="w-[400px]">
        <Slider
          defaultValue={0}
          onChange={probe("onChange")}
          onChangeEnd={probe("onChangeEnd")}
          step={25}
        >
          <Label>Volume</Label>
          <Slider.Output testID="output" />
          <Slider.Track testID="track">
            <Slider.Fill />
            <Slider.Thumb onFocus={probe("onFocus")} testID="thumb" />
          </Slider.Track>
          <Slider.Marks testID="marks">
            {DEFAULT_MARKS.map((mark) => (
              <Slider.Mark testID={`mark-${mark}`} value={mark} />
            ))}
          </Slider.Marks>
        </Slider>
      </View>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Refs (T-022)
 * -----------------------------------------------------------------------------------------------*/

function RefsCase() {
  return (
    <Stage>
      <View class="w-[400px]">
        <Slider aria-label="Volume" defaultValue={50} step={25}>
          <Slider.Track>
            <Slider.Steps
              ref={(node) => probe("ref")({ part: "steps", mounted: node != null })}
              testID="steps"
            />
            <Slider.Thumb />
          </Slider.Track>
          <Slider.Marks
            ref={(node) => probe("ref")({ part: "marks", mounted: node != null })}
            testID="marks"
          >
            <Slider.Mark
              ref={(node) => probe("ref")({ part: "mark", mounted: node != null })}
              style={{ opacity: 0.5 }}
              testID="mark"
              value={25}
            >
              <Text>Quiet</Text>
            </Slider.Mark>
          </Slider.Marks>
        </Slider>
      </View>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Render-prop state and children reads (X-001, X-002)
 * -----------------------------------------------------------------------------------------------*/

function StateDefaultsCase() {
  const controlled = host.params.controlled === true || host.params.controlled === "true";

  return (
    <Stage>
      <View class="w-[400px]">
        <Slider
          aria-label="Volume"
          defaultValue={sliderValue("defaultValue")}
          maxValue={num("maxValue")}
          minValue={num("minValue")}
          value={controlled ? sliderValue("value") : undefined}
        >
          {({ state }) => (
            <>
              <Slider.Output testID="output" />
              <Slider.Track>
                <Slider.Fill />
                <Slider.Thumb />
              </Slider.Track>
              <View testID="default-values">
                <Text>{state.defaultValues.join(",")}</Text>
              </View>
            </>
          )}
        </Slider>
      </View>
    </Stage>
  );
}

/* A child component runs once per build of the children it sits in. */
function MarkChildProbe() {
  probe("markChild")({});

  return <Text>Quiet</Text>;
}

function MarkChildrenCase() {
  return (
    <Stage>
      <View class="w-[400px]">
        <Slider aria-label="Volume" defaultValue={50} step={25}>
          <Slider.Track>
            <Slider.Fill />
            <Slider.Thumb />
          </Slider.Track>
          <Slider.Marks testID="marks">
            <Slider.Mark value={0} />
            <Slider.Mark value={25}>
              <MarkChildProbe />
            </Slider.Mark>
          </Slider.Marks>
        </Slider>
      </View>
    </Stage>
  );
}

function Fixture() {
  const name = String(host.params.case ?? "geometry");

  if (name === "keyboard") return <KeyboardCase />;
  if (name === "range-keyboard") return <RangeKeyboardCase />;
  if (name === "controlled") return <ControlledCase />;
  if (name === "controlled-range") return <ControlledRangeCase />;
  if (name === "disabled") return <DisabledCase />;
  if (name === "indicators") return <IndicatorsCase />;
  if (name === "labels") return <LabelsCase />;
  if (name === "drag") return <DragCase />;
  if (name === "refs") return <RefsCase />;
  if (name === "state-defaults") return <StateDefaultsCase />;
  if (name === "mark-children") return <MarkChildrenCase />;

  return <GeometryCase />;
}

mount(Fixture);
