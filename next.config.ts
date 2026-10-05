import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.PRICE_FEED_CMS_DIST_DIR ?? ".next",
};

export default nextConfig;
