import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // App will be served under /crm via reverse proxy or basePath
  // Uncomment below if deploying as standalone under /crm path
  // basePath: '/crm',
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "photos.zillowstatic.com",
      },
    ],
  },
};

export default nextConfig;
