import { router } from "expo-router";

import { sendError } from "@/services/error-tracking";
import { SceneName } from "@/types/scene-name";

import {
  customQuickActionHandler,
  flushPendingQuickAction,
  QuickActionId,
  setPendingQuickAction,
} from "./action";

jest.mock<Partial<typeof import("expo-router")>>("expo-router", () => ({
  router: { push: jest.fn() } as unknown as typeof import("expo-router").router,
}));

jest.mock<Partial<typeof import("@/services/error-tracking")>>(
  "@/services/error-tracking",
  () => ({
    sendError: jest.fn(),
  }),
);

const push = jest.mocked(router.push);
const reportError = jest.mocked(sendError);

afterEach(() => {
  setPendingQuickAction();
});

test.each([
  [QuickActionId.Matches, SceneName.Messages],
  [QuickActionId.EditProfile, SceneName.EditProfile],
])("routes %s to %s", (id, route) => {
  customQuickActionHandler({ id, title: id });

  expect(push).toHaveBeenCalledWith(route);
});

test("ignores an empty shortcut", () => {
  customQuickActionHandler();

  expect(push).not.toHaveBeenCalled();
  expect(reportError).not.toHaveBeenCalled();
});

test("reports an unknown shortcut without navigating", () => {
  customQuickActionHandler({ id: "unexpected", title: "Unexpected" });

  expect(push).not.toHaveBeenCalled();
  expect(reportError).toHaveBeenCalledWith(
    new Error("Unknown quick action: unexpected"),
  );
});

test("consumes a pending shortcut once", () => {
  setPendingQuickAction({
    id: QuickActionId.Matches,
    title: "Matches",
  });

  flushPendingQuickAction();
  flushPendingQuickAction();

  expect(push).toHaveBeenCalledTimes(1);
  expect(push).toHaveBeenCalledWith(SceneName.Messages);
});
