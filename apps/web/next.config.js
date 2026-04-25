const { PrismaPlugin } = require("@prisma/nextjs-monorepo-workaround-plugin");
const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  outputFileTracingRoot: path.join(__dirname, "../../"),
  transpilePackages: ["@watersys/db", "@watersys/shared"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "*.dropbox.com" },
      { protocol: "https", hostname: "*.dropboxusercontent.com" },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "prisma"],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.plugins = [...config.plugins, new PrismaPlugin()];
    }
    config.resolve.fallback = { ...config.resolve.fallback, vertx: false };
    return config;
  },
};

module.exports = nextConfig;
