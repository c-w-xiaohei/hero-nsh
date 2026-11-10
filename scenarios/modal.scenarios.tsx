import { signal, Text } from "nsh";
import { Button, Modal } from "@heroui/react";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";
import type { Component } from "./types";

/*
 * Shared scenarios for Modal, written with HeroUI's API only.
 *
 * `modal/basic` and `modal/default-open` are the upstream fixture
 * (heroui/packages/react/tests/components/modal/fixtures.tsx): a bare
 * `<Button>Open modal</Button>` inside `Modal` (React Aria's PressResponder
 * channel, port sheet 5.2), Backdrop → Container → Dialog with CloseTrigger,
 * Header/Heading "Welcome", Body and Footer.
 *
 * The story parts (`modal.stories.tsx`) that make a scenario are kept as they
 * appear there: placements, backdrop variants, sizes, the custom Trigger card,
 * the two dismissal switches and the scroll comparison. Story JSX that needs
 * @iconify/react, Tailwind `data-[entering]:` variants, React state or a CDN
 * asset stays out (SOP 3.3); the icon slots get a plain glyph instead.
 *
 * `modal/retained` is the browser case's fixture (modal.browser.test.tsx:16):
 * a controlled backdrop with an inline opacity, a container class and its own
 * wording. The two buttons move that state the way `rerender` does upstream,
 * and `probe("openChange")` records the calls.
 *
 * `modal/labelled` carries the Kobalte dialog suite's texts (title /
 * description); NSH has no id relation channel, so only the text matters
 * (port sheet §5.6).
 *
 * The three regression entries at the end back the X-00x cases:
 * `modal/scroll-outside-long` puts 30 x 40pt rows in an outside-scroll dialog
 * (taller than the 768pt test window, so the carrier has to be a `Scroll`);
 * `modal/backdrop-open` gives `Modal.Backdrop` its own `isOpen`, with the Root
 * left closed; `modal/forwarded-props` puts an `accessibilityLabel` on every
 * part, `onPress` on the Heading and the Backdrop body (`testID="backdrop"`,
 * `isDismissable={false}` so only the caller's handler can run).
 */

/* -------------------------------------------------------------------------------------------------
 * Fixture
 * -----------------------------------------------------------------------------------------------*/

