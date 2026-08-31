import { TRPCError } from "@trpc/server";

/**
 * Errors the product raises on purpose — a rejected login, a hit rate limit —
 * as opposed to a bug. The client branches on `error_code`, so every subclass
 * carries one, and every subclass sets `name`: `instanceof` does not survive
 * the tRPC serialization boundary, the name does.
 */
export class IntentionalError extends TRPCError {
  constructor(...args: ConstructorParameters<typeof TRPCError>) {
    super(...args);
    this.name = "IntentionalError";
  }
}

export class OTPRequiredError extends IntentionalError {
  static message = "OTP required";
  static error_code = "OTP_REQUIRED";
  error_code = OTPRequiredError.error_code;

  constructor() {
    super({
      code: "UNAUTHORIZED",
      message: OTPRequiredError.message,
    });

    this.name = "OTPRequiredError";
  }
}

export class InvalidOTPCodeError extends IntentionalError {
  static message = "Invalid OTP code";
  static error_code = "INVALID_OTP_CODE";
  error_code = InvalidOTPCodeError.error_code;

  constructor() {
    super({
      code: "UNAUTHORIZED",
      message: InvalidOTPCodeError.message,
    });

    this.name = "InvalidOTPCodeError";
  }
}

export class LikeLimitReachedError extends IntentionalError {
  likeLimitResetAt: Date;

  static message = "You have reached the like limit";
  static error_code = "LIKE_LIMIT_REACHED";
  error_code = LikeLimitReachedError.error_code;

  constructor({ likeLimitResetAt }: { likeLimitResetAt: Date }) {
    super({
      code: "TOO_MANY_REQUESTS",
      message: LikeLimitReachedError.message,
    });

    this.name = "LikeLimitReachedError";
    this.likeLimitResetAt = likeLimitResetAt;
  }
}

export class AccountBlockedError extends IntentionalError {
  static message = "This account is blocked.";
  static error_code = "ACCOUNT_BLOCKED";
  error_code = AccountBlockedError.error_code;

  constructor() {
    super({
      code: "FORBIDDEN",
      message: AccountBlockedError.message,
    });

    this.name = "AccountBlockedError";
  }
}

export class DogUnavailableError extends IntentionalError {
  static message = "This profile is unavailable.";
  static error_code = "DOG_UNAVAILABLE";
  error_code = DogUnavailableError.error_code;

  constructor() {
    super({
      code: "NOT_FOUND",
      message: DogUnavailableError.message,
    });

    this.name = "DogUnavailableError";
  }
}

export class UploadLimitReachedError extends IntentionalError {
  static message = "Too many photo uploads. Try again later.";
  static error_code = "UPLOAD_LIMIT_REACHED";
  error_code = UploadLimitReachedError.error_code;

  constructor() {
    super({
      code: "TOO_MANY_REQUESTS",
      message: UploadLimitReachedError.message,
    });

    this.name = "UploadLimitReachedError";
  }
}

export class InvalidUploadGrantError extends IntentionalError {
  static message = "This photo upload has expired. Try uploading it again.";
  static error_code = "INVALID_UPLOAD_GRANT";
  error_code = InvalidUploadGrantError.error_code;

  constructor() {
    super({
      code: "BAD_REQUEST",
      message: InvalidUploadGrantError.message,
    });

    this.name = "InvalidUploadGrantError";
  }
}
