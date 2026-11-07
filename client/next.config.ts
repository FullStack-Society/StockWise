import type { NextConfig } from "next";

const tunnelHost = process.env.DEV_TUNNEL_HOST?.trim();
const developmentTunnelOrigins =
  process.env.NODE_ENV === "development" && tunnelHost ? [tunnelHost] : [];

const nextConfig: NextConfig = {
  experimental: {
    agentFeedback: true,
    serverActions: {
      allowedOrigins: ["localhost:3000", ...developmentTunnelOrigins],
    },
  },

  allowedDevOrigins: developmentTunnelOrigins,

  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;
