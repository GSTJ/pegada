import prisma from "@pegada/database";

import { handleCheckPushReceipts, handleSendPushNotification } from "./push";

// The mocks live inside the factory because jest hoists it above the import
// of the module under test, which builds its Expo client at load time.
jest.mock("expo-server-sdk", () => {
  const send = jest.fn();
  const getReceipts = jest.fn();

  return {
    Expo: class {
      sendPushNotificationsAsync = send;
      getPushNotificationReceiptsAsync = getReceipts;
    },
    __send: send,
    __getReceipts: getReceipts,
  };
});

jest.mock("../enqueue", () => ({ enqueue: jest.fn() }));

jest.mock("../../errors/errors", () => ({ sendError: jest.fn() }));

jest.mock("../../services/user-service", () => ({
  UserService: { blacklistPushToken: jest.fn() },
}));

jest.mock("../../shared/observability", () => ({
  observability: {
    enabled: false,
    disabledReason: "explicitly-disabled",
    capture: jest.fn(),
    captureError: jest.fn(),
    identify: jest.fn(),
    reset: jest.fn(),
    register: jest.fn(),
    flush: jest.fn(),
    shutdown: jest.fn(),
  },
  getPostHogNode: jest.fn(() => null),
}));

const { __getReceipts: mockGetReceipts, __send: mockSend } = jest.requireMock(
  "expo-server-sdk",
) as { __getReceipts: jest.Mock; __send: jest.Mock };

const { enqueue } = jest.requireMock("../enqueue") as { enqueue: jest.Mock };

const { UserService } = jest.requireMock("../../services/user-service") as {
  UserService: { blacklistPushToken: jest.Mock };
};

const { observability } = jest.requireMock("../../shared/observability") as {
  observability: { capture: jest.Mock };
};

const PUSH_TOKEN = "ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]";
const USER_ID = "user-under-test";

const seedLog = () =>
  prisma.notificationLog.create({
    data: {
      userId: USER_ID,
      kind: "likes_waiting",
      dedupeKey: `likes_waiting:${USER_ID}:${Math.random()}`,
    },
    select: { id: true },
  });

