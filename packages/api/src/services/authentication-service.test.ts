import prisma from "@pegada/database";

import { AuthenticationService } from "./authentication-service";

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

  it("lets only one concurrent request consume an OTP", async () => {
    const user = await seedCode();
    const verify = () =>
      AuthenticationService.checkVerification({
        email: user.email,
        code: "123456",
      });

    const results = await Promise.allSettled([verify(), verify()]);

    expect(results.filter(({ status }) => status === "fulfilled")).toHaveLength(
      1,
    );
    expect(results.filter(({ status }) => status === "rejected")).toHaveLength(
      1,
    );
  });
});

describe("AuthenticationService.generateCode", () => {
  it("returns a zero-padded six-digit code", () => {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      expect(AuthenticationService.generateCode()).toMatch(/^\d{6}$/);
    }
  });
});
