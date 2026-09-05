/**
 * Which over the air update a device is actually running.
 *
 * `$app_version` comes from the binary, so every device that installed 1.6.2
 * from the store reports 1.6.2 forever, whether it is running the JavaScript
 * that shipped inside that binary or an `eas update` published months later.
 * That makes "did the fix reach anyone?" unanswerable. These properties answer
 * it: `ota_update_id` names the exact bundle, `ota_is_embedded` separates a
 * device still on the shipped bundle from one that has downloaded an update,
 * and `runtime_version` is the compatibility line an update was published
 * against.
 *
 * Registered as super properties, so they ride along on every event rather
 * than on the handful of call sites someone remembered to annotate.
 */

/**
 * The shape read off `expo-updates`.
 *
 * Every field is optional even though the module's own types promise
 * `string | null`: in a development client the constants are backed by a
 * disabled native module and come back `undefined`, and Expo Go has no
 * updates module at all. Typing the source honestly is what keeps the guards
 * below from being dead code.
 */
export type OtaUpdateSource = {
  updateId?: string | null;
  isEmbeddedLaunch?: boolean | null;
  runtimeVersion?: string | null;
  channel?: string | null;
  createdAt?: Date | string | null;
};

export type OtaUpdateProperties = {
  ota_update_id: string | null;
  ota_is_embedded: boolean | null;
  runtime_version: string | null;
  ota_channel: string | null;
  ota_created_at: string | null;
};

/** `undefined` and empty strings both mean "nothing to report", not a value. */
const text = (value: string | null | undefined) =>
  typeof value === "string" && value.length > 0 ? value : null;

/**
 * PostHog stores whatever it is given, so a `Date` would land as an object on
 * some transports and a locale string on others. ISO 8601 sorts and filters.
 */
const timestamp = (value: Date | string | null | undefined) => {
  if (typeof value === "string") return text(value);
  if (!(value instanceof Date)) return null;

  const time = value.getTime();
  return Number.isNaN(time) ? null : value.toISOString();
};

/**
 * `null` rather than `false` when the module is not reporting, because
 * "running the embedded bundle" and "we cannot tell" are different answers and
 * the readout counts them separately.
 */
export const buildOtaUpdateProperties = (
  source: OtaUpdateSource,
): OtaUpdateProperties => ({
  ota_update_id: text(source.updateId),
  ota_is_embedded:
    typeof source.isEmbeddedLaunch === "boolean"
      ? source.isEmbeddedLaunch
      : null,
  runtime_version: text(source.runtimeVersion),
  ota_channel: text(source.channel),
  ota_created_at: timestamp(source.createdAt),
});
