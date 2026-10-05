import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  NO_TIMESTAMP,
  parseTimestamp,
  utcMoment,
  utcStamp,
} from "./timestamps.mjs";

describe("parseTimestamp", () => {
  it("reads a bare ClickHouse stamp as UTC, whatever the machine zone is", () => {
    const date = parseTimestamp("2026-09-02 06:45:00");
    assert.equal(date?.toISOString(), "2026-09-02T06:45:00.000Z");
  });

  it("keeps an explicit zone instead of forcing UTC", () => {
    const date = parseTimestamp("2026-09-02 06:45:00+02:00");
    assert.equal(date?.toISOString(), "2026-09-02T04:45:00.000Z");
  });

  it("passes a Date through, and reads an invalid one as nothing", () => {
    const date = parseTimestamp(new Date("2026-01-01T00:00:00.000Z"));
    assert.equal(date?.toISOString(), "2026-01-01T00:00:00.000Z");
    assert.equal(parseTimestamp(new Date("oops")), null);
  });

  it("reads empty inputs as nothing", () => {
    assert.equal(parseTimestamp(null), null);
    assert.equal(parseTimestamp(undefined), null);
    assert.equal(parseTimestamp(""), null);
    assert.equal(parseTimestamp("not a date"), null);
  });
});

describe("utcStamp and utcMoment", () => {
  it("prints the only stamp shape either readout uses", () => {
    assert.equal(
      utcStamp(new Date("2026-09-04T12:03:00.000Z")),
      "2026-09-04 12:03 UTC",
    );
  });

  it("prints a dash instead of Invalid Date when there is nothing to read", () => {
    assert.equal(utcMoment(null), "-");
    assert.equal(utcMoment(""), "-");
    assert.equal(NO_TIMESTAMP, "-");
  });

  it("prints a bare stamp through the shared path", () => {
    assert.equal(utcMoment("2026-09-02 06:45:00"), "2026-09-02 06:45 UTC");
  });
});
