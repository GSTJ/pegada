import prisma from "@pegada/database";

import { AuthenticationService } from "./authentication-service";

// `enqueue` pulls in `errors.ts` -> `observability.ts` -> the ESM-only
// `magic-observability/node`, which jest can't parse. Same mock
// `enqueue.test.ts` uses to keep that chain out of suites that don't test it.
jest.mock("../errors/errors", () => ({
  sendError: jest.fn(),
  sendEvent: jest.fn(),
  logDebug: () => undefined,
  errorDebug: () => undefined,
}));

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.user.deleteMany({ where: { email: "otp-test@pegada.app" } });
});

const seedCode = async () =>
  prisma.user.create({
    data: {
      email: "otp-test@pegada.app",
      code: "123456",
      codeExpiresAt: new Date(Date.now() + 60_000),
    },
  });

describe("AuthenticationService.checkVerification", () => {
  it("consumes a valid OTP after its first use", async () => {
    const user = await seedCode();

    await expect(
      AuthenticationService.checkVerification({
        email: user.email,
        code: "123456",
      }),
    ).resolves.toBe(true);

    await expect(
      AuthenticationService.checkVerification({
        email: user.email,
        code: "123456",
      }),
    ).rejects.toThrow("Invalid OTP code");

    await expect(
      prisma.user.findUnique({ where: { id: user.id } }),
    ).resolves.toMatchObject({ code: null, codeExpiresAt: null });
  });

  it("lets only one concurrent request consume each issued OTP", async () => {
    const user = await seedCode();
    for (let attempt = 0; attempt < 25; attempt += 1) {
      const code = attempt.toString().padStart(6, "0");
      // oxlint-disable-next-line no-await-in-loop -- Each code must be issued before its two consumption requests race.
      await prisma.user.update({
        where: { id: user.id },
        data: { code, codeExpiresAt: new Date(Date.now() + 60_000) },
      });
      const verify = () =>
        AuthenticationService.checkVerification({ email: user.email, code });

      // oxlint-disable-next-line no-await-in-loop -- Attempts are sequential so one code cannot interfere with the next.
      const results = await Promise.allSettled([verify(), verify()]);
      const statuses = results.map(({ status }) => status).sort();

      expect({ attempt, statuses }).toEqual({
        attempt,
        statuses: ["fulfilled", "rejected"],
      });
    }
  });
});

describe("AuthenticationService.generateCode", () => {
  it("returns a zero-padded six-digit code", () => {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      expect(AuthenticationService.generateCode()).toMatch(/^\d{6}$/);
    }
  });
});
