import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  async generateBuildId() {
    return 'build-' + Date.now();
  },
};

export default nextConfig;
