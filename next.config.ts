import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
  // @react-pdf/renderer uses browser-only APIs — exclude from server bundle
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
