import prisma from "@pegada/database";
import { InvalidOTPCodeError, OTPRequiredError } from "@pegada/shared/errors/errors";
import { Language } from "@pegada/shared/i18n/types/types";

import { MAIL_QUEUE, MailQueue } from "../queue/MailQueue";
import { config, isMagicEmail } from "../shared/config";

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
