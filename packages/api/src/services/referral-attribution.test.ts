/**
 * These cover the guards that stand between a link anyone can edit and three
 * columns the readout depends on. The metric is attributed signups over
 * signups: a `ref` that was never checked, or one that gets rewritten on a
 * later login, does not make the number wrong in an obvious way. It makes it
 * quietly wrong, which is worse than having no number at all.
 */
import prisma from "@pegada/database";

import { sendEvent } from "../errors/errors";
import { AuthenticationService } from "./authentication-service";
import {
  attributionForNewAccount,
  trackSignupAttributed,
} from "./referral-attribution";

// Same mock the other auth suites use: `errors.ts` pulls in the ESM-only
// `magic-observability/node`, which jest cannot parse.
jest.mock("../errors/errors", () => ({
  sendError: jest.fn(),
  sendEvent: jest.fn(),
  logDebug: () => undefined,
  errorDebug: () => undefined,
}));

// The OTP request path publishes a mail job. This suite is about what lands in
// the User row on the way past it, not about delivery.
jest.mock("../queue/enqueue", () => ({ enqueue: jest.fn() }));

const events = jest.mocked(sendEvent);

const REFERRER_EMAIL = "referral-referrer@pegada.app";
const INVITED_EMAIL = "referral-invited@pegada.app";
const EMAILS = [REFERRER_EMAIL, INVITED_EMAIL];

const CODE = "123456";

/** Well formed, 25 characters like a cuid, belongs to nobody. */
const MISSING_ID = "z".repeat(25);

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.user.deleteMany({ where: { email: { in: EMAILS } } });
});

const seedReferrer = () =>
  prisma.user.create({ data: { email: REFERRER_EMAIL } });

const seedInvitedWithCode = () =>
  prisma.user.create({
    data: {
      email: INVITED_EMAIL,
      code: CODE,
      codeExpiresAt: new Date(Date.now() + 60_000),
    },
  });

describe("attributionForNewAccount", () => {
  it("attributes a new account to the user whose link it was", async () => {
    const referrer = await seedReferrer();

    await expect(
      attributionForNewAccount({
        email: INVITED_EMAIL,
        referral: { ref: referrer.id, referredDogId: MISSING_ID },
      }),
    ).resolves.toEqual({
      ref: referrer.id,
      referredByUserId: referrer.id,
      referredDogId: MISSING_ID,
      referralSource: null,
    });
  });

  it("keeps a channel token as a source rather than a referrer", async () => {
    // `ref=ig` is the Instagram bio link. It names no account, and the readout
    // still has to be able to tell it apart from an unattributed signup.
    await expect(
      attributionForNewAccount({
        email: INVITED_EMAIL,
        referral: { ref: "ig" },
      }),
    ).resolves.toEqual({
      ref: "ig",
      referredByUserId: null,
      referredDogId: null,
      referralSource: "ig",
    });
  });

  it("attributes nothing when the account already exists", async () => {
    const referrer = await seedReferrer();
    await prisma.user.create({ data: { email: INVITED_EMAIL } });

    await expect(
      attributionForNewAccount({
        email: INVITED_EMAIL,
        referral: { ref: referrer.id },
      }),
    ).resolves.toBeNull();
  });

  it("drops an id-shaped ref that names nobody", async () => {
    // A dead link, not a channel. Storing it as a source would put junk in the
    // column the readout groups by.
    await expect(
      attributionForNewAccount({
        email: INVITED_EMAIL,
        referral: { ref: MISSING_ID },
      }),
    ).resolves.toBeNull();
  });

  it("drops an id-shaped ref whose owner is deleted", async () => {
    const referrer = await prisma.user.create({
      data: { email: REFERRER_EMAIL, deletedAt: new Date() },
    });

    await expect(
      attributionForNewAccount({
        email: INVITED_EMAIL,
        referral: { ref: referrer.id },
      }),
    ).resolves.toBeNull();
  });

  it("refuses a user referring their own email", async () => {
    const referrer = await seedReferrer();

    await expect(
      attributionForNewAccount({
        email: REFERRER_EMAIL,
        referral: { ref: referrer.id },
      }),
    ).resolves.toBeNull();
  });

  it("ignores refs that could not have come from one of our links", async () => {
    const results = await Promise.all(
      [
        "",
        "a",
        "../../etc/passwd",
        "a b",
        'ig\'; DROP TABLE "User"; --',
        "a".repeat(33),
        "<script>",
      ].map((ref) =>
        attributionForNewAccount({ email: INVITED_EMAIL, referral: { ref } }),
      ),
    );

    expect(results).toEqual(results.map(() => null));
  });

  it("keeps the referrer when only the dog id is malformed", async () => {
    const referrer = await seedReferrer();

    await expect(
      attributionForNewAccount({
        email: INVITED_EMAIL,
        referral: { ref: referrer.id, referredDogId: "nope" },
      }),
    ).resolves.toMatchObject({
      referredByUserId: referrer.id,
      referredDogId: null,
    });
  });
});

