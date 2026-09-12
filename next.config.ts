import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Every dish photo is a pinned Unsplash id — see src/lib/seed/images.ts.
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [400, 640, 768, 1024, 1280, 1600, 1920, 2560],
  },
};

export default nextConfig;
