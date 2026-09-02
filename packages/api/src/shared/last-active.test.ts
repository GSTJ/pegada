import type { PrismaClient } from "@prisma/client";

import { sendError } from "../errors/errors";
import {
  authenticatedProcedure,
  createInnerTRPCContext,
  createTRPCRouter,
  publicProcedure,
} from "../trpc";
import { LAST_ACTIVE_THROTTLE_MS } from "./last-active";

/**
 * `User.lastActiveAt` is the column every retention and dormancy report reads,
 * and it is written from the middleware every authenticated request passes
 * through. Two things have to hold at once and they pull against each other:
 * the value has to be recorded, and recording it must not turn one row into
 * the hottest write in the API.
 *
 * So these drive the real tRPC middleware with a fake database rather than
 * calling the helper directly. What is being asserted is which requests
 * produce a write, and that is a property of the middleware chain.
 */
jest.mock("@pegada/database", () => ({ prisma: {} }));

jest.mock("../errors/errors", () => ({
  sendError: jest.fn(),
  logDebug: jest.fn(),
  errorDebug: jest.fn(),
}));

/** Ships ESM only, which this suite's CommonJS transform cannot load. */
jest.mock("superjson", () => ({
  __esModule: true,
  default: {
    serialize: (value: unknown) => value,
    deserialize: (value: unknown) => value,
  },
}));

const executeRaw = jest.fn();
const db = { $executeRaw: executeRaw } as unknown as PrismaClient;

const router = createTRPCRouter({
  authed: authenticatedProcedure.query(() => "pong"),
  open: publicProcedure.query(() => "pong"),
});

const callerFor = (userId?: string) =>
  router.createCaller({
    ...createInnerTRPCContext({
      session: userId ? { user: { id: userId } } : null,
    }),
    db,
  });

/**
 * `$executeRaw` is a tagged template, so a call arrives as the literal's
 * fragments followed by its interpolated values. Rejoining them with `?` gives
 * back a readable statement with the parameters marked, which is what these
 * assertions are about: the statement must name one column and carry its own
 * freshness guard.
 */
const writeAt = (index: number) => {
  const [fragments, ...values] = executeRaw.mock.calls[index] as [
    string[],
    ...unknown[],
  ];

  return { sql: fragments.join("?").replaceAll(/\s+/gu, " ").trim(), values };
};

/**
 * The write is fire and forget, so the procedure resolves before it does.
 * A macrotask hop is enough for the query promise and its `.catch`.
 */
const flushPendingWrite = () =>
  new Promise((resolve) => {
    setImmediate(resolve);
  });

const START = Date.parse("2026-09-01T12:00:00.000Z");

let clock = START;

beforeEach(() => {
  clock = START;
  jest.spyOn(Date, "now").mockImplementation(() => clock);
  executeRaw.mockImplementation(async () => 1);
});

afterEach(() => {
  jest.restoreAllMocks();
});

it("records activity on the first authenticated request for a user", async () => {
  await expect(callerFor("user-first-request").authed()).resolves.toBe("pong");
  await flushPendingWrite();

  expect(executeRaw).toHaveBeenCalledTimes(1);

  const { sql, values } = writeAt(0);

  // One column, so `updatedAt` keeps meaning "the profile was edited", and a
  // guard the database evaluates, so a second instance racing on the same row
  // updates nothing rather than overwriting a fresher value. Deleted accounts
  // hold a valid token until it expires and must not count as active.
  expect(sql).toBe(
    'UPDATE "User" SET "lastActiveAt" = ? WHERE "id" = ? AND "deletedAt" IS NULL AND ("lastActiveAt" IS NULL OR "lastActiveAt" < ?)',
  );
  expect(values).toEqual([
    new Date(START),
    "user-first-request",
    new Date(START - LAST_ACTIVE_THROTTLE_MS),
  ]);
});

it("does not write again for a second request inside the throttle window", async () => {
  const caller = callerFor("user-inside-window");

  await caller.authed();
  await flushPendingWrite();
  expect(executeRaw).toHaveBeenCalledTimes(1);

  clock = START + LAST_ACTIVE_THROTTLE_MS - 1;

  await caller.authed();
  await flushPendingWrite();

  expect(executeRaw).toHaveBeenCalledTimes(1);
});

it("writes again once the throttle window has passed", async () => {
  const caller = callerFor("user-past-window");

  await caller.authed();
  await flushPendingWrite();

  clock = START + LAST_ACTIVE_THROTTLE_MS;

  await caller.authed();
  await flushPendingWrite();

  expect(executeRaw).toHaveBeenCalledTimes(2);
  expect(writeAt(1).values).toEqual([
    new Date(clock),
    "user-past-window",
    new Date(clock - LAST_ACTIVE_THROTTLE_MS),
  ]);
});

it("records nothing for a request without a session", async () => {
  await expect(callerFor().authed()).rejects.toMatchObject({
    code: "UNAUTHORIZED",
  });
  await expect(callerFor().open()).resolves.toBe("pong");
  await flushPendingWrite();

  expect(executeRaw).not.toHaveBeenCalled();
});

it("reports a rejected write instead of failing the request", async () => {
  const failure = new Error("connection reset");
  executeRaw.mockRejectedValueOnce(failure);

  await expect(callerFor("user-write-rejects").authed()).resolves.toBe("pong");
  await flushPendingWrite();

  expect(sendError).toHaveBeenCalledWith(
    failure,
    expect.objectContaining({ userId: "user-write-rejects" }),
  );
});

it("reports a write that throws before it returns a promise", async () => {
  const failure = new Error("pool exhausted");
  executeRaw.mockImplementationOnce(() => {
    throw failure;
  });

  await expect(callerFor("user-write-throws").authed()).resolves.toBe("pong");
  await flushPendingWrite();

  expect(sendError).toHaveBeenCalledWith(
    failure,
    expect.objectContaining({ userId: "user-write-throws" }),
  );
});
