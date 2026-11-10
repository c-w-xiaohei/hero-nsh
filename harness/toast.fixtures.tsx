import { host, mount, signal, Text, View } from "nsh";
import type { Component, JSX } from "nsh";
import { Button, Toast, ToastQueue, toast } from "@heroui/react";
import { probe } from "@scenario/probe";

/*
 * NSH-only Toast fixture, the counterpart of the shared scenarios. The queue is
 * an instance and every behaviour case needs a particular queue state at a
 * particular moment, which a static shared scenario cannot express: these cases
 * seed a queue in the component body (runs once per mount) and, where the case
 * moves after the first frame, expose named Buttons the tests press.
 *
 * `host.params.case` picks the shape; `count`, `maxVisible` and `hotkey`
 * parametrize the keyboard cases (focus-stack). Focus and onClose assertions go
 * through the public `onFocus` / `onBlur` / `onClose` props into
 * `@scenario/probe`, per the port sheet's tester contract; nothing here reaches
 * into the implementation.
 *
 * It sits next to harness/nsh.json on purpose: NSH takes the entry's own
 * directory as the app root, so an entry under harness/tests/... finds no
 * nsh.json and loses the `@heroui/react` alias and the theme.
 */

/* `indicator: null` hides the default icon (HeroUI's documented contract). The
 * cast keeps the fixture compiling whatever optional shape the port gives the
 * field. */
const NO_INDICATOR = null as unknown as JSX.Element;

const TITLES = ["First", "Second", "Third"];

function Frame(props: { children?: JSX.Element }) {
  return <View class="flex-1 items-start gap-4 bg-background p-6">{props.children}</View>;
}

/* T-001: nothing is queued, so the region must not render at all. */
function Empty() {
  const queue = new ToastQueue();

  return (
    <Frame>
      <Toast.Provider queue={queue} />
    </Frame>
  );
}

/* T-002 / T-041 / T-055: one queued toast, default children. */
function Count() {
  const queue = new ToastQueue();

  queue.add({ title: "Saved" });

  return (
    <Frame>
      <Toast.Provider queue={queue} />
    </Frame>
  );
}

/* T-007: the upstream success toast. */
function Success() {
  const queue = new ToastQueue();

  queue.add({ description: "Your changes have been saved.", title: "Saved", variant: "success" });

  return (
    <Frame>
      <Toast.Provider queue={queue} />
    </Frame>
  );
}

/* T-009: a custom close label, through the Provider's function children. */
function CustomCloseLabel() {
  const queue = new ToastQueue();

  queue.add({ title: "Saved" }, { timeout: 0 });

  return (
    <Frame>
      <Toast.Provider queue={queue}>
        {({ toast: item }) => (
          <Toast toast={item}>
            <Toast.Content>
              <Toast.Title>Saved</Toast.Title>
            </Toast.Content>
            <Toast.CloseButton aria-label="Dismiss notification" />
          </Toast>
        )}
      </Toast.Provider>
    </Frame>
  );
}

/* T-010: no indicator at all, so no default icon either. */
function NoIndicator() {
  const queue = new ToastQueue();

  queue.add({ indicator: NO_INDICATOR, title: "No icon" }, { timeout: 0 });

  return (
    <Frame>
      <Toast.Provider queue={queue} />
    </Frame>
  );
}

/* T-011: a custom indicator instead of the default icon. */
function CustomIndicator() {
  const queue = new ToastQueue();

  queue.add({ indicator: <Text testID="custom-indicator">Custom icon</Text>, title: "Custom" }, {
    timeout: 0,
  });

  return (
    <Frame>
      <Toast.Provider queue={queue} />
    </Frame>
  );
}

/* T-012 / T-050: the default toast with its onClose recorded. */
function CloseOnClose() {
  const queue = new ToastQueue();

  queue.add({ title: "Dismiss me" }, { onClose: probe("onClose") });

  return (
    <Frame>
      <Toast.Provider queue={queue} />
    </Frame>
  );
}

