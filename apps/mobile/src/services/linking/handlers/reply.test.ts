import * as Notifications from "expo-notifications";

import {
  NOTIFICATION_ACTION,
  NOTIFICATION_CATEGORY,
} from "@pegada/shared/constants/notifications";

import { getTrcpContext } from "@/contexts/trcp-context";
import { sendError } from "@/services/error-tracking";

import { getMatchIdFromUrl, handleReplyAction, isReplyAction } from "./reply";

// `Partial<...>` rather than the bare module type: these factories replace the
// one export each test touches, and typing them as the whole module would
// demand a full reimplementation of expo-notifications.
jest.mock<Partial<typeof import("expo-notifications")>>(
  "expo-notifications",
  () => ({
    scheduleNotificationAsync: jest.fn(),
  }),
);
// Pulled in transitively by ./notification, and untransformed by jest.
jest.mock<Partial<typeof import("expo-router")>>("expo-router", () => ({
  router: { push: jest.fn() } as unknown as typeof import("expo-router").router,
}));
jest.mock<Partial<typeof import("@/contexts/trcp-context")>>(
  "@/contexts/trcp-context",
  () => ({
    getTrcpContext: jest.fn(),
  }),
);
jest.mock<Partial<typeof import("@/services/error-tracking")>>(
  "@/services/error-tracking",
  () => ({
    sendError: jest.fn(),
  }),
);
jest.mock<Partial<typeof import("@/i18n")>>("@/i18n", () => ({
  __esModule: true,
  default: {
    t: (key: string) => key,
  } as unknown as typeof import("@/i18n").default,
}));

const mutate = jest.fn();
const scheduleNotificationAsync = jest.mocked(
  Notifications.scheduleNotificationAsync,
);
const sendErrorMock = jest.mocked(sendError);

jest.mocked(getTrcpContext).mockReturnValue({
  client: { message: { send: { mutate } } },
} as unknown as ReturnType<typeof getTrcpContext>);

const response = (overrides: {
  actionIdentifier?: string;
  categoryIdentifier?: string;
  url?: string;
  userText?: string;
}) =>
  ({
    actionIdentifier: overrides.actionIdentifier ?? NOTIFICATION_ACTION.Reply,
    userText: overrides.userText,
    notification: {
      request: {
        content: {
          categoryIdentifier:
            overrides.categoryIdentifier ?? NOTIFICATION_CATEGORY.ChatMessage,
          data: { url: overrides.url ?? "chat/match-1/dog-2" },
        },
      },
    },
  }) as unknown as Notifications.NotificationResponse;

describe("isReplyAction", () => {
  it("only claims a reply on the chat-message category", () => {
    expect(isReplyAction(response({}))).toBe(true);
    expect(
      isReplyAction(
        response({
          actionIdentifier: "expo.modules.notifications.actions.DEFAULT",
        }),
      ),
    ).toBe(false);
    expect(isReplyAction(response({ categoryIdentifier: "match" }))).toBe(
      false,
    );
  });
});

describe("getMatchIdFromUrl", () => {
  it.each([
    ["chat/match-1/dog-2", "match-1"],
    ["match/match-1/dog-2", undefined],
    [undefined, undefined],
  ])("reads %p as %p", (url, expected) => {
    expect(getMatchIdFromUrl(url)).toBe(expected);
  });
});

describe("handleReplyAction", () => {
  it("sends the typed text to the match the push came from", async () => {
    await handleReplyAction(response({ userText: "  on my way  " }));

    expect(mutate).toHaveBeenCalledWith({
      matchId: "match-1",
      content: "on my way",
    });
    expect(scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it.each([
    ["empty text", { userText: "   " }],
    ["a non-chat url", { userText: "hi", url: "match/match-1/dog-2" }],
  ])("reports %s instead of sending", async (_label, overrides) => {
    await handleReplyAction(response(overrides));

    expect(mutate).not.toHaveBeenCalled();
    expect(sendErrorMock).toHaveBeenCalled();
  });

  it("tells the user when the send fails, since the notification is already gone", async () => {
    const error = new Error("offline");
    mutate.mockRejectedValueOnce(error);

    await handleReplyAction(response({ userText: "hi" }));

    expect(sendErrorMock).toHaveBeenCalledWith(error);
    expect(scheduleNotificationAsync).toHaveBeenCalledWith({
      content: { title: "chat.replyFailed", sound: false },
      trigger: null,
    });
  });
});
