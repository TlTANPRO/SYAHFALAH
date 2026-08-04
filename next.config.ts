import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 'standalone' output requires a Node server, but Vercel deploys Next.js
  // as Lambda serverless functions — the 'standalone' build was failing
  // pnpm run build on Vercel. Default 'undefined' lets Vercel pick the
  // correct output mode per its build pipeline.
  async generateBuildId() {
    return 'build-' + Date.now();
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
};

export default nextConfig;
