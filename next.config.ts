import type { NextConfig } from "next";

const nextConfig: NextConfig = {
      reactStrictMode: true,
      typescript: { ignoreBuildErrors: true },
      eslint: { ignoreDuringBuilds: true },
      images: {
              remotePatterns: [
                  {
                              protocol: "https",
                              hostname: "photos.zillowstatic.com",
                  },
                      ],
      },
      webpack: (config, { isServer }) => {
              if (!isServer) {
                        config.resolve.fallback = {
                                    ...config.resolve.fallback,
                                    v8: false,
                                    util: false,
                                    fs: false,
                                    path: false,
                        };
              }
              return config;
      },
};

export default nextConfig;
