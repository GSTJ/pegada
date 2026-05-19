import prisma from "@pegada/database";
import { InvalidOTPCodeError, OTPRequiredError } from "@pegada/shared/errors/errors";
import { Language } from "@pegada/shared/i18n/types/types";

import { MAIL_QUEUE, MailQueue } from "../queue/MailQueue";
import { config, isMagicEmail } from "../shared/config";

/**
 * Compile `APPLE_MAGIC_EMAIL_REGEX` once at module load. Re-thrown invalid
 * regex surfaces immediately on boot rather than on first auth attempt.
 *
 * Only honored outside of production — see {@link isFreshMagicEmail}.
 */
const FRESH_MAGIC_EMAIL_REGEX = (() => {
  if (!config.APPLE_MAGIC_EMAIL_REGEX) return null;
  try {
    return new RegExp(config.APPLE_MAGIC_EMAIL_REGEX);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("❌ Invalid APPLE_MAGIC_EMAIL_REGEX", e);
    throw e;
  }
})();

/**
 * Test-only: an email that matches the configured regex is treated as a
 * disposable Maestro test account — accepts {@link config.APPLE_MAGIC_CODE}
 * AND is hard-deleted before each successful login so every E2E run starts
 * from a clean slate.
 *
 * Hard-gated on `NODE_ENV !== "production"` so prod traffic is never affected
 * even if the env var is accidentally set.
 */
const isFreshMagicEmail = (email: string): boolean => {
  if (config.NODE_ENV === "production") return false;
  if (!FRESH_MAGIC_EMAIL_REGEX) return false;
  return FRESH_MAGIC_EMAIL_REGEX.test(email);
};

/**
 * Hard-purge a user and all owned rows. Used to reset Maestro fresh-user
 * fixtures between runs. Order matters because no FK has `onDelete: Cascade`
 * configured on the User → Dog → {Image, Message, Match, Interest} chain.
 */
const purgeUserByEmail = async (email: string): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, dogs: { select: { id: true } } },
  });

  if (!user) return;

  const dogIds = user.dogs.map((d) => d.id);

  await prisma.$transaction([
    prisma.message.deleteMany({
      where: { OR: [{ senderId: { in: dogIds } }, { receiverId: { in: dogIds } }] },
    }),
    prisma.interest.deleteMany({
      where: { OR: [{ requesterId: { in: dogIds } }, { responderId: { in: dogIds } }] },
    }),
    prisma.match.deleteMany({
      where: { OR: [{ requesterId: { in: dogIds } }, { responderId: { in: dogIds } }] },
    }),
    prisma.image.deleteMany({ where: { dogId: { in: dogIds } } }),
    prisma.dog.deleteMany({ where: { userId: user.id } }),
    prisma.user.delete({ where: { id: user.id } }),
  ]);
};

export class AuthenticationService {
  language?: Language;

  constructor(props: { language?: Language }) {
    this.language = props.language;
  }

  async login({ email, code }: { email: string; code?: string }) {
    if (!code) {
      await this.sendVerification(email);
      throw new OTPRequiredError();
    }

    const isValid = await AuthenticationService.checkVerification({
      email,
      code,
    });

    if (!isValid) {
      throw new InvalidOTPCodeError();
    }

    // Maestro fresh-user fixture: purge any prior records so the user
    // always lands on CreateProfile after OTP. Skipped in production by
    // {@link isFreshMagicEmail}.
    if (isFreshMagicEmail(email)) {
      await purgeUserByEmail(email);
    }

    const user = await prisma.user.upsert({
      where: { email },
      update: { deletedAt: null },
      create: {
        email,
      },
    });

    return user;
  }

  // Generate a 6 digits number for OTP
  static generateCode() {
    // Generate a random number between 0 and 999999
    const num = Math.floor(Math.random() * 1000000);

    // Convert the number to a string and pad it with zeros if necessary
    return num.toString().padStart(6, "0");
  }

  async sendVerification(email: string) {
    // Magic emails bypass real OTP delivery. APPLE_MAGIC_EMAIL accepts a
    // comma-separated list (see config.ts) so destructive E2E flows can use
    // a dedicated disposable account without nuking the primary review user.
    if (isMagicEmail(email)) {
      return;
    }

    // Test-only magic regex bypass — no real email and no DB code rotation,
    // so the static `APPLE_MAGIC_CODE` keeps working across rapid Maestro runs.
    if (isFreshMagicEmail(email)) {
      return;
    }

    const code = AuthenticationService.generateCode();

    const oneHour = 60 * 60 * 1000;
    const expiresAt = new Date(Date.now() + oneHour);

    await prisma.user.upsert({
      where: { email },
      update: { code, codeExpiresAt: expiresAt },
      create: { email, code, codeExpiresAt: expiresAt },
    });

    await MailQueue.add(MAIL_QUEUE, { email, code, language: this.language });
  }

  static async checkVerification({ email, code }: { email: string; code: string }) {
    // Used for apple to review the app — any email in APPLE_MAGIC_EMAIL
    // (single value or comma-separated list) accepts APPLE_MAGIC_CODE.
    if (config.APPLE_MAGIC_CODE && code === config.APPLE_MAGIC_CODE && isMagicEmail(email)) {
      return true;
    }

    // Test-only fresh-user bypass — same code, no DB lookup, so login is
    // idempotent regardless of whether the user existed before.
    if (config.APPLE_MAGIC_CODE && code === config.APPLE_MAGIC_CODE && isFreshMagicEmail(email)) {
      return true;
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) throw new Error("User not found");

    if (user.code !== code || !user.codeExpiresAt) {
      throw new InvalidOTPCodeError();
    }

    if (user.codeExpiresAt < new Date()) throw new Error("Code expired");

    return true;
  }
}
