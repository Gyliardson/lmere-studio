import assert from "node:assert/strict";
import test from "node:test";

import { addCalendarDays, getBusinessDateString, getBusinessQuickDate } from "../src/lib/business-calendar";

test("resolves the Sao Paulo business date across UTC rollover", () => {
  const instant = new Date("2026-08-15T02:30:00.000Z");
  assert.equal(getBusinessDateString(instant), "2026-08-14");
  assert.equal(getBusinessQuickDate(0, instant), "2026-08-14");
  assert.equal(getBusinessQuickDate(1, instant), "2026-08-15");
});

test("adds calendar days without local-runtime timezone drift", () => {
  assert.equal(addCalendarDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addCalendarDays("2026-03-01", -1), "2026-02-28");
});