/* T-013: default timeout (4000ms). */
function TimeoutDefault() {
  const queue = new ToastQueue();

  queue.add({ title: "Auto dismiss" });

  return (
    <Frame>
      <Toast.Provider queue={queue} />
    </Frame>
  );
}

/* T-047: a one-second timeout. */
function Timed() {
  const queue = new ToastQueue();

  queue.add({ title: "Timed" }, { timeout: 1000 });

  return (
    <Frame>
      <Toast.Provider queue={queue} />
    </Frame>
  );
}

/* T-049: `timeout: 0` keeps the toast open. */
function Persistent() {
  const queue = new ToastQueue();

  queue.add({ title: "Persistent" }, { timeout: 0 });

  return (
    <Frame>
      <Toast.Provider queue={queue} />
    </Frame>
  );
}

/* T-014: a persistent toast updated in place must not start a countdown. */
function PersistentUpdate() {
  const id = signal("");

  return (
    <Frame>
      <Toast.Provider />
      <Button
        onPress={() => {
          id.set(toast("Saving", { timeout: 0 }));
        }}
      >
        Add
      </Button>
      <Button
        onPress={() => {
          toast.update(id(), "Saved", { variant: "success" });
        }}
      >
        Update
      </Button>
    </Frame>
  );
}

/* T-015: an update that omits onClose keeps the original handler. */
function OnCloseUpdate() {
  const id = signal("");

  return (
    <Frame>
      <Toast.Provider />
      <Button
        onPress={() => {
          id.set(toast("Saving", { onClose: probe("onClose"), timeout: 0 }));
        }}
      >
        Add
      </Button>
      <Button
        onPress={() => {
          toast.update(id(), "Saved");
        }}
      >
        Update
      </Button>
      <Button
        onPress={() => {
          toast.close(id());
        }}
      >
        Close
      </Button>
    </Frame>
  );
}

/* T-016: a promise toast that settles at once and then counts down. */
function PromiseToast() {
  return (
    <Frame>
      <Toast.Provider />
      <Button
        onPress={() => {
          toast.promise(Promise.resolve("ok"), {
            error: "Failed",
            loading: "Uploading",
            success: "Uploaded",
          });
        }}
      >
        Promise
      </Button>
    </Frame>
  );
}

/* T-017: updating the timeout restarts the running countdown. */
function TimerReset() {
  const id = signal("");

  return (
    <Frame>
      <Toast.Provider />
      <Button
        onPress={() => {
          id.set(toast("Auto dismiss", { timeout: 1000 }));
        }}
      >
        Add
      </Button>
      <Button
        onPress={() => {
          toast.update(id(), "Auto dismiss", { timeout: 4000 });
        }}
      >
        Update
      </Button>
    </Frame>
  );
}

/* T-018: clear() closes every toast, each onClose once. */
function ClearTwo() {
  const queue = new ToastQueue();

  queue.add({ title: "First" }, { onClose: probe("onCloseA"), timeout: 0 });
  queue.add({ title: "Second" }, { onClose: probe("onCloseB"), timeout: 0 });

  return (
    <Frame>
      <Toast.Provider queue={queue} />
      <Button
        onPress={() => {
          queue.clear();
        }}
      >
        Clear
      </Button>
    </Frame>
  );
}

/* T-025: the indicator swaps in place after an update. */
function Swapped() {
  const id = signal("");

  return (
    <Frame>
      <Toast.Provider />
      <Button
        onPress={() => {
          id.set(toast("Uploading", { isLoading: true, timeout: 0 }));
        }}
      >
        Add
      </Button>
      <Button
        onPress={() => {
          toast.update(id(), "Uploaded", { variant: "success" });
        }}
      >
        Update
      </Button>
    </Frame>
  );
}

/* T-026: the Provider's function children build a custom layout. */
function CustomLayout() {
  const queue = new ToastQueue();

  queue.add({ title: "ignored" }, { timeout: 0 });

  return (
    <Frame>
      <Toast.Provider queue={queue}>
        {({ toast: item }) => (
          <Toast testID="custom-toast" toast={item}>
            <Toast.Content>
              <Toast.Title>Custom layout</Toast.Title>
            </Toast.Content>
          </Toast>
        )}
      </Toast.Provider>
    </Frame>
  );
}

