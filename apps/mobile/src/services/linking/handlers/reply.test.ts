import * as Notifications from "expo-notifications";

import { NOTIFICATION_ACTION, NOTIFICATION_CATEGORY } from "@pegada/shared/constants/notifications";

import { getTrcpContext } from "@/contexts/trcpContext";
import { sendError } from "@/services/errorTracking";
import { getMatchIdFromUrl, handleReplyAction, isReplyAction } from "./reply";

jest.mock("expo-notifications", () => ({ scheduleNotificationAsync: jest.fn() }));
// Pulled in transitively by ./notification, and untransformed by jest.
jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));
jest.mock("@/contexts/trcpContext", () => ({ getTrcpContext: jest.fn() }));
jest.mock("@/services/errorTracking", () => ({ sendError: jest.fn() }));
jest.mock("@/i18n", () => ({ __esModule: true, default: { t: (key: string) => key } }));

const mutate = jest.fn();
const scheduleNotificationAsync = Notifications.scheduleNotificationAsync as jest.Mock;
const sendErrorMock = sendError as jest.Mock;

(getTrcpContext as jest.Mock).mockReturnValue({ client: { message: { send: { mutate } } } });

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
          categoryIdentifier: overrides.categoryIdentifier ?? NOTIFICATION_CATEGORY.ChatMessage,
          data: { url: overrides.url ?? "chat/match-1/dog-2" },
        },
      },
    },
  }) as unknown as Notifications.NotificationResponse;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("isReplyAction", () => {
  test("only claims a reply on the chat-message category", () => {
    expect(isReplyAction(response({}))).toBe(true);
    expect(
      isReplyAction(response({ actionIdentifier: "expo.modules.notifications.actions.DEFAULT" })),
    ).toBe(false);
    expect(isReplyAction(response({ categoryIdentifier: "match" }))).toBe(false);
  });
});

describe("getMatchIdFromUrl", () => {
  test.each([
    ["chat/match-1/dog-2", "match-1"],
    ["match/match-1/dog-2", undefined],
    [undefined, undefined],
  ])("reads %p as %p", (url, expected) => {
    expect(getMatchIdFromUrl(url)).toBe(expected);
  });
});

describe("handleReplyAction", () => {
  test("sends the typed text to the match the push came from", async () => {
    await handleReplyAction(response({ userText: "  on my way  " }));

    expect(mutate).toHaveBeenCalledWith({ matchId: "match-1", content: "on my way" });
    expect(scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  test.each([
    ["empty text", { userText: "   " }],
    ["a non-chat url", { userText: "hi", url: "match/match-1/dog-2" }],
  ])("reports %s instead of sending", async (_label, overrides) => {
    await handleReplyAction(response(overrides));

    expect(mutate).not.toHaveBeenCalled();
    expect(sendErrorMock).toHaveBeenCalled();
  });

  test("tells the user when the send fails, since the notification is already gone", async () => {
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
