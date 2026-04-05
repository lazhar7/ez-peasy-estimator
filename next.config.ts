import type { NextConfig } from "next";

const nextConfig: NextConfig = {
        reactStrictMode: true,
        typescript: { ignoreBuildErrors: true },
        eslint: { ignoreDuringBuilds: true },
        turbopack: {},
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
