import { expect, test } from "@playwright/test";

const expectedHeaders = {
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
} as const;

for (const path of ["/ci-tenant-a", "/admin"]) {
  test(`${path} sends baseline security headers`, async ({ request }) => {
    const response = await request.get(path);
    expect(response.ok()).toBeTruthy();

    const headers = response.headers();
    for (const [name, value] of Object.entries(expectedHeaders)) {
      expect(headers[name]).toBe(value);
    }
  });
}
