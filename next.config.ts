import type { NextConfig } from "next";

const isDockerDev = process.env.DOCKER_DEV === "true";

const nextConfig: NextConfig = {
  transpilePackages: ["pdfjs-dist", "react-pdf"],
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

export default nextConfig;
