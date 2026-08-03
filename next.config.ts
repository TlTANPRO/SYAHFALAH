import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 'standalone' output requires a Node server, but Vercel deploys Next.js
  // as Lambda serverless functions — the 'standalone' build was failing
  // pnpm run build on Vercel. Default 'undefined' lets Vercel pick the
  // correct output mode per its build pipeline.
  async generateBuildId() {
    return 'build-' + Date.now();
  },
};

export default nextConfig;
