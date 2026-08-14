import test from "node:test";
import assert from "node:assert/strict";
import { businessDateOrdinal, businessDateParts, calendarLeadDays, normalizeBrazilianPhone } from "../src/lib/order-validation";

test("normalizes Brazilian phones with or without country code", () => {
  assert.equal(normalizeBrazilianPhone("(11) 99999-9999"), "11999999999");
  assert.equal(normalizeBrazilianPhone("+55 (11) 99999-9999"), "11999999999");
  assert.equal(normalizeBrazilianPhone("11 3333-4444"), "1133334444");
});

test("rejects malformed Brazilian phone shapes", () => {
  assert.equal(normalizeBrazilianPhone("123"), null);
  assert.equal(normalizeBrazilianPhone("00 99999-9999"), null);
  assert.equal(normalizeBrazilianPhone("+55 00 99999-9999"), null);
});

test("business date uses America/Sao_Paulo across the UTC rollover", () => {
  const instant = new Date("2026-08-14T02:30:00.000Z");
  assert.deepEqual(businessDateParts(instant), { year: 2026, month: 8, day: 13 });
  assert.equal(businessDateOrdinal(instant), Date.UTC(2026, 7, 13));
  assert.equal(calendarLeadDays("2026-08-16", instant), 3);
});

test("calendar lead-day validation rejects impossible dates", () => {
  assert.equal(calendarLeadDays("2026-02-30", new Date("2026-01-01T12:00:00.000Z")), null);
});