beforeEach(async () => {
  await prisma.notificationLog.deleteMany({ where: { userId: USER_ID } });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("handleSendPushNotification", () => {
  it("records the ticket Expo handed back", async () => {
    const log = await seedLog();

    mockSend.mockResolvedValue([{ status: "ok", id: "ticket-1" }]);

    await handleSendPushNotification({
      to: PUSH_TOKEN,
      title: "oi",
      body: "tem gente esperando",
      userId: USER_ID,
      pushKind: "likes_waiting",
      notificationLogId: log.id,
    });

    expect(observability.capture).toHaveBeenCalledWith("Push Ticket Result", {
      distinctId: USER_ID,
      error_code: null,
      kind: "likes_waiting",
      status: "ok",
    });

    await expect(
      prisma.notificationLog.findUniqueOrThrow({
        where: { id: log.id },
        select: { ticketError: true, ticketStatus: true },
      }),
    ).resolves.toEqual({ ticketError: null, ticketStatus: "ok" });

    // A ticket with an id is a push to ask about later.
    expect(enqueue).toHaveBeenCalledWith(
      "check-push-receipts",
      {
        receipts: [
          {
            id: "ticket-1",
            pushToken: PUSH_TOKEN,
            userId: USER_ID,
            pushKind: "likes_waiting",
            notificationLogId: log.id,
          },
        ],
      },
      expect.anything(),
    );
  });

  it("records a rejected ticket with its code", async () => {
    const log = await seedLog();

    mockSend.mockResolvedValue([
      { status: "error", details: { error: "DeviceNotRegistered" } },
    ]);

    await handleSendPushNotification({
      to: PUSH_TOKEN,
      title: "oi",
      userId: USER_ID,
      pushKind: "match",
      notificationLogId: log.id,
    });

    expect(observability.capture).toHaveBeenCalledWith("Push Ticket Result", {
      distinctId: USER_ID,
      error_code: "DeviceNotRegistered",
      kind: "match",
      status: "error",
    });

    await expect(
      prisma.notificationLog.findUniqueOrThrow({
        where: { id: log.id },
        select: { ticketError: true, ticketStatus: true },
      }),
    ).resolves.toEqual({
      ticketError: "DeviceNotRegistered",
      ticketStatus: "error",
    });

    expect(UserService.blacklistPushToken).toHaveBeenCalledWith(PUSH_TOKEN);
  });

  it("keeps the attribution out of the message handed to Expo", async () => {
    mockSend.mockResolvedValue([{ status: "ok", id: "ticket-2" }]);

    await handleSendPushNotification({
      to: PUSH_TOKEN,
      title: "oi",
      userId: USER_ID,
      pushKind: "message",
    });

    const [[[message]]] = mockSend.mock.calls;

    expect(message).not.toHaveProperty("userId");
    expect(message).not.toHaveProperty("pushKind");
    expect(message).not.toHaveProperty("notificationLogId");
    expect(message).toMatchObject({ to: PUSH_TOKEN, title: "oi" });
  });
});

describe("handleCheckPushReceipts", () => {
  it("records what the device said and stamps the log", async () => {
    const log = await seedLog();

    mockGetReceipts.mockResolvedValue({ "ticket-1": { status: "ok" } });

    await handleCheckPushReceipts({
      receipts: [
        {
          id: "ticket-1",
          pushToken: PUSH_TOKEN,
          userId: USER_ID,
          pushKind: "likes_waiting",
          notificationLogId: log.id,
        },
      ],
    });

    expect(observability.capture).toHaveBeenCalledWith("Push Receipt Result", {
      distinctId: USER_ID,
      error_code: null,
      kind: "likes_waiting",
      status: "ok",
    });

    await expect(
      prisma.notificationLog.findUniqueOrThrow({
        where: { id: log.id },
        select: { receiptError: true, receiptStatus: true },
      }),
    ).resolves.toEqual({ receiptError: null, receiptStatus: "ok" });

    expect(enqueue).not.toHaveBeenCalled();
  });

  it("records a failed delivery and blacklists a dead device", async () => {
    const log = await seedLog();

    mockGetReceipts.mockResolvedValue({
      "ticket-1": {
        status: "error",
        details: { error: "DeviceNotRegistered" },
      },
    });

    await handleCheckPushReceipts({
      receipts: [
        {
          id: "ticket-1",
          pushToken: PUSH_TOKEN,
          userId: USER_ID,
          pushKind: "likes_waiting",
          notificationLogId: log.id,
        },
      ],
    });

    expect(observability.capture).toHaveBeenCalledWith("Push Receipt Result", {
      distinctId: USER_ID,
      error_code: "DeviceNotRegistered",
      kind: "likes_waiting",
      status: "error",
    });

    await expect(
      prisma.notificationLog.findUniqueOrThrow({
        where: { id: log.id },
        select: { receiptError: true, receiptStatus: true },
      }),
    ).resolves.toEqual({
      receiptError: "DeviceNotRegistered",
      receiptStatus: "error",
    });

    expect(UserService.blacklistPushToken).toHaveBeenCalledWith(PUSH_TOKEN);
  });

  it("says nothing about a receipt that has not settled, and asks again", async () => {
    const log = await seedLog();

    mockGetReceipts.mockResolvedValue({ "ticket-1": { status: "pending" } });

    const reference = {
      id: "ticket-1",
      pushToken: PUSH_TOKEN,
      userId: USER_ID,
      pushKind: "likes_waiting" as const,
      notificationLogId: log.id,
    };

    await handleCheckPushReceipts({ receipts: [reference] });

    expect(observability.capture).not.toHaveBeenCalled();

    await expect(
      prisma.notificationLog.findUniqueOrThrow({
        where: { id: log.id },
        select: { receiptStatus: true },
      }),
    ).resolves.toEqual({ receiptStatus: null });

    // The attribution goes back on the queue with it, otherwise the retry
    // would land as an unattributed event.
    expect(enqueue).toHaveBeenCalledWith(
      "check-push-receipts",
      { receipts: [reference] },
      expect.anything(),
    );
  });
});
