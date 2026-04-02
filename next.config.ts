import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable image optimization for Cloudflare Pages compatibility
  images: {
    unoptimized: true,
  },
  // Enable standalone output
  output: "standalone",
};

export default nextConfig;
