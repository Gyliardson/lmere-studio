import assert from "node:assert/strict";
import test from "node:test";

import { contrastRatio, meetsContrast, WCAG_AA_LARGE_TEXT, WCAG_AA_NORMAL_TEXT } from "../src/lib/color-contrast";

test("computes canonical black/white contrast", () => {
  assert.equal(contrastRatio("#000000", "#FFFFFF"), 21);
  assert.equal(meetsContrast("#000000", "#FFFFFF", WCAG_AA_NORMAL_TEXT), true);
});

test("enforces the AA normal-text boundary", () => {
  assert.equal(meetsContrast("#767676", "#FFFFFF", WCAG_AA_NORMAL_TEXT), true);
  assert.equal(meetsContrast("#777777", "#FFFFFF", WCAG_AA_NORMAL_TEXT), false);
});

test("supports the AA large-text threshold used for prominent CTA text", () => {
  assert.equal(meetsContrast("#FFFFFF", "#8B5CF6", WCAG_AA_LARGE_TEXT), true);
  assert.equal(meetsContrast("#FFFFFF", "#F5B7D2", WCAG_AA_LARGE_TEXT), false);
});

test("rejects malformed colors instead of guessing", () => {
  assert.equal(contrastRatio("purple", "#FFFFFF"), null);
  assert.equal(meetsContrast("#FFFFFF", "#fff", WCAG_AA_NORMAL_TEXT), false);
});
