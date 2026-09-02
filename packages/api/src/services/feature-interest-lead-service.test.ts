import type { InterestFeature } from "./feature-interest-lead-service";

import prisma from "@pegada/database";

import {
  FeatureInterestLeadService,
  INTEREST_FEATURES,
  parseLeadSubmission,
} from "./feature-interest-lead-service";

/**
 * A fake door that does not exist yet. The unique index is on the pair, not
 * the address, and this is what proves it: the next experiment must be able to
 * ask the same people.
 */
const NEXT_FAKE_DOOR = "ai_video" as InterestFeature;

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.featureInterestLead.deleteMany();
});

const record = (
  email: string,
  feature: InterestFeature = INTEREST_FEATURES.AI_STORY,
) => FeatureInterestLeadService.record({ email, feature, locale: "pt-br" });

describe("recording interest", () => {
  it("keeps the first sign-up", async () => {
    const result = await record("ana@pegada.app");

    expect(result).toStrictEqual({ status: "captured" });

    const rows = await prisma.featureInterestLead.findMany();

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      email: "ana@pegada.app",
      feature: "ai_story",
      locale: "pt-br",
      ref: null,
      utmSource: null,
    });
  });

  it("stores the address lowercased and trimmed", async () => {
    await record("  Ana@Pegada.APP \n");

    const rows = await prisma.featureInterestLead.findMany();

    expect(rows.map((row) => row.email)).toStrictEqual(["ana@pegada.app"]);
  });

  it("treats a second sign-up as already listed, without a second row", async () => {
    await record("ana@pegada.app");

    // Same person, typed the way people actually type: capitals and a stray
    // space. If normalisation ever stops happening this lands as a new row and
    // the experiment reports two signups where there was one.
    const result = await record(" ANA@pegada.app ");

    expect(result).toStrictEqual({ status: "already_listed" });
    expect(await prisma.featureInterestLead.count()).toBe(1);
  });

  it("lets one address wait for two different features", async () => {
    await record("ana@pegada.app");

    const result = await record("ana@pegada.app", NEXT_FAKE_DOOR);

    expect(result).toStrictEqual({ status: "captured" });
    expect(await prisma.featureInterestLead.count()).toBe(2);
  });

  it("keeps the channel the sign-up arrived through", async () => {
    await FeatureInterestLeadService.record({
      email: "ana@pegada.app",
      feature: INTEREST_FEATURES.AI_STORY,
      locale: "en-us",
      ref: "instagram-bio",
      utmSource: "instagram",
      utmMedium: "social",
      utmCampaign: "story-fake-door",
      userAgent: "Mozilla/5.0",
    });

    expect(await prisma.featureInterestLead.findFirst()).toMatchObject({
      locale: "en-us",
      ref: "instagram-bio",
      utmSource: "instagram",
      utmMedium: "social",
      utmCampaign: "story-fake-door",
      userAgent: "Mozilla/5.0",
    });
  });
});

describe("reading a submitted form", () => {
  it("accepts an address and hands it back normalised", () => {
    expect(
      parseLeadSubmission({ email: "  Ana@Pegada.APP ", honeypot: "" }),
    ).toStrictEqual({ email: "ana@pegada.app", kind: "valid" });
  });

  it("rejects anything that is not an address", () => {
    for (const email of ["", "ana", "ana@", "@pegada.app", undefined, 42]) {
      expect(parseLeadSubmission({ email, honeypot: "" })).toStrictEqual({
        kind: "invalid",
      });
    }
  });

  it("reports a filled decoy field before it looks at the address", () => {
    // A valid address alongside a filled honeypot is still a bot, and the
    // caller answers it with the same success screen a person gets.
    expect(
      parseLeadSubmission({
        email: "ana@pegada.app",
        honeypot: "http://spam.example",
      }),
    ).toStrictEqual({ kind: "honeypot" });
  });

  it("ignores a decoy field that only holds whitespace", () => {
    // Some browsers and password managers will put a space in an empty field.
    expect(
      parseLeadSubmission({ email: "ana@pegada.app", honeypot: "   " }),
    ).toStrictEqual({ email: "ana@pegada.app", kind: "valid" });
  });
});
