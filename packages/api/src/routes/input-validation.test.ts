import { MAX_IMAGE_BYTES } from "@pegada/shared/constants/constants";

import {
  messageListInputSchema,
  messageSendInputSchema,
  signedUploadInputSchema,
  swipeQueryInputSchema,
} from "./input-schemas";

const matchId = "550e8400-e29b-41d4-a716-446655440000";
const dogId = "clh9u9mqh0000qw3i5g2h4q7p";

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