describe("trackSignupAttributed", () => {
  it("reports ids and a platform, and never an email", () => {
    trackSignupAttributed({
      userId: "user-id",
      attribution: {
        ref: "referrer-id",
        referredByUserId: "referrer-id",
        referredDogId: "dog-id",
        referralSource: null,
      },
      platform: "ios",
    });

    expect(events).toHaveBeenCalledWith("Signup Attributed", {
      distinctId: "user-id",
      ref: "referrer-id",
      referredByUserId: "referrer-id",
      referredDogId: "dog-id",
      referralSource: null,
      platform: "ios",
    });

    const [, properties] = events.mock.calls[0] ?? [];
    expect(JSON.stringify(properties)).not.toContain("@");
  });
});

describe("AuthenticationService referral attribution", () => {
  it("writes attribution on the account the OTP request creates", async () => {
    const referrer = await seedReferrer();

    await expect(
      new AuthenticationService({}).login({
        email: INVITED_EMAIL,
        referral: { ref: referrer.id, referredDogId: MISSING_ID },
        platform: "ios",
      }),
    ).rejects.toThrow();

    await expect(
      prisma.user.findUnique({ where: { email: INVITED_EMAIL } }),
    ).resolves.toMatchObject({
      referredByUserId: referrer.id,
      referredDogId: MISSING_ID,
      referralSource: null,
    });

    expect(events).toHaveBeenCalledWith(
      "Signup Attributed",
      expect.objectContaining({
        ref: referrer.id,
        referredByUserId: referrer.id,
        referredDogId: MISSING_ID,
        platform: "ios",
      }),
    );
  });

  it("records a channel signup with no referrer", async () => {
    await expect(
      new AuthenticationService({}).login({
        email: INVITED_EMAIL,
        referral: { ref: "ig" },
        platform: "android",
      }),
    ).rejects.toThrow();

    await expect(
      prisma.user.findUnique({ where: { email: INVITED_EMAIL } }),
    ).resolves.toMatchObject({
      referredByUserId: null,
      referralSource: "ig",
    });
  });

  it("leaves an existing account's attribution alone on re-login", async () => {
    const referrer = await seedReferrer();
    const invited = await prisma.user.create({
      data: {
        email: INVITED_EMAIL,
        code: CODE,
        codeExpiresAt: new Date(Date.now() + 60_000),
        referredByUserId: null,
      },
    });

    await new AuthenticationService({}).login({
      email: INVITED_EMAIL,
      code: CODE,
      referral: { ref: referrer.id },
    });

    await expect(
      prisma.user.findUnique({ where: { id: invited.id } }),
    ).resolves.toMatchObject({
      referredByUserId: null,
      referralSource: null,
    });

    expect(events).not.toHaveBeenCalled();
  });

  it("logs in normally when the referral is unusable", async () => {
    const invited = await seedInvitedWithCode();

    await expect(
      new AuthenticationService({}).login({
        email: INVITED_EMAIL,
        code: CODE,
        referral: { ref: MISSING_ID },
      }),
    ).resolves.toMatchObject({ id: invited.id });

    expect(events).not.toHaveBeenCalled();
  });
});
