import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  crossOrigin: "anonymous",
  reactStrictMode: true,
  allowedDevOrigins: ["192.168.1.103"],
};

export default nextConfig;
