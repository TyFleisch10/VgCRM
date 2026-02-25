/** @type {import('next').NextConfig} */
const nextConfig = {
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
};

module.exports = nextConfig;
