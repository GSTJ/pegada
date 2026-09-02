/**
 * The fake door vocabulary lives in the shared analytics catalogue, because
 * that is what types every event these rows send. Re-exported here so the
 * component can name a feature or a surface without reaching past this module
 * into the catalogue for two unions.
 */
export type {
  FakeDoorFeature,
  FakeDoorSource,
} from "@pegada/shared/analytics/events";
