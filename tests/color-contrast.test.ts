import assert from "node:assert/strict";
import test from "node:test";

import { contrastRatio, meetsContrast, WCAG_AA_LARGE_TEXT, WCAG_AA_NORMAL_TEXT } from "../src/lib/color-contrast";
import { COLOR_PRESETS } from "../src/lib/types";

test("computes canonical black/white contrast", () => {
  assert.equal(contrastRatio("#000000", "#FFFFFF"), 21);
  assert.equal(meetsContrast("#000000", "#FFFFFF", WCAG_AA_NORMAL_TEXT), true);
});

test("enforces the AA normal-text boundary", () => {
  assert.equal(meetsContrast("#767676", "#FFFFFF", WCAG_AA_NORMAL_TEXT), true);
  assert.equal(meetsContrast("#777777", "#FFFFFF", WCAG_AA_NORMAL_TEXT), false);
});

test("keeps the general large-text threshold available without using it for small CTA text", () => {
  assert.equal(meetsContrast("#FFFFFF", "#8B5CF6", WCAG_AA_LARGE_TEXT), true);
  assert.equal(meetsContrast("#FFFFFF", "#F5B7D2", WCAG_AA_LARGE_TEXT), false);
});

test("all built-in button palettes meet AA for normal-size white CTA text", () => {
  for (const preset of COLOR_PRESETS) {
    assert.equal(
      meetsContrast("#FFFFFF", preset.buttonColor, WCAG_AA_NORMAL_TEXT),
      true,
      `${preset.name} button color must meet 4.5:1`,
    );
  }
});

test("rejects malformed colors instead of guessing", () => {
  assert.equal(contrastRatio("purple", "#FFFFFF"), null);
  assert.equal(meetsContrast("#FFFFFF", "#fff", WCAG_AA_NORMAL_TEXT), false);
});