/* T-045 / T-046: the title and the description register as the root's label. */
function Labelled() {
  const queue = new ToastQueue();

  queue.add({ description: "Description", title: "Title" }, { timeout: 0 });

  return (
    <Frame>
      <Toast.Provider queue={queue} />
    </Frame>
  );
}

/* T-030: a custom region label. */
function RegionLabel() {
  const queue = new ToastQueue();

  queue.add({ title: "Saved" }, { timeout: 0 });

  return (
    <Frame>
      <Toast.Provider aria-label="Notifications" queue={queue} />
    </Frame>
  );
}

/*
 * T-020 / T-021 / T-022 / T-023 / T-029 / T-031 / T-032 / T-033: the keyboard
 * cases. Two persistent toasts by default (newest first, so "Second" is the
 * frontmost), a focus probe on every toast root and on the close button, and
 * probes on the region itself. No control buttons, so the Tab order is
 * region → frontmost toast → its close button.
 */
function FocusStack() {
  const count = Number(host.params.count ?? 2);
  const maxVisibleToasts =
    host.params.maxVisible === undefined ? undefined : Number(host.params.maxVisible);
  const hotkeyName = String(host.params.hotkey ?? "default");
  const hotkey =
    hotkeyName === "none" ? [] : hotkeyName === "custom" ? ["ctrlKey", "KeyN"] : undefined;
  const queue = new ToastQueue();

  for (let index = 0; index < count; index++) {
    queue.add({ title: TITLES[index] ?? "First" }, { timeout: 0 });
  }

  return (
    <Frame>
      <Toast.Provider
        hotkey={hotkey}
        maxVisibleToasts={maxVisibleToasts}
        queue={queue}
        onBlur={probe("region-blur")}
        onFocus={probe("region-focus")}
      >
        {({ toast: item }) => (
          <Toast onFocus={probe(`toast-focus-${String(item.content.title)}`)} toast={item}>
            <Toast.Content>
              <Toast.Title>{item.content.title}</Toast.Title>
            </Toast.Content>
            <Toast.CloseButton onFocus={probe("close-focus")} />
          </Toast>
        )}
      </Toast.Provider>
    </Frame>
  );
}

/* T-063: focusing the region pauses the countdown; leaving resumes it. */
function FocusPause() {
  const queue = new ToastQueue();

  queue.add({ title: "Pausing" }, { timeout: 1000 });

  return (
    <Frame>
      <Toast.Provider queue={queue} onBlur={probe("region-blur")} onFocus={probe("region-focus")}>
        {({ toast: item }) => (
          <Toast toast={item}>
            <Toast.Content>
              <Toast.Title>{item.content.title}</Toast.Title>
            </Toast.Content>
          </Toast>
        )}
      </Toast.Provider>
      <Button>Outside</Button>
    </Frame>
  );
}

/* T-062: hovering the stack pauses the countdown; leaving resumes it. */
function HoverPause() {
  const queue = new ToastQueue();

  queue.add({ title: "Pausing" }, { timeout: 1000 });

  return (
    <Frame>
      <Toast.Provider queue={queue} />
      <Button>Outside</Button>
    </Frame>
  );
}

/* T-061: two Providers, each with its own queue. */
function TwoRegions() {
  const queueA = new ToastQueue();
  const queueB = new ToastQueue();

  for (let index = 0; index < 3; index++) {
    queueA.add({ title: `A${index}` }, { timeout: 0 });
  }
  for (let index = 0; index < 2; index++) {
    queueB.add({ title: `B${index}` }, { timeout: 0 });
  }

  return (
    <Frame>
      <Toast.Provider aria-label="Region A" placement="top start" queue={queueA} width={240} />
      <Toast.Provider
        aria-label="Region B"
        placement="bottom start"
        queue={queueB}
        width={240}
      />
    </Frame>
  );
}

