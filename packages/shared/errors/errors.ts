import { TRPCError } from "@trpc/server";

export class IntentionalError extends TRPCError {}

export class OTPRequiredError extends IntentionalError {
  static message: string = "OTP required";
  static error_code: string = "OTP_REQUIRED";
  error_code = OTPRequiredError.error_code;

  constructor() {
    super({
      code: "UNAUTHORIZED",
      message: OTPRequiredError.message
    });
  }
}

export class InvalidOTPCodeError extends IntentionalError {
  static message: string = "Invalid OTP code";
  static error_code: string = "INVALID_OTP_CODE";
  error_code = InvalidOTPCodeError.error_code;

  constructor() {
    super({
      code: "UNAUTHORIZED",
      message: InvalidOTPCodeError.message
    });
  }
}

export class LikeLimitReached extends IntentionalError {
  likeLimitResetAt: Date;

  static message: string = "You have reached the like limit";
  static error_code: string = "LIKE_LIMIT_REACHED";
  error_code = LikeLimitReached.error_code;

  constructor({ likeLimitResetAt }: { likeLimitResetAt: Date }) {
    super({
      code: "TOO_MANY_REQUESTS",
      message: LikeLimitReached.message
    });

    this.likeLimitResetAt = likeLimitResetAt;
  }
}
