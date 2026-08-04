import type { NextConfig } from "next";

// Security headers applied to every response. Keep in sync with SECURITY.md.
const securityHeaders = [
  // Prevent MIME-sniffing the response into a different type
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Don't allow the dashboard to be embedded in an iframe (clickjacking)
  { key: "X-Frame-Options", value: "DENY" },
  // Honor strict-transport-security when served over HTTPS
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Don't leak the Referer to other origins
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Restrict which browser features can run
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  // Content-Security-Policy — explicit allowlist. The dashboard loads
  // only its own assets, the Supabase Realtime WebSocket, and inline
  // styles (Tailwind v4 emits them via @theme). No third-party scripts.
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js dev mode + Tailwind inline
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",                  // Tailwind v4 inline
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://fonts.gstatic.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // 'standalone' output requires a Node server, but Vercel deploys Next.js
  // as Lambda serverless functions — the 'standalone' build was failing
  // pnpm run build on Vercel. Default 'undefined' lets Vercel pick the
  // correct output mode per its build pipeline.
  async generateBuildId() {
    return "build-" + Date.now();
  },
  // The eslint-config-next bundled in this project (15.2.x) ships a
  // deprecated ESLint plugin patcher that fails against ESLint 9
  // ("Failed to patch ESLint because the calling module was not
  // recognized"). Skip the in-build lint pass — type-checking via
  // `tsc --noEmit` already runs in CI/locally, and lint can be
  // re-enabled once eslint-config-next catches up to ESLint 9.
  eslint: {
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
