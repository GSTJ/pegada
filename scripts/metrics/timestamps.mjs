/**
 * Timestamps, shared by both readouts.
 *
 * The daily readout and the events audit both print ClickHouse timestamps, and
 * both have to survive the same two shapes: the string the query API returns
 * and the `Date` a replayed fixture carries. Parsing them in one place is what
 * stops the zone handling below from being fixed in one readout and left wrong
 * in the other.
 */

/** What a column with no timestamp in it prints, instead of `Invalid Date`. */
export const NO_TIMESTAMP = "-";

/** `2026-09-04 12:03 UTC`, the only stamp shape either readout prints. */
export function utcStamp(date) {
  return `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

/**
 * A ClickHouse timestamp as a `Date`, or null when there is nothing to read.
 *
 * ClickHouse writes `2026-09-02 06:45:00` with no zone, and `new Date` reads
 * that as local time. On a machine in Sao Paulo that silently moves every row
 * three hours, which is exactly the resolution the "did it arrive today"
 * question is asked at, so the zone is spelled out before parsing.
 */
export function parseTimestamp(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const text = String(value).trim().replace(" ", "T");
  const zoned = /(Z|[+-]\d{2}:?\d{2})$/.test(text) ? text : `${text}Z`;
  const date = new Date(zoned);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** The same value as a minute stamp, or a dash when it cannot be read. */
export function utcMoment(value) {
  const date = parseTimestamp(value);
  return date === null ? NO_TIMESTAMP : utcStamp(date);
}
