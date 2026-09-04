/**
 * Expo's code for a push token that no longer belongs to an install.
 *
 * It is the end of that token's life: the app was uninstalled, or the OS
 * handed the device a new registration. One definition rather than one per
 * call site, because the pruner in the queue handler and the cadence gate in
 * `reengagement-cadence` have to agree on the spelling, or a token gets muted
 * in one place and kept alive in the other.
 */
export const DEAD_TOKEN_ERROR = "DeviceNotRegistered";

/** A ticket or a receipt, in the fields both of them answer with. */
export type ExpoDeliveryResult = {
  details?: { error?: string } | null;
  message?: string | null;
  status: string;
};

/**
 * Has Expo said this token is gone?
 *
 * `details.error` is the documented field on both tickets and receipts and the
 * one to trust. The message is read as well because a failure that never got
 * classified still names the reason in prose, and a token left alive on that
 * technicality goes on producing the same rejection every evening.
 */
export const isDeadTokenError = (result: ExpoDeliveryResult) =>
  result.details?.error === DEAD_TOKEN_ERROR ||
  (result.message?.includes(DEAD_TOKEN_ERROR) ?? false);
