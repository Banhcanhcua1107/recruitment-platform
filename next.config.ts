import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const isDockerDev = process.env.DOCKER_DEV === "true";
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  output: "standalone",
  watchOptions: isDockerDev
    ? {
        pollIntervalMs: 1000,
      }
    : undefined,
  webpack: (config, { dev }) => {
    if (dev && isDockerDev) {
      config.watchOptions = {
        ...(config.watchOptions ?? {}),
        aggregateTimeout: 300,
        ignored: [
          "**/.git/**",
          "**/.next/**",
          "**/node_modules/**",
        ],
        poll: 1000,
      };
    }

    return config;
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "careerviet.vn",
      },
      {
        protocol: "https",
        hostname: "images.careerviet.vn",
      },
      {
        protocol: "https",
        hostname: "placehold.co",
      },
      {
        protocol: "https",
        hostname: "via.placeholder.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "www.svgrepo.com",
      },
    ],
  },
};

export default withBundleAnalyzer(nextConfig);
