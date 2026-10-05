import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import type * as Notifications from "expo-notifications";

import {
  areNotificationResponsesEnabled,
  clearPendingReplyActions,
  getNotificationReplyClientMessageId,
  getNotificationResponseId,
  queuePendingReplyAction,
  setNotificationResponsesEnabled,
  takePendingReplyActions,
} from "./notificationResponseState";

const response = (userText?: string, identifier = "notification-1") =>
  ({
    actionIdentifier: "reply",
    notification: { request: { identifier } },
    userText,
  }) as Notifications.NotificationResponse;

beforeEach(() => {
  clearPendingReplyActions();
});

describe("notification response identity", () => {
  it("coalesces native replay of the same trimmed reply", () => {
    assert.equal(
      getNotificationResponseId(response(" hello ")),
      getNotificationResponseId(response("hello")),
    );
    assert.equal(
      getNotificationReplyClientMessageId("match-1", response(" hello ")),
      getNotificationReplyClientMessageId("match-1", response("hello")),
    );
  });

  it("gives new text, conversations, and notifications different message IDs", () => {
    const original = getNotificationReplyClientMessageId("match-1", response("hello"));
    const ids = new Set([
      original,
      getNotificationReplyClientMessageId("match-1", response("goodbye")),
      getNotificationReplyClientMessageId("match-2", response("hello")),
      getNotificationReplyClientMessageId("match-1", response("hello", "notification-2")),
    ]);

    assert.equal(ids.size, 4);
    assert.match(original, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});

describe("pending notification replies", () => {
  it("deduplicates replay but preserves a newly authored reply", () => {
    queuePendingReplyAction(response("hello"));
    queuePendingReplyAction(response(" hello "));
    queuePendingReplyAction(response("goodbye"));

    assert.deepEqual(
      takePendingReplyActions().map((pending) => pending.userText),
      [" hello ", "goodbye"],
    );
  });

  it("clears queued replies and disables routing at logout", () => {
    setNotificationResponsesEnabled(true);
    queuePendingReplyAction(response("hello"));

    clearPendingReplyActions();

    assert.equal(areNotificationResponsesEnabled(), false);
    assert.deepEqual(takePendingReplyActions(), []);
  });
});