function ModalFixture(props: { defaultOpen?: boolean }) {
  return (
    <Modal defaultOpen={props.defaultOpen} onOpenChange={probe("openChange")}>
      <Button>Open modal</Button>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>Welcome</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <Text>Modal body content</Text>
              <Button>Inside action</Button>
            </Modal.Body>
            <Modal.Footer>
              <Button slot="close">Continue</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function Basic() {
  return (
    <Stage>
      <ModalFixture />
    </Stage>
  );
}

function DefaultOpen() {
  return (
    <Stage>
      <ModalFixture defaultOpen />
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Browser fixture: controlled backdrop with retained content
 * -----------------------------------------------------------------------------------------------*/

function Retained() {
  const open = signal(true);

  return (
    <Stage>
      <Button onPress={() => open.set(true)}>Retained opener</Button>
      <Modal.Backdrop
        isOpen={open()}
        onOpenChange={(isOpen: boolean) => {
          probe("openChange")(isOpen);
          open.set(isOpen);
        }}
        style={{ opacity: 0.8 }}
      >
        <Modal.Container className="opacity-90">
          <Modal.Dialog aria-label="Retained modal">
            <Button onPress={() => open.set(false)}>Hide retained</Button>
            <Text>Retained content</Text>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Stories
 * -----------------------------------------------------------------------------------------------*/

const PLACEMENTS = ["auto", "top", "center", "bottom"] as const;

function Placements() {
  return (
    <Stage>
      {PLACEMENTS.map((placement) => (
        <Modal>
          <Button>{`${placement.charAt(0).toUpperCase()}${placement.slice(1)}`}</Button>
          <Modal.Backdrop>
            <Modal.Container placement={placement}>
              <Modal.Dialog>
                <Modal.CloseTrigger />
                <Modal.Header>
                  <Modal.Heading>{`Placement: ${placement}`}</Modal.Heading>
                </Modal.Header>
                <Modal.Body>
                  <Text>
                    This modal uses the placement option and positions itself on the screen.
                  </Text>
                </Modal.Body>
                <Modal.Footer>
                  <Button slot="close">Continue</Button>
                </Modal.Footer>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>
      ))}
    </Stage>
  );
}

const BACKDROP_VARIANTS = ["opaque", "blur", "transparent"] as const;

function BackdropVariants() {
  return (
    <Stage>
      {BACKDROP_VARIANTS.map((variant) => (
        <Modal>
          <Button>{`${variant.charAt(0).toUpperCase()}${variant.slice(1)}`}</Button>
          <Modal.Backdrop variant={variant}>
            <Modal.Container>
              <Modal.Dialog>
                <Modal.CloseTrigger />
                <Modal.Header>
                  <Modal.Heading>{`Backdrop: ${variant}`}</Modal.Heading>
                </Modal.Header>
                <Modal.Body>
                  <Text>Compare the three backdrop variants.</Text>
                </Modal.Body>
                <Modal.Footer>
                  <Button slot="close">Continue</Button>
                </Modal.Footer>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>
      ))}
    </Stage>
  );
}

const SIZES = ["xs", "sm", "md", "lg", "cover", "full"] as const;

function Sizes() {
  return (
    <Stage>
      {SIZES.map((size) => (
        <Modal>
          <Button>{`${size.charAt(0).toUpperCase()}${size.slice(1)}`}</Button>
          <Modal.Backdrop>
            <Modal.Container size={size}>
              <Modal.Dialog>
                <Modal.CloseTrigger />
                <Modal.Header>
                  <Modal.Heading>{`Size: ${size}`}</Modal.Heading>
                </Modal.Header>
                <Modal.Body>
                  <Text>Each size gives the dialog a different maximum width.</Text>
                </Modal.Body>
                <Modal.Footer>
                  <Button slot="close" variant="secondary">
                    Cancel
                  </Button>
                  <Button slot="close">Confirm</Button>
                </Modal.Footer>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>
      ))}
    </Stage>
  );
}

function CustomTrigger() {
  return (
    <Stage>
      <Modal>
        <Modal.Trigger>
          <Modal.Icon>
            <Text>★</Text>
          </Modal.Icon>
          <Text>Settings</Text>
          <Text>Manage your preferences</Text>
        </Modal.Trigger>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog>
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Icon>
                  <Text>★</Text>
                </Modal.Icon>
                <Modal.Heading>Settings</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <Text>Use Modal.Trigger for custom trigger elements.</Text>
              </Modal.Body>
              <Modal.Footer>
                <Button slot="close" variant="secondary">
                  Cancel
                </Button>
                <Button slot="close">Save</Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </Stage>
  );
}

function DismissBehaviour() {
  return (
    <Stage>
      <Modal onOpenChange={probe("openChange")}>
        <Button>Open dismissable</Button>
        <Modal.Backdrop isDismissable={false}>
          <Modal.Container>
            <Modal.Dialog>
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>isDismissable = false</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <Text>Pressing the backdrop will not close this modal.</Text>
              </Modal.Body>
              <Modal.Footer>
                <Button slot="close">Close</Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
      <Modal onOpenChange={probe("openChange")}>
        <Button>Open keyboard-locked</Button>
        <Modal.Backdrop isKeyboardDismissDisabled>
          <Modal.Container>
            <Modal.Dialog>
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>isKeyboardDismissDisabled = true</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <Text>Escape will not close this modal.</Text>
              </Modal.Body>
              <Modal.Footer>
                <Button slot="close">Close</Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </Stage>
  );
}

function ScrollOutside() {
  return (
    <Stage>
      <Modal defaultOpen onOpenChange={probe("openChange")}>
        <Button>Open modal</Button>
        <Modal.Backdrop>
          <Modal.Container scroll="outside">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>Scroll: Outside</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <Text>Outside keeps the page scrollable behind the dialog.</Text>
                <Text>Paragraph 2: the backdrop carries the scrolling.</Text>
                <Text>Paragraph 3: the container stays at its own height.</Text>
              </Modal.Body>
              <Modal.Footer>
                <Button slot="close" variant="secondary">
                  Cancel
                </Button>
                <Button slot="close">Confirm</Button>
              </Modal.Footer>
              <Modal.CloseTrigger />
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Regression fixtures (X-001 … X-003)
 * -----------------------------------------------------------------------------------------------*/

/* 30 rows of 40pt each: taller than the 768pt window the tests open. */
const LONG_ROWS = Array.from({ length: 30 }, (_, index) => index + 1);

function ScrollOutsideLong() {
  return (
    <Stage>
      <Modal defaultOpen onOpenChange={probe("openChange")}>
        <Button>Open modal</Button>
        <Modal.Backdrop>
          <Modal.Container scroll="outside">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>Scroll: Outside</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                {LONG_ROWS.map((row) => (
                  <Text class="h-10">{`Row ${String(row).padStart(2, "0")}`}</Text>
                ))}
              </Modal.Body>
              <Modal.Footer>
                <Button slot="close">Confirm</Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </Stage>
  );
}

function BackdropOwnOpen() {
  const open = signal(true);

  return (
    <Stage>
      <Modal>
        <Button>Open modal</Button>
        <Modal.Backdrop
          isOpen={open()}
          onOpenChange={(isOpen: boolean) => {
            probe("backdropOpen")(isOpen);
            open.set(isOpen);
          }}
        >
          <Modal.Container>
            <Modal.Dialog>
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>Backdrop-owned modal</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <Text>Backdrop owned content</Text>
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </Stage>
  );
}

function ForwardedProps() {
  return (
    <Stage>
      <Modal defaultOpen>
        <Button>Open modal</Button>
        <Modal.Backdrop
          testID="backdrop"
          isDismissable={false}
          onPress={probe("backdropPress")}
        >
          <Modal.Container placement="top" accessibilityLabel="Forwarded container">
            <Modal.Dialog onPress={probe("dialogPress")}>
              <Modal.CloseTrigger />
              <Modal.Header accessibilityLabel="Forwarded header">
                <Modal.Heading
                  accessibilityLabel="Forwarded heading"
                  onPress={probe("headingPress")}
                >
                  Forwarded heading
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body accessibilityLabel="Forwarded body">
                <Text>Forwarded props content</Text>
              </Modal.Body>
              <Modal.Footer accessibilityLabel="Forwarded footer">
                <Text>Footer text</Text>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </Stage>
  );
}



/* -------------------------------------------------------------------------------------------------
 * Kobalte texts
 * -----------------------------------------------------------------------------------------------*/

function Labelled() {
  return (
    <Stage>
      <Modal defaultOpen>
        <Button>Open modal</Button>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>title</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <Text>description</Text>
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </Stage>
  );
}

export const modalScenarios: Record<string, Component> = {
  "modal/basic": Basic,
  "modal/default-open": DefaultOpen,
  "modal/retained": Retained,
  "modal/placements": Placements,
  "modal/backdrop-variants": BackdropVariants,
  "modal/sizes": Sizes,
  "modal/trigger": CustomTrigger,
  "modal/dismiss-behaviour": DismissBehaviour,
  "modal/scroll-outside": ScrollOutside,
  "modal/scroll-outside-long": ScrollOutsideLong,
  "modal/backdrop-open": BackdropOwnOpen,
  "modal/forwarded-props": ForwardedProps,
  "modal/labelled": Labelled,
};
