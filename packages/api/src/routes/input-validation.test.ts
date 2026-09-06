import { MAX_IMAGE_BYTES } from "@pegada/shared/constants/constants";

import {
  messageDeleteInputSchema,
  messageListInputSchema,
  messageSendInputSchema,
  recordIdSchema,
  signedUploadInputSchema,
  swipeInputSchema,
  swipeQueryInputSchema,
} from "./input-schemas";

const matchId = "550e8400-e29b-41d4-a716-446655440000";
const dogId = "clh9u9mqh0000qw3i5g2h4q7p";

/**
 * Every shape a real id takes in this database. The legacy one is an actual
 * Match id carried over from the previous system, and it is the reason the
 * chat routes cannot ask for a uuid.
 */
const realIds = {
  uuid: "550e8400-e29b-41d4-a716-446655440000",
  cuid: "clh9u9mqh0000qw3i5g2h4q7p",
  cuid2: "cmtjbfxz60002s0iq2lttngx9",
  legacy: "y3dgn1l5epev33kztknonkwe",
  seed: "seed-dog-matchme",
};

describe("record ids", () => {
  it("accepts every id shape the database actually holds", () => {
    for (const [shape, id] of Object.entries(realIds)) {
      expect([shape, recordIdSchema.safeParse(id).success]).toEqual([
        shape,
        true,
      ]);
    }
  });

  it("still rejects junk", () => {
    expect(recordIdSchema.safeParse("").success).toBe(false);
    expect(recordIdSchema.safeParse("   ").success).toBe(false);
    expect(recordIdSchema.safeParse("a".repeat(65)).success).toBe(false);
    expect(recordIdSchema.safeParse("has space").success).toBe(false);
    expect(recordIdSchema.safeParse("drop/../table").success).toBe(false);
    expect(recordIdSchema.safeParse(42).success).toBe(false);
  });
});

describe("chat routes accept real match ids", () => {
  it("lists, sends and deletes against any id shape", () => {
    for (const [shape, id] of Object.entries(realIds)) {
      expect([
        shape,
        messageListInputSchema.safeParse({ matchId: id }).success,
      ]).toEqual([shape, true]);
      expect([
        shape,
        messageSendInputSchema.safeParse({ matchId: id, content: "oi" })
          .success,
      ]).toEqual([shape, true]);
      expect([
        shape,
        messageDeleteInputSchema.safeParse({ messageId: id }).success,
      ]).toEqual([shape, true]);
    }
  });

  it("swipes against any dog id shape", () => {
    for (const [shape, id] of Object.entries(realIds)) {
      expect([
        shape,
        swipeInputSchema.safeParse({ id, swipeType: "INTERESTED" }).success,
      ]).toEqual([shape, true]);
      expect([
        shape,
        swipeQueryInputSchema.safeParse({ notIn: [id] }).success,
      ]).toEqual([shape, true]);
    }
  });
});

describe("message input limits", () => {
  it("bounds pagination", () => {
    expect(messageListInputSchema.parse({ matchId }).limit).toBe(10);
    expect(
      messageListInputSchema.safeParse({ matchId, limit: 100 }).success,
    ).toBe(true);
    expect(
      messageListInputSchema.safeParse({ matchId, limit: 0 }).success,
    ).toBe(false);
    expect(
      messageListInputSchema.safeParse({ matchId, limit: 101 }).success,
    ).toBe(false);
    expect(
      messageListInputSchema.safeParse({ matchId, limit: 1.5 }).success,
    ).toBe(false);
  });

  it("rejects empty and oversized messages", () => {
    expect(
      messageSendInputSchema.safeParse({ matchId, content: "hello" }).success,
    ).toBe(true);
    expect(
      messageSendInputSchema.safeParse({ matchId, content: "   " }).success,
    ).toBe(false);
    expect(
      messageSendInputSchema.safeParse({
        matchId,
        content: "a".repeat(2_001),
      }).success,
    ).toBe(false);
  });
});

describe("swipe input limits", () => {
  it("bounds page size and the exclusion list", () => {
    expect(swipeQueryInputSchema.safeParse({ limit: 100 }).success).toBe(true);
    expect(swipeQueryInputSchema.safeParse({ limit: 101 }).success).toBe(false);
    expect(swipeQueryInputSchema.safeParse({ limit: -1 }).success).toBe(false);
    expect(
      swipeQueryInputSchema.safeParse({
        notIn: Array.from({ length: 500 }, () => dogId),
      }).success,
    ).toBe(true);
    expect(
      swipeQueryInputSchema.safeParse({
        notIn: Array.from({ length: 501 }, () => dogId),
      }).success,
    ).toBe(false);
  });
});

describe("upload input limits", () => {
  it("accepts only bounded WEBP uploads", () => {
    expect(
      signedUploadInputSchema.safeParse({
        contentLength: MAX_IMAGE_BYTES,
        contentType: "image/webp",
      }).success,
    ).toBe(true);
    expect(
      signedUploadInputSchema.safeParse({
        contentLength: MAX_IMAGE_BYTES + 1,
        contentType: "image/webp",
      }).success,
    ).toBe(false);
    expect(
      signedUploadInputSchema.safeParse({
        contentLength: 1024,
        contentType: "text/html",
      }).success,
    ).toBe(false);
  });
});
