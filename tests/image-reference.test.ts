import test from "node:test";
import assert from "node:assert/strict";
import {
  IMAGE_REFERENCE_LIMITS,
  validateImageFileMetadata,
  validateImageReference,
} from "../src/lib/image-reference";

function dataUrl(bytes: number, mime = "image/png") {
  const payload = Buffer.alloc(bytes, 0x41).toString("base64");
  return `data:${mime};base64,${payload}`;
}

test("image file metadata accepts only supported types within the binary limit", () => {
  assert.equal(validateImageFileMetadata({ type: "image/png", size: IMAGE_REFERENCE_LIMITS.maxBytes }).ok, true);

  const wrongType = validateImageFileMetadata({ type: "image/gif", size: 10 });
  assert.equal(wrongType.ok, false);
  if (!wrongType.ok) assert.equal(wrongType.code, "IMAGE_TYPE_UNSUPPORTED");

  const oversized = validateImageFileMetadata({ type: "image/webp", size: IMAGE_REFERENCE_LIMITS.maxBytes + 1 });
  assert.equal(oversized.ok, false);
  if (!oversized.ok) assert.equal(oversized.code, "IMAGE_TOO_LARGE");
});

test("image references accept empty values and bounded PNG/JPEG/WEBP data URLs", () => {
  assert.deepEqual(validateImageReference(""), { ok: true, value: "", kind: "empty" });
  assert.equal(validateImageReference(dataUrl(32, "image/png")).ok, true);
  assert.equal(validateImageReference(dataUrl(32, "image/jpeg")).ok, true);
  assert.equal(validateImageReference(dataUrl(32, "image/webp")).ok, true);
  assert.equal(validateImageReference(dataUrl(IMAGE_REFERENCE_LIMITS.maxBytes)).ok, true);
});

test("image references reject malformed or oversized embedded data", () => {
  const unsupported = validateImageReference("data:image/gif;base64,R0lGODlhAQABAIAAAAUEBA==");
  assert.equal(unsupported.ok, false);
  if (!unsupported.ok) assert.equal(unsupported.code, "IMAGE_DATA_INVALID");

  const malformed = validateImageReference("data:image/png;base64,not base64!");
  assert.equal(malformed.ok, false);
  if (!malformed.ok) assert.equal(malformed.code, "IMAGE_DATA_INVALID");

  const oversized = validateImageReference(dataUrl(IMAGE_REFERENCE_LIMITS.maxBytes + 1));
  assert.equal(oversized.ok, false);
  if (!oversized.ok) assert.equal(oversized.code, "IMAGE_TOO_LARGE");
});

test("image references accept bounded HTTPS URLs without embedded credentials", () => {
  const valid = validateImageReference(" https://cdn.example.com/cake.webp?size=large ");
  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.equal(valid.kind, "url");
    assert.equal(valid.value, "https://cdn.example.com/cake.webp?size=large");
  }

  for (const value of [
    "http://example.com/cake.png",
    "javascript:alert(1)",
    "https://user:secret@example.com/cake.png",
    "not-a-url",
  ]) {
    assert.equal(validateImageReference(value).ok, false, value);
  }
});

test("image references reject URLs above the persistence bound", () => {
  const oversized = `https://example.com/${"a".repeat(IMAGE_REFERENCE_LIMITS.maxUrlChars)}`;
  const result = validateImageReference(oversized);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "IMAGE_URL_TOO_LONG");
});