/* T-059: four queued toasts, only three visible, all four rendered. */
function MaxVisibleThree() {
  const queue = new ToastQueue();

  for (let index = 0; index < 4; index++) {
    queue.add({ title: `Toast ${index}` }, { timeout: 0 });
  }

  return (
    <Frame>
      <Toast.Provider maxVisibleToasts={3} queue={queue} />
    </Frame>
  );
}

/* T-060: a dismissed toast leaves the list; the next one is a fresh entry. */
function DismissedList() {
  const id = signal("");

  return (
    <Frame>
      <Toast.Provider maxVisibleToasts={1} />
      <Button
        onPress={() => {
          id.set(toast("Only one", { timeout: 0 }));
        }}
      >
        Show
      </Button>
      <Button
        onPress={() => {
          toast.close(id());
        }}
      >
        Dismiss
      </Button>
    </Frame>
  );
}

/* T-051: closing through the queue, not the close button. */
function CloseKey() {
  const id = signal("");

  return (
    <Frame>
      <Toast.Provider />
      <Button
        onPress={() => {
          id.set(toast("Close me", { timeout: 0 }));
        }}
      >
        Show
      </Button>
      <Button
        onPress={() => {
          toast.close(id());
        }}
      >
        Close toast
      </Button>
    </Frame>
  );
}

/* T-052: update replaces the text in place. */
function UpdateText() {
  const id = signal("");

  return (
    <Frame>
      <Toast.Provider />
      <Button
        onPress={() => {
          id.set(toast("Initial", { timeout: 0 }));
        }}
      >
        Show
      </Button>
      <Button
        onPress={() => {
          toast.update(id(), "Updated");
        }}
      >
        Update
      </Button>
    </Frame>
  );
}

/* T-053: a promise toast that resolves after a second, with the data in the text. */
function PromiseResolve() {
  return (
    <Frame>
      <Toast.Provider />
      <Button
        onPress={() => {
          toast.promise(
            new Promise<string>((resolve) => {
              setTimeout(() => resolve("data"), 1000);
            }),
            {
              error: "rejected",
              loading: "pending",
              success: (data: string) => `fulfilled - ${data}`,
            },
          );
        }}
      >
        Promise
      </Button>
    </Frame>
  );
}

/* T-054: the rejected branch, with the error's message in the text. */
function PromiseReject() {
  return (
    <Frame>
      <Toast.Provider />
      <Button
        onPress={() => {
          toast.promise(
            new Promise<string>((_, reject) => {
              setTimeout(() => reject(new Error("error")), 1000);
            }),
            {
              error: (error: Error) => `rejected - ${error.message}`,
              loading: "pending",
              success: "fulfilled",
            },
          );
        }}
      >
        Promise
      </Button>
    </Frame>
  );
}

const cases: Record<string, Component> = {
  empty: Empty,
  count: Count,
  success: Success,
  "custom-close-label": CustomCloseLabel,
  "no-indicator": NoIndicator,
  "custom-indicator": CustomIndicator,
  "close-onclose": CloseOnClose,
  "timeout-default": TimeoutDefault,
  timed: Timed,
  persistent: Persistent,
  "persistent-update": PersistentUpdate,
  "onclose-update": OnCloseUpdate,
  promise: PromiseToast,
  "timer-reset": TimerReset,
  "clear-two": ClearTwo,
  swapped: Swapped,
  "custom-layout": CustomLayout,
  labelled: Labelled,
  "region-label": RegionLabel,
  "focus-stack": FocusStack,
  "focus-pause": FocusPause,
  "hover-pause": HoverPause,
  "two-regions": TwoRegions,
  "maxvisible-three": MaxVisibleThree,
  "dismissed-list": DismissedList,
  "close-key": CloseKey,
  "update-text": UpdateText,
  "promise-resolve": PromiseResolve,
  "promise-reject": PromiseReject,
};

function Fixture() {
  const Case = cases[String(host.params.case ?? "empty")] ?? Empty;

  return <Case />;
}

mount(Fixture);
