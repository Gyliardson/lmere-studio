import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
] as const;

const adminImagePrivacyPolicy = {
  key: "Content-Security-Policy",
  value: "img-src 'self' data:;",
} as const;

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [...securityHeaders],
      },
      {
        source: "/admin/:path*",
        headers: [adminImagePrivacyPolicy],
      },
    ];
  },
};

export default nextConfig;
