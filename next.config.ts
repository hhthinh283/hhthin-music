import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/**/*": ["./public/downloads/**/*"],
  },
};

export default nextConfig;

