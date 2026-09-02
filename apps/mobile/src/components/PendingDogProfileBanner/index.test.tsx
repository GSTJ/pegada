import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * Rendered through react-dom/server, matching the other component tests in
 * this package (see NewMatch/index.test.tsx): no React Native transform
 * here, so every RN-flavoured import is stubbed. `View` records the props it
 * was given rather than forwarding them to a host element — `testID` is not
 * a DOM attribute and react-dom logs unknown ones through `console.error`.
 */
const capturedViewProps: Record<string, unknown>[] = [];

jest.mock<Record<string, unknown>>("react-native", () => {
  const { createElement } = require("react") as typeof React;

  return {
    View: (props: { children?: React.ReactNode; testID?: string }) => {
      capturedViewProps.push(props);
      return createElement("div", null, props.children);
    },
  };
});

jest.mock<Record<string, unknown>>("react-native-unistyles", () => ({
  useUnistyles: () => ({ theme: { colors: { text: "#000" } } }),
}));

jest.mock<Record<string, unknown>>("./styles", () => ({
  styles: { banner: {}, textColumn: {}, title: {}, body: {} },
}));

jest.mock<Record<string, unknown>>("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock<Record<string, unknown>>("@/assets/images/Dog.svg", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock<Record<string, unknown>>("@/components/text", () => ({
  Text: ({ children }: { children?: React.ReactNode }) => children,
}));

jest.mock<Record<string, unknown>>("@/services/analytics", () => ({
  analytics: { track: jest.fn() },
}));

// The banner reports itself from a `useEffect`, and `renderToStaticMarkup`
// has no commit phase, so the real one never fires. Running the callback
// inline is how the other tests in this package stub effect-shaped hooks
// (see services/linking/index.test.ts).
jest.mock<Record<string, unknown>>("react", () => {
  const actual = jest.requireActual("react") as typeof React;
  return {
    ...actual,
    useEffect: (effect: () => void) => effect(),
  };
});

let mockPendingDogProfileId: string | undefined;

jest.mock<Record<string, unknown>>(
  "@/services/linking/handlers/pending-dog-profile",
  () => ({
    usePendingDogProfileId: () => mockPendingDogProfileId,
  }),
);

import { analytics } from "@/services/analytics";

import { PendingDogProfileBanner } from ".";

const track = jest.mocked(analytics.track);

const render = (pendingId: string | undefined) => {
  capturedViewProps.length = 0;
  mockPendingDogProfileId = pendingId;
  return renderToStaticMarkup(React.createElement(PendingDogProfileBanner));
};

afterEach(() => {
  track.mockClear();
});

test("renders nothing when there is no pending dog profile", () => {
  const html = render(undefined);

  expect(html).toBe("");
  expect(capturedViewProps).toHaveLength(0);
  expect(track).not.toHaveBeenCalled();
});

test("renders the banner, keyed by its stable testID, when a dog id is pending", () => {
  render("dog-1");

  expect(capturedViewProps[0]?.testID).toBe("signin-pending-dog-profile");
});

// SignIn and OneTimeCode both render this banner for one pending id, so the
// naive "track on mount" would double count every sign in hand off.
test("reports itself once per pending id, across both screens that render it", () => {
  render("dog-track-1");
  render("dog-track-1");

  expect(track).toHaveBeenCalledTimes(1);
  expect(track).toHaveBeenCalledWith({
    event_type: "Dog Link Sign In Banner Shown",
  });

  render("dog-track-2");

  expect(track).toHaveBeenCalledTimes(2);
});

// Open a link, log in, log out, open the same link again: the banner is shown
// a second time, so it has to be reported a second time.
test("reports the same id again after the pending link was consumed", () => {
  render("dog-track-3");
  render(undefined);
  render("dog-track-3");

  expect(track).toHaveBeenCalledTimes(2);
});

test("shows the title before the body, matching the bold-first-sentence copy", () => {
  const html = render("dog-1");

  expect(
    html.indexOf("insertEmail.pendingDogProfileBanner.title"),
  ).toBeLessThan(html.indexOf("insertEmail.pendingDogProfileBanner.body"));
});
